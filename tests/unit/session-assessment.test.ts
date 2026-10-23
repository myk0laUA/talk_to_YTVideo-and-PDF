import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { Admission, proofLimits, issuanceLimits } from "../../src/server/proof/admission.ts";
import * as policy from "../../src/server/session-policy.ts";
import { VoiceRegistry } from "../../src/server/voice/registry.ts";
import { createVoiceHandlers } from "../../src/server/voice/handlers.ts";
import { TextRegistry } from "../../src/server/text/registry.ts";
import { createTextHandlers } from "../../src/server/text/handlers.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { uploadedRecord } from "../../src/server/sources/service.ts";
import { pdfFixture } from "../context/fixtures.ts";
import { scriptedFullSource } from "../../scripts/lib/full-source-scripted.ts";
import { parseAdmissionRejection } from "../../src/shared/session-admission.ts";
import { VoiceRecovery } from "../../src/shared/voice-recovery.ts";

const config = { origin: "http://assessment.invalid", cookieSecret: "ac".repeat(32), secure: false, apiKey: "sk-synthetic-only" };
test("12D all assessment lanes: exact visitor/aggregate boundary, timed recovery, concurrency and lifetime", () => {
  for (const [name, limits] of Object.entries(policy)) {
    if (typeof limits === "number") continue;
    const a = new Admission(limits), at = 10_000_000;
    for (let i = 0; i < limits.visitor; i++) { const r=a.attempt("one","shared",at); assert.ok("release" in r,name); r.release(); }
    assert.deepEqual(a.attempt("one","shared",at),{rejection:{reason:"window",retryAfterSeconds:3600}});
    assert.deepEqual(a.attempt("one","shared",at+3599_001),{rejection:{reason:"window",retryAfterSeconds:1}});
    const reset=a.attempt("one","shared",at+3600_000);assert.ok("release" in reset);reset.release();
    const aggregate=new Admission(limits);
    for(let i=0;i<limits.global;i++){const r=aggregate.attempt(`owner-${i}`,"unverified-network",at);assert.ok("release" in r);r.release();}
    assert.equal((aggregate.attempt("next","unverified-network",at) as {rejection:{reason:string}}).rejection.reason,"window");
    const busy=new Admission(limits), held=busy.attempt("one","shared",at);assert.ok("release" in held);
    assert.deepEqual(busy.attempt("one","shared",at),{rejection:{reason:"busy"}});held.release();
    const lifetime=new Admission({...limits,lifetime:1});const first=lifetime.attempt("a","s",at);assert.ok("release" in first);first.release();
    assert.deepEqual(lifetime.attempt("b","s",at+3600_000),{rejection:{reason:"capacity"}});
  }
  assert.equal(proofLimits.visitor,6);assert.equal(issuanceLimits.visitor,3);
});

test("12D actual handlers: four reviewers each complete 30 voice mint/cancel and text ACK/stop cycles; exact 60-start limit", async () => {
  let at=Math.floor(Date.now()/1000)*1000, mints=0, connects=0;
  const now=()=>at;
  const visitors=Array.from({length:5},()=>createVisitor(config,at));
  const rows=visitors.map(v=>uploadedRecord(pdfFixture,v));
  const repository={get:async(id:string,owner:string)=>rows.find(r=>r.id===id&&r.ownerSessionHash===owner)??null};
  const voice=new VoiceRegistry({repository,now,mint:async()=>{mints++;return {clientSecret:"ek_synthetic",expiresAt:Math.floor(at/1000)+60};}});
  const text=new TextRegistry({repository,now,connect:async()=>{connects++;const transport=scriptedFullSource("PDF","success",undefined,"gpt-realtime-2.1");return {transport,close:()=>transport.close()};}});
  const vh=createVoiceHandlers({config:()=>config,registry:voice,now}),th=createTextHandlers({config:()=>config,registry:text,now});
  const request=(i:number,data:object)=>new Request(config.origin,{method:"POST",headers:{origin:config.origin,"content-type":"application/json",cookie:visitorCookie(visitors[i],config,at).split(";",1)[0]},body:JSON.stringify(data)});
  async function voiceCycle(i:number){const input={sourceId:rows[i].id,requestId:randomUUID()};const p=await vh.prepare(request(i,input));assert.equal(p.status,201);const dto=await p.json();const mint=await vh.credential(request(i,{...input,preparationId:dto.preparationId}));assert.equal(mint.status,200);assert.equal((await vh.cancel(request(i,input))).status,200);return input;}
  async function textCycle(i:number){const input={sourceId:rows[i].id,requestId:randomUUID()};const start=await th.start(request(i,input));assert.equal(start.status,201);const {sessionId}=await start.json();
    const stream=await th.stream(new Request(config.origin,{headers:{cookie:visitorCookie(visitors[i],config,at).split(";",1)[0]}}),sessionId);assert.equal(stream.status,200);
    const reader=stream.body!.getReader();let ready=false;
    for(let n=0;n<12&&!ready;n++){const r=await reader.read();assert.equal(r.done,false);ready=new TextDecoder().decode(r.value).split("\n").filter(Boolean).some(line=>JSON.parse(line).status.phase==="ready");}
    assert.ok(ready,"actual lifecycle acknowledges source before stop");assert.equal((await th.stop(request(i,{requestId:input.requestId}))).status,200);await reader.cancel();return input;}
  try {
    await voiceCycle(4);await textCycle(4); // Establish process windows before these reviewers arrive.
    at+=1000;
    for(let i=0;i<4;i++){visitors[i]=createVisitor(config,at);rows[i]=uploadedRecord(pdfFixture,visitors[i]);}
    for(let i=0;i<4;i++)for(let n=0;n<30;n++){await voiceCycle(i);await textCycle(i);}
    assert.equal(mints,121);assert.equal(connects,121);
    for(let n=30;n<60;n++){await voiceCycle(0);await textCycle(0);}
    const input={sourceId:rows[0].id,requestId:randomUUID()},p=await vh.prepare(request(0,input));assert.equal(p.status,201);
    const denied=await vh.credential(request(0,{...input,preparationId:(await p.json()).preparationId}));assert.equal(denied.status,429);assert.equal(denied.headers.get("retry-after"),"3599");assert.equal((await denied.json()).reason,"window");
    assert.equal((await th.start(request(0,{...input,requestId:randomUUID()}))).status,429);
    assert.equal(voice.resources.entries,0);assert.equal(text.size,0);
    const oldRequest={sourceId:rows[1].id,requestId:randomUUID()};const ticket=await vh.prepare(request(1,oldRequest));assert.equal(ticket.status,201);
    assert.equal((await vh.prepare(request(1,{...oldRequest,requestId:randomUUID()}))).status,409);
    await vh.cancel(request(1,oldRequest));assert.equal((await vh.prepare(request(1,oldRequest))).status,409);
    // These visitors arrived after the process window began; their original cookies are still live.
    at+=3599_000;
    await voiceCycle(0);await textCycle(0);
    assert.equal((await vh.prepare(request(1,oldRequest))).status,409);
  }finally{voice.dispose();text.dispose();}
});

test("12D cooldown validation and owner-memory require explicit retry; no invented reset",()=>{
  for(const header of [null,"bad","-1","0","3601","1.5","Wed, 21 Oct 2026 00:00:00 GMT"])assert.deepEqual(parseAdmissionRejection({code:"session_admission",reason:"window"},header),{reason:"window"});
  assert.deepEqual(parseAdmissionRejection({code:"session_admission",reason:"busy"},"12"),{reason:"busy"});
  assert.equal(parseAdmissionRejection({reason:"window"},"10"),undefined);
  let at=100;const memory=new VoiceRecovery(()=>at);memory.remember({reason:"window",retryAfterSeconds:2});assert.equal(memory.clearForRetry(),false);at+=1999;assert.equal(memory.seconds,1);at++;assert.equal(memory.seconds,0);assert.ok(memory.rejection);assert.ok(memory.clearForRetry());assert.equal(memory.rejection,undefined);
});

test("12D default preparation boundary is 120; capacity does not send Retry-After", async()=>{
  const at=Date.now(), visitor=createVisitor(config,at), row=uploadedRecord(pdfFixture,visitor);
  const make=(replayEntries?:number)=>new VoiceRegistry({now:()=>at,repository:{get:async()=>row},mint:async()=>{throw new Error("mint not expected");},...(replayEntries===undefined?{}:{limits:{replayEntries}})});
  const r=make(),capacity=make(0);
  const request=(requestId:string)=>new Request(config.origin,{method:"POST",headers:{origin:config.origin,"content-type":"application/json",cookie:visitorCookie(visitor,config,at).split(";",1)[0]},body:JSON.stringify({sourceId:row.id,requestId})});
  const h=createVoiceHandlers({config:()=>config,registry:r,now:()=>at});
  try{
    for(let n=0;n<120;n++){const id=randomUUID();assert.equal((await h.prepare(request(id))).status,201);assert.equal((await h.cancel(request(id))).status,200);}
    const denied=await h.prepare(request(randomUUID()));assert.equal(denied.status,429);assert.equal(denied.headers.get("retry-after"),"3600");assert.equal((await denied.json()).reason,"window");
    const full=await createVoiceHandlers({config:()=>config,registry:capacity,now:()=>at}).prepare(request(randomUUID()));assert.equal(full.status,429);assert.equal(full.headers.get("retry-after"),null);assert.equal((await full.json()).reason,"capacity");
  }finally{r.dispose();capacity.dispose();}
});
