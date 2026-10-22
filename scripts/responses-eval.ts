// Explicit opt-in local capability harness. Never imported by the application or ordinary tests.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareCandidate, validateCandidateSource, runCandidate, RESPONSES_SCHEMA, RESPONSES_PROMPT, RESPONSES_POLICY,
  type CandidateResult } from "../src/server/text/responses-candidate.ts";
import { RESPONSES_EVALUATION } from "./lib/responses-evaluation.ts";

const frozenFiles = ["src/server/text/responses-candidate.ts", "src/server/text/responses-transport.ts", "scripts/responses-eval.ts",
  "scripts/lib/responses-evaluation.ts", "tests/unit/responses-candidate.test.ts"];
const digest = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const json = async (file: string) => JSON.parse(await readFile(file, "utf8"));
const save = (file: string, value: unknown, exclusive = false) => writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: exclusive ? "wx" : "w" });
const fileHashes = async () => Object.fromEntries(await Promise.all(frozenFiles.map(async file => [file, digest(await readFile(file))])));

export async function responsesEvaluation(args: string[]): Promise<void> {
  if (args.length !== 4 || !["--prepare", "--live"].includes(args[0])) throw new Error("Usage: node --conditions=react-server scripts/responses-eval.ts --prepare|--live SOURCE_JSON INDEPENDENT_CAPTIONS_JSON OUTPUT_DIRECTORY");
  const [mode, sourceFile, independentFile, output] = args;
  const out = path.resolve(output), allowed = path.resolve("artifacts/local/03f-responses");
  if (out !== allowed && !out.startsWith(allowed + path.sep)) throw new Error("Evidence must remain under artifacts/local/03f-responses");
  const sourceCapture = await json(sourceFile), source = validateCandidateSource(sourceCapture.body?.source ?? sourceCapture);
  const independent = await json(independentFile);
  assert.deepEqual(source.sections, independent, "All original acquisition captions/IDs/text/times/durations must match");
  assert.equal(source.language, RESPONSES_EVALUATION.language); assert.equal(source.sections.length, RESPONSES_EVALUATION.captions);
  assert.equal(digest(source.fullText), RESPONSES_EVALUATION.fullTextSha256);
  const prepared = prepareCandidate({ source, question: RESPONSES_EVALUATION.questions[0] });
  const identity = { files: await fileHashes(), evaluation: RESPONSES_EVALUATION, policy: RESPONSES_POLICY,
    promptSha256: digest(RESPONSES_PROMPT), schemaSha256: digest(JSON.stringify(RESPONSES_SCHEMA)),
    sourceSha256: digest(JSON.stringify(source)), independentFileSha256: digest(await readFile(independentFile)),
    firstRequestSha256: prepared.requestSha256 };
  await mkdir(out, { recursive: true });
  if (mode === "--prepare") {
    await save(path.join(out, "freeze.json"), { frozenAt: new Date().toISOString(), identity }, true);
    await save(path.join(out, "source.json"), source, true);
    await save(path.join(out, "schema.json"), RESPONSES_SCHEMA, true);
    await writeFile(path.join(out, "prompt.txt"), RESPONSES_PROMPT, { flag: "wx" });
    console.log("Frozen implementation/schema/prompt/questions/scoring and all 428 independent caption comparisons. No API call."); return;
  }
  const frozen = await json(path.join(out, "freeze.json")); assert.deepEqual(identity, frozen.identity, "Freeze mismatch; no calls allowed");
  // Exclusive, non-resumable ledger: interruption cannot silently grant another allocation.
  const ledger = { state: "OPEN", startedAt: new Date().toISOString(), generationCalls: 0, countingRequests: 0, reservedUsd: 0,
    maxUsd: 0.50, actualBilling: "UNKNOWN", attempts: [] as Record<string, unknown>[] };
  await save(path.join(out, "ledger.json"), ledger, true);
  const controller = new AbortController(), abort = () => controller.abort(); process.once("SIGINT", abort);
  try {
    // Authorized existing key, read only in explicit --live mode; never copied or printed.
    const { readProbeKey } = await import("./lib/realtime-probe-live.ts");
    const { createResponsesTransport } = await import("../src/server/text/responses-transport.ts");
    const transport = createResponsesTransport(await readProbeKey());
    let previous: CandidateResult | undefined;
    for (let index = 0; index < 4; index++) {
      if (controller.signal.aborted) break;
      const history = index === 1 && previous?.ok ? [
        { role: "user" as const, content: RESPONSES_EVALUATION.questions[0] },
        { role: "assistant" as const, content: JSON.stringify({ answer: previous.answer,
          statements: previous.statements.map(({ text, classification, segment_ids, inference_basis }) => ({ text, classification, segment_ids, inference_basis })) }) },
      ] : [];
      if (index === 1 && !previous?.ok) break;
      const p = prepareCandidate({ source, question: RESPONSES_EVALUATION.questions[index], history });
      assert.deepEqual(await fileHashes(), identity.files, "Frozen executable changed; stop");
      await save(path.join(out, `case-${index + 1}-request.json`), { requestSha256: p.requestSha256, request: p.request }, true);
      // Official server counter includes instructions, schema and bounded history, rather than an assumed tokenizer mapping.
      ledger.countingRequests++; await save(path.join(out, "ledger.json"), ledger);
      const tokenBound = await transport.count(p, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]));
      await save(path.join(out, `case-${index + 1}-tokens.json`), tokenBound, true);
      assert.ok(tokenBound.inputTokens <= 128000);
      const worstCase = (128000 * 0.75 + 4096 * 4.50) / 1e6;
      assert.ok(worstCase <= 0.115 && ledger.reservedUsd + 0.115 <= 0.50 && ledger.generationCalls < 4);
      const entry: Record<string, unknown> = { case: index + 1, startedAt: new Date().toISOString(), requestSha256: p.requestSha256,
        verifiedInputTokens: tokenBound.inputTokens, reservedUsd: 0.115, boundedCostUsd: worstCase, status: "ATTEMPT_RESERVED" };
      ledger.generationCalls++; ledger.reservedUsd = Number((ledger.reservedUsd + 0.115).toFixed(3)); ledger.attempts.push(entry);
      await save(path.join(out, "ledger.json"), ledger);
      const result = await runCandidate(p, { tokenBound, signal: controller.signal, transport: async (request, signal) => {
        try {
          const raw = await transport.generate(request, signal);
          await save(path.join(out, `case-${index + 1}-raw.json`), raw, true); return raw;
        } catch (error) {
          const category = error instanceof Error && /^candidate_(?:http_\d{3}|response_bounds|aborted)$/u.test(error.message) ? error.message : "transport_failure";
          await save(path.join(out, `case-${index + 1}-transport-error.json`), { category }, true); throw error;
        }
      } });
      await save(path.join(out, `case-${index + 1}-result.json`), result, true);
      Object.assign(entry, { completedAt: new Date().toISOString(), status: result.ok ? "COMPLETE_NOT_SCORED" : result.code,
        elapsedMs: result.elapsedMs, usage: result.usage,
        usagePricedEstimateUsd: result.usage ? (result.usage.inputTokens * 0.75 + result.usage.outputTokens * 4.50) / 1e6 : null });
      await save(path.join(out, "ledger.json"), ledger); previous = result;
      console.log(`Case ${index + 1}: ${result.ok ? "complete; semantic review pending" : result.code}, ${Math.round(result.elapsedMs)} ms`);
      if (!result.ok) break; // Protocol failure is a bounded result, never a retry/repair invitation.
    }
  } catch (error) {
    // Only authored categories/statuses, never arbitrary provider exception text.
    const safe = error instanceof Error && /^candidate_(?:http_\d{3}|token_bound|response_bounds|aborted|key_unavailable)$/u.test(error.message) ? error.message : "evaluation_blocked";
    await save(path.join(out, "failure.json"), { category: safe, at: new Date().toISOString() }, true);
    console.log(`Evaluation stopped: ${safe}`); process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", abort); ledger.state = "CLOSED";
    await save(path.join(out, "ledger.json"), ledger);
    await save(path.join(out, "final-frozen-hashes.json"), await fileHashes(), true);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await responsesEvaluation(process.argv.slice(2));
}
