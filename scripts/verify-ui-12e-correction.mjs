// F05: actual UI and geometry, isolated deterministic adapters; no application fixture route.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium, expect} from '@playwright/test';

const stage=process.argv[2]??'after';
assert(['before','after','before-settled','after-settled'].includes(stage));
const base='artifacts/local/12e-correction';
const dir=path.resolve(`${base}/${stage}`);
await fs.mkdir(dir); // Refuse to overwrite an earlier evidence batch.
const {webpack}=createRequire(import.meta.url)('next/dist/compiled/webpack/webpack');
const compiler=webpack({mode:'development',devtool:false,target:'web',entry:path.resolve('tests/ui-12e/harness.tsx'),output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.resolve('src')}},plugins:[new webpack.NormalModuleReplacementPlugin(/\.\/text-http-controller$/,path.resolve('tests/ui-correction/text.ts')),new webpack.NormalModuleReplacementPlugin(/\.\/voice-browser-adapters$/,path.resolve('tests/ui-correction/voice.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/transcript-view/loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((e,s)=>{compiler.close(()=>{});if(e||s.hasErrors())reject(e??new Error(s.toString()));else resolve();}));
const inputs=await fs.readFile('artifacts/local/10c/inputs.json','utf8'),fixture=JSON.parse(inputs)[0];
const source={id:fixture.id,kind:'PDF',title:'Alder station — operations notes',pageCount:fixture.variant.source.sections.length,expiresAt:'2027-01-01T00:00:00Z',warnings:[],sections:fixture.variant.source.sections};
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>12E F05 isolated verification</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="inputs" type="application/json">${inputs.replaceAll('<','\\u003c')}</script><script src="/fixture.js"></script></body></html>`;
const cssOrigin=stage==='before-settled'?`${base}/prior-files/globals.css`:'src/app/globals.css';
const css=await fs.readFile(cssOrigin),bundle=await fs.readFile(path.join(dir,'fixture.js'));
await fs.writeFile(path.join(dir,'style.css'),css);
const server=createServer((req,res)=>{const file={'/':['text/html',html],'/style.css':['text/css',css],'/fixture.js':['text/javascript',bundle]}[new URL(req.url,'http://localhost').pathname];res.writeHead(file?200:404,{'content-type':file?.[0]??'text/plain'});res.end(file?.[1]??'not found');});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3152,'127.0.0.1',resolve);});
const browser=await chromium.launch(),results=[];

// Measure glyph/element bounds, not only visibility. Detect short status scrollers,
// clipping by any ancestor, overlapping actions/headings, and unreachable actions.
async function statusGeometry(page){
 return page.locator('.text-start .text-session-status').evaluate(status=>{
  const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
  const range=document.createRange();range.selectNodeContents(status);
  const text=[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}));
  const button=status.parentElement.querySelector('.text-session-actions button:not([hidden])');
  const heading=status.parentElement.querySelector('h3');
  const rect=box(status),action=box(button),title=box(heading),issues=[];
  if(status.scrollHeight>status.clientHeight+1)issues.push('status content exceeds available height');
  if(status.scrollWidth>status.clientWidth+1)issues.push('status content exceeds available width');
  const ancestors=[];
  for(let node=status;node&&node!==document.documentElement;node=node.parentElement){
   const s=getComputedStyle(node),r=box(node),clipY=['auto','scroll','hidden','clip'].includes(s.overflowY),clipX=['auto','scroll','hidden','clip'].includes(s.overflowX);
   const bounds={top:r.top+node.clientTop,bottom:r.top+node.clientTop+node.clientHeight,left:r.left+node.clientLeft,right:r.left+node.clientLeft+node.clientWidth};
   if(clipY||clipX){
    const clipped=text.some(t=>(clipY&&(t.top<bounds.top-1||t.bottom>bounds.bottom+1))||(clipX&&(t.left<bounds.left-1||t.right>bounds.right+1)));
    ancestors.push({element:node.className,clipY,clipX,bounds,clipped});
    if(clipped)issues.push(`text clipped by ${node.className}`);
   }
   if(s.clipPath!=='none'||s.textOverflow==='ellipsis'||parseInt(s.webkitLineClamp)>0)issues.push('status has text clipping style');
  }
  if(text.some(t=>t.bottom>action.top-1))issues.push('text overlaps action');
  if(text.some(t=>t.top<title.bottom-1))issues.push('text overlaps heading');
  return {content:status.textContent,clientHeight:status.clientHeight,scrollHeight:status.scrollHeight,overflowY:getComputedStyle(status).overflowY,maxHeight:getComputedStyle(status).maxHeight,rect,action,title,text,ancestors,issues};
 });
}

try{
 for(const theme of ['light','dark'])for(const size of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:320,height:600,reflow:true}]){
  const context=await browser.newContext({colorScheme:theme,reducedMotion:'reduce',viewport:{width:size.width,height:size.height}}),page=await context.newPage();
  const entry={theme,...size,states:[],errors:[],external:[]};results.push(entry);
  page.on('pageerror',e=>entry.errors.push(e.message));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://127.0.0.1:3152'){entry.external.push(u.origin);return route.abort();}if(u.pathname.startsWith('/api/'))return route.fulfill({status:route.request().method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify({ok:true,source})});return route.continue();});
  await page.addInitScript(()=>{window.__nativeCalls=0;for(const name of ['WebSocket','RTCPeerConnection','Audio'])Object.defineProperty(window,name,{value:class{constructor(){window.__nativeCalls++;throw new Error('Native transport/media forbidden');}}});Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia(){window.__nativeCalls++;throw new Error('Microphone forbidden');}}});});
  const suffix=`${theme}-${size.width}${size.reflow?'-200':''}`;
  const capture=async name=>{await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(dir,`${name}-${suffix}.png`),fullPage:Boolean(size.reflow)});};
  await page.goto('http://127.0.0.1:3152/?noYoutube');
  if(size.reflow)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.locator('input[type=file]').setInputFiles({name:'Alder station.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic acquisition')});
  await expect(page.locator('#source-heading')).toBeFocused();
  const start=page.getByRole('button',{name:'Start chat',exact:true});await expect(start).toBeEnabled();
  assert.equal(await page.evaluate(()=>window.fixture.audit().textStarts),0);
  await expect(page.locator('textarea[name=question]')).toBeHidden();
  if(!size.reflow){const r=await start.boundingBox();assert(r.height>=52&&r.y+r.height<=size.height);assert(Math.abs(r.x+r.width/2-size.width/2)<12);await capture('idle');}
  await start.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Stop text session',exact:true})).toBeVisible();
  await expect(page.locator('.text-start .text-session-status')).toHaveText('Loading your source into the conversation. Wait before sending a question.');
  assert.equal(await page.evaluate(()=>window.fixture.audit().textStarts),1);
  for(const state of ['pending','failed']){
   if(state==='failed'){await page.evaluate(()=>window.fixture.fail());await expect(start).toBeEnabled();await expect(page.locator('.text-start .text-session-status')).toHaveText('The text connection failed or closed. Select Start chat to try again, or choose Voice mode.');}
   await page.evaluate(()=>scrollTo(0,0));
   const measure=await statusGeometry(page);
   if(!size.reflow&&(measure.action.bottom>size.height||measure.rect.top<0))measure.issues.push('status/action outside normal viewport');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   const action=page.locator('.text-start .text-session-actions button:not([hidden])');await action.scrollIntoViewIfNeeded();
   const reachable=await action.evaluate(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e===hit||e.contains(hit);});
   if(!reachable)measure.issues.push('action obscured or unreachable');
   entry.states.push({state,...measure,actionReachable:reachable});await capture(state);
  }
  await start.click();await page.evaluate(()=>window.fixture.prime('text'));
  const question=page.getByLabel('Your question',{exact:true});await expect(question).toBeEditable();await expect(question).toBeFocused();
  entry.explicitReadyFocus=true;
  if(!size.reflow){
   await question.fill('When does the station open?');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(()=>window.fixture.answer(0,true));await expect(page.locator('.transcript-turn')).toHaveCount(2);
   const transcript=page.locator('.text-session .transcript'),dock=page.locator('.text-session .session-dock');
   const tr=await transcript.boundingBox(),dr=await dock.boundingBox();assert(tr.y+tr.height<=dr.y+1);assert(dr.y+dr.height<=size.height+1);
   assert(await transcript.evaluate(e=>e.scrollHeight>e.clientHeight+1));await transcript.evaluate(e=>e.scrollTop=180);const scroll=await transcript.evaluate(e=>e.scrollTop);assert(scroll>0);
   await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.equal(await transcript.evaluate(e=>e.scrollTop),scroll);
   entry.activeText={transcript:tr,dock:dr,scrollTop:scroll};await capture('active-text-scroll');
   await page.getByRole('button',{name:'Voice mode',exact:true}).click();assert.equal(await page.evaluate(()=>window.fixture.audit().voice.at(-1).prepare),0);
   await page.getByRole('button',{name:'Start voice',exact:true}).click();await page.evaluate(()=>window.fixture.prime('voice'));
   await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeVisible();
   await page.evaluate(()=>window.fixture.voiceAnswer());await expect(page.locator('.voice-state')).toHaveText('Listening');await expect(page.locator('.voice-session .transcript-turn')).toHaveCount(2);
   entry.voice=await page.locator('.voice-session').evaluate(section=>[...section.querySelectorAll('.voice-dock, .transcript, .voice-session-status, .voice-dock button')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,text:e.tagName==='BUTTON'?e.textContent:null,rect:{x:r.x,y:r.y,width:r.width,height:r.height},maxHeight:s.maxHeight,overflowY:s.overflowY};}));
   await capture('voice-active');
  }
  entry.nativeCalls=await page.evaluate(()=>window.__nativeCalls);assert.equal(entry.nativeCalls,0);assert.deepEqual(entry.errors,[]);assert.deepEqual(entry.external,[]);
  await context.close();
 }
 const failures=results.flatMap(r=>r.states.filter(s=>s.issues.length).map(s=>({theme:r.theme,width:r.width,reflow:!!r.reflow,state:s.state,issues:s.issues})));
 const report={stage,at:new Date().toISOString(),node:process.version,build:(await fs.readFile('.next/BUILD_ID','utf8')).trim(),cssOrigin,bundle:createHash('sha256').update(bundle).digest('hex'),css:createHash('sha256').update(css).digest('hex'),failures,results};
 await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(report,null,2));
 if(stage.startsWith('after')){
  const before=JSON.parse(await fs.readFile(`${base}/${stage==='after-settled'?'before-settled':'before'}/results.json`,'utf8'));
  for(const entry of results.filter(r=>!r.reflow)){const prior=before.results.find(r=>r.theme===entry.theme&&r.width===entry.width);assert.deepEqual(entry.voice,prior.voice,'Voice geometry/styles unchanged');assert.deepEqual(entry.activeText,prior.activeText,'Active text dock/scroll unchanged');}
  report.activeTextAndVoiceInvariant=true;
 }
 await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(report,null,2));
 console.log(`${stage}: ${results.length} viewport/theme scenarios; ${failures.length}/16 status geometry failures`);
 assert.equal(failures.length,0,JSON.stringify(failures));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
