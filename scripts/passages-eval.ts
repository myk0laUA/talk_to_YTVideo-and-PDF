// Explicit opt-in, local saved-source capability evaluation. Never a public application entry point.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { RESPONSES_EVALUATION } from "./lib/responses-evaluation.ts";
import { RESPONSES_POLICY } from "../src/server/text/responses-stage.ts";
import { validateCandidateSource } from "../src/server/text/responses-candidate.ts";
import { runPassageCandidate, preparePassageSelection, PASSAGE_BOUNDS, SELECTION_PROMPT, COMPOSITION_PROMPT,
  SELECTION_SCHEMA, COMPOSITION_SCHEMA, type PassageResult, type PassageStage } from "../src/server/text/responses-passages.ts";

const files = ["src/server/text/responses-candidate.ts", "src/server/text/responses-transport.ts", "src/server/text/responses-stage.ts",
  "src/server/text/responses-passages.ts", "scripts/passages-eval.ts", "scripts/lib/responses-evaluation.ts", "tests/unit/responses-passages.test.ts", "tests/unit/responses-candidate.test.ts"];
const hash = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const read = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const save = (p: string, value: unknown, exclusive = false) => writeFile(p, JSON.stringify(value, null, 2) + "\n", { flag: exclusive ? "wx" : "w" });
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async p => [p, hash(await readFile(p))])));

export async function passagesEvaluation(args: string[]): Promise<void> {
  if (args.length !== 4 || !["--prepare", "--live"].includes(args[0])) throw new Error("Usage: node --conditions=react-server scripts/passages-eval.ts --prepare|--live SOURCE_JSON INDEPENDENT_CAPTIONS_JSON OUTPUT_DIRECTORY");
  const [mode, sourceFile, independentFile, output] = args, out = path.resolve(output), allowed = path.resolve("artifacts/local/03f-passages");
  assert.ok(out === allowed || out.startsWith(allowed + path.sep), "Evidence must remain under ignored03f-passages");
  const capture = await read(sourceFile), source = validateCandidateSource(capture.body?.source ?? capture);
  assert.deepEqual(source.sections, await read(independentFile)); assert.equal(source.sections.length, RESPONSES_EVALUATION.captions);
  assert.equal(source.language, RESPONSES_EVALUATION.language); assert.equal(hash(source.fullText), RESPONSES_EVALUATION.fullTextSha256);
  const identity = { files: await hashes(), evaluation: RESPONSES_EVALUATION, bounds: PASSAGE_BOUNDS, policy: RESPONSES_POLICY,
    allocation: { maxGenerationCalls: 8, maxEstimatedUsd: 1, stageUsd: 0.115, caseUsd: 0.23, totalReservationUsd: 0.92, retries: 0 },
    selectionPromptSha256: hash(SELECTION_PROMPT), compositionPromptSha256: hash(COMPOSITION_PROMPT),
    selectionSchemaSha256: hash(JSON.stringify(SELECTION_SCHEMA)), compositionSchemaSha256: hash(JSON.stringify(COMPOSITION_SCHEMA)),
    sourceSha256: hash(JSON.stringify(source)), independentSha256: hash(await readFile(independentFile)),
    firstSelectionRequestSha256: preparePassageSelection({ source, question: RESPONSES_EVALUATION.questions[0] }).requestSha256,
    historyRecipe: "Exact prior question and new candidate answer/statements/classification/inference_basis/passage_ids for case2 only. Other cases fresh. Prior answers never evidence.",
    scoring: "Use unchanged prior factual/attribution/central-message/under100word criteria; score every material assertion against its own selected passages/all constituent captions. No post-answer expansion or ID remapping. Expose precise constituent fact locators separately from passage starts. Report selection sizes/relevance. Missing antecedent comparisons are offline evaluation only, never prompt hints.",
  };
  await mkdir(out, { recursive: true });
  if (mode === "--prepare") {
    await save(path.join(out, "freeze.json"), { at: new Date().toISOString(), identity }, true);
    await save(path.join(out, "source.json"), source, true);
    await save(path.join(out, "schemas.json"), { selection: SELECTION_SCHEMA, composition: COMPOSITION_SCHEMA }, true);
    await save(path.join(out, "prompts.json"), { selection: SELECTION_PROMPT, composition: COMPOSITION_PROMPT }, true);
    console.log("Frozen two-stage implementation, prompts/schemas/bounds/questions/scoring;428original captions match. No API call."); return;
  }
  assert.deepEqual(identity, (await read(path.join(out, "freeze.json"))).identity, "Freeze mismatch, no calls");
  const ledger = { state: "OPEN", startedAt: new Date().toISOString(), generationCalls: 0, countingRequests: 0, reservedUsd: 0,
    maxGenerationCalls: 8, maxEstimatedUsd: 1, actualBilling: "UNKNOWN", cases: [] as Record<string, unknown>[] };
  await save(path.join(out, "ledger.json"), ledger, true);
  const controller = new AbortController(), abort = () => controller.abort(); process.once("SIGINT", abort);
  try {
    const { createResponsesTransport } = await import("../src/server/text/responses-transport.ts");
    const { readProbeKey } = await import("./lib/realtime-probe-live.ts");
    const transport = createResponsesTransport(await readProbeKey()); let previous: PassageResult | undefined;
    for (let i = 1; i <= 4; i++) {
      if (controller.signal.aborted || i === 2 && !previous?.ok) break;
      assert.deepEqual(await hashes(), identity.files);
      const history = i === 2 && previous?.ok ? [{ role: "user" as const, content: RESPONSES_EVALUATION.questions[0] },
        { role: "assistant" as const, content: JSON.stringify({ answer: previous.answer,
          statements: previous.statements.map(({ text, classification, passage_ids, inference_basis }) => ({ text, classification, passage_ids, inference_basis })) }) }] : [];
      const entry: Record<string, unknown> = { case: i, question: RESPONSES_EVALUATION.questions[i - 1], status: "PENDING", stages: [] as Record<string, unknown>[] };
      ledger.cases.push(entry);
      const writeLedger = () => save(path.join(out, "ledger.json"), ledger);
      let activeStage: PassageStage = "reserve";
      const result = await runPassageCandidate({ source, question: RESPONSES_EVALUATION.questions[i - 1], history }, {
        signal: controller.signal,
        reserve: async allocation => {
          assert.deepEqual(await hashes(), identity.files);
          assert.ok(ledger.reservedUsd + allocation.totalUsd <= 1 && ledger.generationCalls + allocation.stages <= 8);
          assert.ok((128000 * 0.75 + 4096 * 4.5) / 1e6 <= allocation.stageUsd);
          ledger.reservedUsd = Number((ledger.reservedUsd + allocation.totalUsd).toFixed(2));
          Object.assign(entry, { startedAt: new Date().toISOString(), reservation: allocation, status: "BOTH_STAGES_RESERVED" });
          await writeLedger(); return true;
        },
        count: async (p, signal) => {
          ledger.countingRequests++; await writeLedger(); if (signal.aborted) throw new Error("candidate_aborted");
          return transport.count(p, signal);
        },
        transport: async (request, signal) => {
          // Count the actual attempted generation before fetch; errors and aborts still consume a call.
          if (signal.aborted) throw new Error("candidate_aborted");
          ledger.generationCalls++; assert.ok(ledger.generationCalls <= 8); await writeLedger();
          if (signal.aborted) throw new Error("candidate_aborted");
          try { return await transport.generate(request, signal); }
          catch (error) {
            const category = error instanceof Error && /^candidate_(?:http_\d{3}|response_bounds|aborted)$/u.test(error.message) ? error.message : "transport_failure";
            await save(path.join(out, `case-${i}-${activeStage}-transport-error.json`), { category }, true); throw error;
          }
        },
        observe: async (stage, event, data) => {
          activeStage = stage;
          if (event === "prepared") await save(path.join(out, `case-${i}-${stage}-request.json`), data, true);
          if (event === "counted") await save(path.join(out, `case-${i}-${stage}-tokens.json`), data, true);
          if (event === "raw") await save(path.join(out, `case-${i}-${stage}-raw.json`), data, true);
          if (event === "selected") await save(path.join(out, `case-${i}-selected-before-composition.json`), { at: new Date().toISOString(), selection: data }, true);
          if (event === "generating") { (entry.stages as Record<string, unknown>[]).push({ stage, requestSha256: (data as { requestSha256: string }).requestSha256, generatingAt: new Date().toISOString() }); await writeLedger(); }
        },
      });
      await save(path.join(out, `case-${i}-result.json`), result, true);
      Object.assign(entry, { completedAt: new Date().toISOString(), status: result.ok ? "COMPLETE_NOT_SCORED" : result.code,
        elapsedMs: result.elapsedMs, diagnostics: result.diagnostics }); await writeLedger(); previous = result;
      console.log(`Case${i}: ${result.ok ? "complete, semantic review pending" : result.code}, ${Math.round(result.elapsedMs)}ms`);
      if (!result.ok) break;
    }
  } catch {
    await save(path.join(out, "failure.json"), { category: "evaluation_blocked", at: new Date().toISOString() }, true);
    process.exitCode = 1; console.log("Evaluation stopped; no retry.");
  } finally {
    process.removeListener("SIGINT", abort); controller.abort(); ledger.state = "CLOSED";
    await save(path.join(out, "ledger.json"), ledger); await save(path.join(out, "final-frozen-hashes.json"), await hashes(), true);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await passagesEvaluation(process.argv.slice(2));
