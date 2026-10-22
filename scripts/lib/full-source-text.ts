// Developer harness only: actual owned preparation and default lifecycle; no application factory.
import { createHash } from "node:crypto";
import { createProviderTextPreparation, matchesProviderPreparation } from "../../src/server/context/model-measurement.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { uploadedRecord, captionRecord } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { TextLifecycle } from "../../src/shared/text-lifecycle.ts";
import type { PrimingClock, PrimingTransport } from "../../src/shared/priming-controller.ts";
import type { ProviderPrimingInput } from "../../src/shared/priming-admission.ts";
import { PROVIDER_TEXT_POLICY as policy } from "../../src/shared/priming-provider-policy.ts";
import { pdfFixture, captionFixture } from "../../tests/context/fixtures.ts";
import { SyntheticSourceDatabase } from "../../tests/sources/database.ts";
import { sanitizeUsage, type ProbeUsage } from "./realtime-probe.ts";
import { evaluateQuantities, type QuantityCheck } from "./full-source-facts.ts";

export const MATRIX = [ ["PDF", "A"], ["PDF", "B"], ["YOUTUBE", "A"], ["YOUTUBE", "B"] ] as const;
export const LIMITS = Object.freeze({ sessions: 4, responses: 8, questionsPerSession: 2, sessionMs: 45_000, allocationUsd: 1 });
export const RATES = Object.freeze({ input: 0.60, cachedInput: 0.06, output: 2.40, perTokens: 1_000_000 });
export const ORIGINAL_ATTEMPT = Object.freeze({ sessions: 1, responses: 2, estimatedTextCostUsd: 0.00100752 });
export const hash = (s: string) => createHash("sha256").update(s, "utf16le").digest("hex");
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const clock: PrimingClock = { now: Date.now, setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: h => clearTimeout(h as ReturnType<typeof setTimeout>) };
export const QUESTIONS = {
  PDF: [
    { text: "Using the beginning and final page of this source, give the station opening time, first ferry name and final emergency meeting point. Be concise.", criteria: ["opening-time", "ferry-name", "final-meeting-point"], patterns: [/06:15/, /\biris\b/i, /east cedar gate/i] },
    { text: "Now use the middle trial sections: compare kWh per crate for Trial A and B, and state the caretaker's name. Be concise.", criteria: ["trial-a-per-crate", "trial-b-per-crate", "caretaker"], patterns: [/zo[eë]/i] },
  ],
  YOUTUBE: [
    { text: "Using the beginning and end of the full transcript, name who starts the workshop, its start time, the final shipping label colour and where returns go. Be concise.", criteria: ["workshop-leader", "start-time", "final-label", "returns-location"], patterns: [/\bmira\b/i, /09:20/, /violet/i, /shelf\s+q\b/i] },
    { text: "Now use the middle method sections: compare minutes per lamp for Method A and B and name who records the results. Be concise.", criteria: ["method-a-per-lamp", "method-b-per-lamp", "recorder"], patterns: [/ren[eé]/i] },
  ],
} as const;

export function usageCost(u: ProbeUsage) {
  const cached = u.input_token_details?.cached_tokens ?? 0;
  return ((u.input_tokens - cached) * RATES.input + cached * RATES.cachedInput + u.output_tokens * RATES.output) / RATES.perTokens;
}

type TranscriptObservation = { userTurns: number; assistantTurns: number; incomplete: boolean; phase: string };
export type SyntheticEvidence = { version: "07f-correction-1"; kind: "PDF" | "YOUTUBE"; variant: "A" | "B";
  startedAt: string; sourceSha256Utf16: string; model: string;
  beforeStop: { observation: TranscriptObservation; turns: { role: string; generation: string | null; partStates: string[]; text: string }[] } | null;
  afterStop: SyntheticEvidence["beforeStop"] };

export async function runFullSource(kind: "PDF" | "YOUTUBE", variant: "A" | "B", deps: {
  environment: "offline-scripted" | "live"; open: () => PrimingTransport; signal?: AbortSignal; timeoutMs?: number;
  retainSyntheticEvidence?: (evidence: SyntheticEvidence) => Promise<void>;
}) {
  const started = Date.now(), duration = deps.timeoutMs ?? LIMITS.sessionMs;
  if (!Number.isSafeInteger(duration) || duration < 20 || duration > LIMITS.sessionMs) throw new Error("Invalid deadline");
  const report = {
    version: "07f-correction-1", environment: deps.environment, model: policy.model, kind, variant,
    transport: deps.environment === "live" ? "07d-server-websocket" : "scripted",
    startedAt: new Date(started).toISOString(), endedAt: "", elapsedMs: 0,
    outcome: "FAIL" as "PASS" | "FAIL" | "REVIEW_REQUIRED", failure: "", policy, limits: LIMITS,
    sourceSha256Utf16: "", reconstructedSha256Utf16: "", manifestSha256Utf16: "", variantSha256Utf16: "",
    exactReconstruction: false, provenance: false, sourceCodeUnits: 0, wireBytes: 0,
    counts: { connections: 0, sourceItems: 0, questionItems: 0, responseRequests: 0, responseCreated: 0, responseDone: 0, closes: 0, unsubscribes: 0, inbound: 0 },
    acknowledgments: { effectiveUpdates: 0, sourceItemDone: 0, questionItemDone: 0, protocolReady: false },
    effectivePolicy: [] as { exact: boolean; fields: string[]; audioInputPresent: boolean; transcriptionPresent: boolean; turnDetectionPresent: boolean; checks: Record<string, boolean> }[],
    schema: [] as { event: string; responseFields?: string[]; partType?: string }[],
    facts: [] as { question: number; criteria: string[]; matches: boolean[]; quantities: QuantityCheck[]; retained: boolean; characters: number }[],
    usage: [] as (ProbeUsage | null)[], estimatedTextCostUsd: 0, usageComplete: true,
    transcript: { sampled: false, beforeStop: null as TranscriptObservation | null, afterStop: null as TranscriptObservation | null,
      userTurns: null as number | null, assistantTurns: null as number | null,
      retainedAfterStop: null as boolean | null, incomplete: null as boolean | null },
    productionReady: false, liveOverflow: "NOT_RUN", dashboardReconciliation: "UNAVAILABLE; no authenticated billing session inspected",
  };
  let controller: TextLifecycle | undefined, prepared: ProviderPrimingInput | undefined;
  let evidence: SyntheticEvidence | undefined;
  const sampleAndStop = () => {
    if (!controller || report.transcript.sampled) return;
    const sample = () => {
      const transcript = controller!.transcript;
      return { observation: { userTurns: transcript.turns.filter(t => t.role === "user").length,
        assistantTurns: transcript.turns.filter(t => t.role === "assistant").length,
        incomplete: transcript.incomplete, phase: controller!.snapshot.phase },
        turns: transcript.turns.map(t => ({ role: t.role, generation: t.generation ?? null,
          partStates: t.parts.map(p => p.state), text: t.parts.map(p => p.text).join("\n") })) };
    };
    const beforeStop = sample(); controller.stop(); const afterStop = sample();
    evidence = { version: "07f-correction-1", kind, variant, startedAt: report.startedAt, model: policy.model,
      sourceSha256Utf16: report.sourceSha256Utf16, beforeStop, afterStop };
    report.transcript = { sampled: true, beforeStop: beforeStop.observation, afterStop: afterStop.observation,
      userTurns: beforeStop.observation.userTurns, assistantTurns: beforeStop.observation.assistantTurns,
      retainedAfterStop: JSON.stringify(beforeStop.turns.map(t => [t.role, t.text])) === JSON.stringify(afterStop.turns.map(t => [t.role, t.text])), incomplete: beforeStop.observation.incomplete };
  };
  let aborted = false, expired = false;
  const abort = () => { aborted = true; controller?.stop(); };
  const timer = setTimeout(() => { expired = true; controller?.stop(); }, duration);
  deps.signal?.addEventListener("abort", abort, { once: true });
  if (deps.signal?.aborted) abort();
  const ensure = (ok: unknown, reason: string) => { if (!ok) throw new Error(reason); };
  const until = async (predicate: () => boolean) => {
    while (!predicate()) {
      ensure(!aborted, "cancelled"); ensure(!expired, "session_timeout");
      ensure(controller?.snapshot.phase !== "failed", "lifecycle_" + controller?.snapshot.failure);
      ensure(controller?.snapshot.phase !== "ended", "ended");
      await new Promise(resolve => setTimeout(resolve, 2));
    }
    ensure(!aborted && !expired, aborted ? "cancelled" : "session_timeout");
  };
  try {
    ensure(!aborted, "cancelled");
    const db = new SyntheticSourceDatabase();
    const visitor = createVisitor({ origin: "https://07f.invalid", cookieSecret: "07".repeat(32), secure: true }, started);
    const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
    const repository = createSourceRepository(() => db.asClient());
    await repository.replace(row, () => {});
    const prepare = createProviderTextPreparation({ repository });
    const sourceIds = new Set<string>(), questionIds = new Set<string>(), ackIds = new Set<string>();
    controller = new TextLifecycle(clock, {
      prepare: async (identity, signal) => {
        const args = { visitor, sourceId: row.id, signal, model: policy.model, mode: "text" as const,
          policyVersion: policy.policyVersion, variant, runId: identity.runId, maxEventBytes: 2048 };
        const result = await prepare(args);
        ensure(result.status === "prepared", "preparation");
        if (result.status !== "prepared") throw new Error("preparation");
        prepared = result.input;
        report.provenance = matchesProviderPreparation(prepared, args, Date.now());
        const fragments = prepared.manifest.items.map(e => JSON.parse(e.item.content[0].text)).flatMap(data => data.fragments ?? [data]);
        const captionIds = prepared.variant.source.kind === "YOUTUBE" && prepared.manifest.variant === "B"
          ? [...new Set<string>(fragments.map(f => f.locator.id))] : undefined;
        const sections = captionIds
          ? captionIds.map(id => fragments.filter(f => f.locator.id === id).map(f => f.text).join(""))
          : Array.from({ length: fragments[0].sectionCount }, (_, n) => fragments.filter(f => f.sectionIndex === n).map(f => f.text).join(""));
        const full = sections.join(prepared.variant.source.separator);
        report.sourceSha256Utf16 = hash(row.fullText); report.reconstructedSha256Utf16 = hash(full);
        report.manifestSha256Utf16 = hash(prepared.manifest.representation); report.variantSha256Utf16 = hash(prepared.variant.serialized);
        report.exactReconstruction = full === row.fullText; report.sourceCodeUnits = full.length; report.wireBytes = prepared.manifest.bytes;
        report.counts.sourceItems = prepared.manifest.items.length;
        ensure(report.provenance && report.exactReconstruction, "fidelity");
        prepared.manifest.items.forEach(e => sourceIds.add(e.item.id));
        return prepared;
      },
      connect: async (_identity, signal) => {
        ensure(!signal.aborted && !aborted && !expired, "cancelled");
        report.counts.connections++;
        const raw = deps.open(); let closed = false, remove: (() => void) | undefined;
        const close = () => { if (!closed) { closed = true; report.counts.closes++; remove?.(); raw.close(); } };
        const inspect = (e: unknown) => {
          report.counts.inbound++; ensure(report.counts.inbound <= 1024 && record(e), "inbound_limit");
          if (!record(e)) return;
          const type = typeof e.type === "string" ? e.type : "unknown";
          const known = ["session.created", "session.updated", "conversation.item.done", "response.created", "response.done", "response.content_part.added", "error"];
          if (known.includes(type) && report.schema.length < 80) report.schema.push({ event: type,
            ...(record(e.response) ? { responseFields: Object.keys(e.response).filter(k => /^[a-z_]{1,40}$/.test(k)).sort() } : {}),
            ...(record(e.part) ? { partType: ["text", "output_text", "audio", "output_audio"].includes(String(e.part.type)) ? String(e.part.type) : "other" } : {}) });
          if (type === "session.updated" && record(e.session) && prepared) {
            const s = e.session, audio = record(s.audio) && record(s.audio.input) ? s.audio.input : undefined;
            const wanted = (report.acknowledgments.effectiveUpdates === 0 ? prepared.manifest.configure : prepared.manifest.finalize).session;
            const exact = s.model === policy.model && s.type === "realtime" && s.instructions === wanted.instructions
              && s.max_output_tokens === 512 && s.truncation === "disabled" && JSON.stringify(s.tools) === "[]"
              && s.tool_choice === "none" && JSON.stringify(s.output_modalities) === '["text"]'
              && record(s.reasoning) && s.reasoning.effort === "minimal" && audio?.transcription === null && audio?.turn_detection === null;
            report.effectivePolicy.push({ exact, checks: { model: s.model === policy.model, instructions: s.instructions === wanted.instructions,
              outputCap: s.max_output_tokens === 512, truncation: s.truncation === "disabled", tools: JSON.stringify(s.tools) === "[]",
              toolChoice: s.tool_choice === "none", textOnly: JSON.stringify(s.output_modalities) === '["text"]',
              reasoning: record(s.reasoning) && s.reasoning.effort === "minimal", transcriptionOff: audio?.transcription === null, vadOff: audio?.turn_detection === null },
              fields: Object.keys(s).filter(k => /^[a-z_]{1,40}$/.test(k)).sort(),
              audioInputPresent: !!audio, transcriptionPresent: !!audio && "transcription" in audio, turnDetectionPresent: !!audio && "turn_detection" in audio });
            if (exact) report.acknowledgments.effectiveUpdates++;
          }
          if (type === "conversation.item.done" && record(e.item) && typeof e.item.id === "string" && !ackIds.has(e.item.id)) {
            ackIds.add(e.item.id);
            if (sourceIds.has(e.item.id)) report.acknowledgments.sourceItemDone++;
            if (questionIds.has(e.item.id)) report.acknowledgments.questionItemDone++;
          }
          if (type === "response.created") report.counts.responseCreated++;
          if (type === "response.done") {
            report.counts.responseDone++;
            const usage = sanitizeUsage(record(e.response) ? e.response.usage : undefined); report.usage.push(usage);
            if (usage) {
              report.estimatedTextCostUsd += usageCost(usage);
              ensure(usage.output_tokens <= 512 && !(usage.input_token_details?.audio_tokens || usage.input_token_details?.image_tokens || usage.output_token_details?.audio_tokens), "usage_contract");
            } else report.usageComplete = false;
          }
        };
        const transport: PrimingTransport = {
          isOpen: () => !closed && raw.isOpen(), close: () => {},
          subscribe: (receive, lost) => {
            remove = raw.subscribe(e => {
              if (closed || !remove) return;
              try { inspect(e); receive(e); } catch { controller?.stop(); }
            }, lost);
            return () => { report.counts.unsubscribes++; const f = remove; remove = undefined; f?.(); };
          },
          send: text => {
            const e = JSON.parse(text);
            if (e.type === "response.create") {
              ensure(++report.counts.responseRequests <= 2 && e.response.max_output_tokens === 512
                && e.response.reasoning.effort === "minimal" && JSON.stringify(e.response.tools) === "[]"
                && e.response.tool_choice === "none" && JSON.stringify(e.response.output_modalities) === '["text"]', "outbound_contract");
            } else if (e.type === "conversation.item.create" && !sourceIds.has(e.item.id)) {
              questionIds.add(e.item.id); ensure(++report.counts.questionItems <= 2, "question_limit");
            } else ensure(e.type === "session.update" || sourceIds.has(e.item?.id), "outbound_contract");
            return raw.send(text);
          },
        };
        try { await until(() => raw.isOpen()); ensure(!signal.aborted, "cancelled"); return { transport, close }; }
        catch (e) { close(); throw e; }
      },
    }, () => {}, { connectionMs: 15_000, primingMs: 20_000, turnMs: 20_000 });
    ensure(controller.start(row.id), "start");
    await until(() => controller!.canSubmit);
    report.acknowledgments.protocolReady = controller.snapshot.protocolReady;
    ensure(report.acknowledgments.effectiveUpdates === 2 && report.acknowledgments.sourceItemDone === report.counts.sourceItems, "ack_contract");
    for (const [index, q] of QUESTIONS[kind].entries()) {
      ensure(controller.submit(q.text), "submit");
      await until(() => controller!.canSubmit);
      const assistants = controller.transcript.turns.filter(t => t.role === "assistant");
      const answer = assistants[index]?.parts.map(p => p.text).join("\n") ?? "";
      ensure(assistants.length === index + 1 && report.counts.responseRequests === index + 1
        && report.counts.responseDone === index + 1 && report.usageComplete, "response_contract");
      const quantities = index === 1 ? evaluateQuantities(kind, answer) : [];
      const matches = index === 1 ? [...quantities.map(q => q.status === "PASS"), q.patterns[0].test(answer.normalize("NFC"))]
        : q.patterns.map(p => p.test(answer.normalize("NFC")));
      report.facts.push({ question: index + 1, criteria: [...q.criteria], matches, quantities, retained: !!answer, characters: answer.length });
      ensure(!quantities.some(q => q.status === "FAIL"), "fact_mismatch");
      ensure(!quantities.some(q => q.status === "REVIEW_REQUIRED"), "fact_review_required");
      ensure(matches.every(Boolean), "fact_mismatch");
    }
    sampleAndStop();
    ensure(report.transcript.userTurns === 2 && report.transcript.assistantTurns === 2 && report.transcript.retainedAfterStop && !report.transcript.incomplete, "transcript_contract");
    ensure(report.counts.closes === 1 && report.counts.unsubscribes === 1, "cleanup_contract");
    report.outcome = "PASS";
  } catch (e) {
    // Only our fixed reason vocabulary is allowed out; never provider bodies or arbitrary exceptions.
    const reason = e instanceof Error ? e.message : "";
    report.failure = /^(cancelled|session_timeout|ended|lifecycle_[a-z_]+|preparation|fidelity|inbound_limit|usage_contract|outbound_contract|question_limit|start|ack_contract|submit|fact_mismatch|fact_review_required|response_contract|transcript_contract|cleanup_contract)$/.test(reason) ? reason : "harness_failure";
    if (report.failure === "fact_review_required") report.outcome = "REVIEW_REQUIRED";
  } finally {
    clearTimeout(timer); deps.signal?.removeEventListener("abort", abort);
    sampleAndStop();
    controller?.stop(); controller?.dispose();
    if (deps.retainSyntheticEvidence) {
      try { await deps.retainSyntheticEvidence(evidence ?? { version: "07f-correction-1", kind, variant,
        startedAt: report.startedAt, model: policy.model, sourceSha256Utf16: report.sourceSha256Utf16, beforeStop: null, afterStop: null }); }
      catch { report.outcome = "FAIL"; report.failure = "evidence_write_failed"; }
    }
    report.usageComplete = report.usage.length === report.counts.responseRequests && report.usage.every(u => u !== null);
    report.endedAt = new Date().toISOString(); report.elapsedMs = Date.now() - started;
  }
  return report;
}
