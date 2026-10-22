# 03F Responses candidate — worker review handoff

21 October 2026, Toronto. **READY_FOR_REVIEW: implementation and bounded evaluation completed; four-case semantic gate FAIL.** Both summaries omit support for material assertions. Princeton and absent-fact cases pass. This does not complete 03F or original Steps 03/07/10, authorize integration, or approve deployment. PM owns acceptance and the next decision; no further sampling or redesign performed.

## Identity and changes

Arrival was clean `main`, HEAD `5fd13cd1fea5c28d3fa03ad771995766c694a1c0` (the task-assignment commit after the brief's `20f30a4`). Delivery is dirty, with no commit/push/deployment. Final isolated local production build: **`WKt4fufGvvpRBt8dLggOY`**, built 01:24:32.438–01:24:39.031 UTC on 22 October (21 October Toronto). This is the build made for this task, not the root `.next` or a deployed identity.

| File | Change / purpose |
|---|---|
| `src/server/text/responses-candidate.ts` | Server-only, reusable validated-source candidate; frozen requests, strict bounded statement schema, exact source-reference resolution and explicit terminal results. No database, environment or route access. |
| `src/server/text/responses-transport.ts` | Server-only injected-key/fetch transport to fixed Responses endpoints; no redirects/retries; bounded UTF-8/JSON body. Official input counter supplies the exact request-bound token count. |
| `scripts/responses-eval.ts` | Explicit prepare/live harness, source identity checks, immutable preregistration, per-request identities, exclusive non-resumable spend ledger and raw/results evidence. Ordinary imports/tests cannot enter live mode. |
| `scripts/lib/responses-evaluation.ts` | Frozen questions, source identity, history recipe, scoring criteria and allowance. |
| `tests/unit/responses-candidate.test.ts` | 38 injected-transport/source/bounds/terminal/isolation tests; synthetic configuration only. |
| This report; `PROJECT_STATE.md`; `TESTING.md` | Actual results, commands, limitations and review handoff. |

No existing application module, policy, route, flag, dependency/lockfile, acquisition, schema, voice or PDF implementation changed. The source DTO copies only ID/video/language/canonical captions/fullText, preserves original order and exact times/durations, and rejects mismatched fullText. Empty captions are retained; the real source has zero empty entries and the synthetic tests include one. The model receives all sections with a newline separator, without duplicating fullText or introducing ordinal IDs. Ownership and expiry remain the future caller's responsibility: saved public fixture input is explicitly **not** authorization evidence.

The result is buffered: only a complete validated response becomes answer prose. Unknown/missing/empty-caption references retain the readable statement with unconfirmed evidence; there is no ID shift, neighbor expansion, copied model timestamp/excerpt/URL, or verified semantic status. Existing IDs become `source_matched` only; `semanticSupport` remains `not_evaluated`. Inference requires an explicit basis and is labelled in the answer. Unavailable answers can have no references. Invalid structure/partial JSON is never shown as prose. Refusal, incomplete/token exhaustion, malformed content, provider failure, transport failure, timeout, abort, and late resolution/rejection are separate tested outcomes. HTTP status categories are retained safely by the harness; arbitrary exceptions/provider error bodies are not logged.

## Documentation and frozen protocol

Used the OpenAI Docs skill. Verified the [pinned model, capabilities and standard prices](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Responses structured-output syntax](https://developers.openai.com/api/docs/guides/structured-outputs), [create parameters](https://developers.openai.com/api/reference/python/resources/responses/methods/create), [reasoning/output accounting](https://developers.openai.com/api/docs/guides/reasoning), and [official token counting](https://developers.openai.com/api/docs/guides/token-counting). Local snapshots are ignored under `artifacts/local/03f-responses/official-*.md`. The version-matched Next server/client guide's `server-only` guidance was also consulted; no framework API changed.

All four requests and returned envelopes use `gpt-5.4-mini-2026-03-17`, medium reasoning, 4096 total output tokens, `store:false`, `truncation:"disabled"`, no tools/background/streaming, default service tier. Source and bounded history are explicit every time; no provider conversation, previous response ID or automatic repair/retry. The official non-generation `/responses/input_tokens` counter includes the exact instructions, schema, source, question, tools and reasoning configuration, and case-2 history; its request hash must match the prepared request. Missing/invalid/mismatched/>128000 counts reject before generation. Four counting HTTP requests are disclosed separately from the **four generation calls**; counters generate no answer/output usage. No assumed tokenizer mapping or characters-per-token estimate was used. Local tiktoken 0.13.0 did not recognize the snapshot, so it was not used as accounting evidence.

Independent Python ElementTree parsing of retained `03f-route-a/returned-transcript.xml` compared **all 428** IDs, order, texts, fractional starts and durations with `03f-single-id/candidate/source.json`. Language `sq`; original fullText SHA256 **`b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`**. No new acquisition/database import or language substitution. XML hash `42a9d221fc19431642651beeaa0848400b5d5424461562d1fc99602ad68b541d`.

Freeze time **01:25:11.002 UTC**, before first paid generation at **01:25:18.411 UTC**. `freeze.json` SHA256 **`833bd4049a9578a3beb9b7c119f96aab46ea310ac9f02123bee8724293f20845`**. Prompt SHA256 `d5765ef2d3388b2fcf3013101092f173e9940dc2dd59a0c7a9df5d136e1b9785`; schema `120a95768270f5002e52306fb415f14aec78f3d62aef793c62d34d15ee9eef62`; validated source DTO `50603aae87a74451750de9ebe8073ffd903aa8f9c8f4d6cbaecd130f1621701c`. All five executable/test file hashes match the pre-live freeze after evaluation; **no post-live code/prompt/schema/test edits**.

Frozen order/questions:

1. “In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.” Exact prior saved comparison question, fresh context.
2. “In the personal story later in the talk, how long was the annual Princeton talk, and how many people was it given to? Include supporting source references.” Exact prior follow-up; history contains question 1 and the exact validated candidate answer/statements/IDs, as preregistered. No unrelated history.
3. Same summary question, fresh context and byte-identical request to case 1.
4. “What is the exact publication DOI of the power-posing study discussed in this talk? Answer only if the source provides it, with supporting source references.” Chosen after independent reading of all 428 captions, before freeze: the source mentions publishing findings in 262 but supplies no DOI/journal identifier. Expect unavailable with no invented evidence.

| Case | Request SHA256 | UTC generation start–completion, 22 October | Buffered first readable answer / complete |
|---|---|---|---|
| 1 | `063c73eb7e399bda7b61b71611833d7133ee781aa4ab706990c2e55eee633483` | 01:25:18.411–01:25:22.843 | 4429.69 ms |
| 2 | `a308bba1fca43d24a799da32e5ec46016c1ebb742c72a4b000ac426d1c083d93` | 01:25:23.058–01:25:25.000 | 1941.14 ms |
| 3 | `063c73eb7e399bda7b61b71611833d7133ee781aa4ab706990c2e55eee633483` | 01:25:25.217–01:25:30.972 | 5753.12 ms |
| 4 | `bfb061d7986c9c51da26c470e73b735f5f5815271e9d24cd74639bda34f5bd8f` | 01:25:31.472–01:25:33.056 | 1582.86 ms |

Latency includes HTTP/buffering, local raw-evidence write, validation and resolution; excludes the separate input count. It is **not** first-token streaming/UI latency. All four completed; no refusals, malformed outputs, aborts, HTTP errors or token exhaustion occurred live. These remain injected-test evidence only.

## Exact answers and statement-level evaluation

All seven statements were reviewed against their **selected original passages**, independently of candidate self-assessment. All **59 reference occurrences** match exact canonical text/time/duration/video URL. That passes membership, not semantic support. Raw envelopes, full unmodified statements/IDs, all excerpts/locators, clause-by-clause reasoning and diagnostic missing IDs are retained in `case-N-{request,tokens,raw,result}.json` and `per-claim-evaluation.json`. Missing IDs below are explanations of gaps, never additions to the scored evidence. This is the worker's passage review, not a separate human/PM approval or another model-judge call.

Case 1 — 57 words; readable/central-message/attribution PASS; **semantic FAIL**:

> The speaker says nonverbal behavior shapes how other people judge us, and that it also affects how we feel and think about ourselves.
>
> She argues that brief "power poses" before stressful, evaluative situations can make people feel more powerful and change behavior and hormones, so she urges people to use the technique and share it with others.

| Statement | Exact selected segment numbers | Assessment of every material part |
|---|---|---|
| 1.1 | 58,59,141,142,144,244,245,246 | PASS as the attributed broad thesis.58/59 and141/142 complete the outward-judgment claim;144 names the self question and244–246 shift to ourselves and conclude body changes mind.144 alone is a question, not affirmative evidence. No independent established-science claim is made. |
| 1.2 | 200,201,219,221,226,227,233,237,253,259,405,406,417,418,424,426 | FAIL.200/201 leaves the two-minute treatment dangling without202;253 is evaluative,259 an interview, but stress/before timing is absent.219 is intent and221 a question, not the claimed powerful-feeling effect.226/227 introduce gambling but omit its outcome228–230.233/237 have percentages without hormone referents231/236 or generic conclusion239. The exhortation to pose/share is supported by417/418/424; that does not supply the other compound assertions. |

Case 2 — 16 words; **semantic and canonical factual support PASS**:

> The speaker says the annual Princeton talk lasted 20 minutes and was given to 20 people.

Statement 2.1 selects only **segment-355**, at **1040.594 seconds**, duration **3.499 seconds**. Its original text explicitly supplies annual Princeton talk,20 minutes and20 people. Both facts and their antecedent are in that exact caption; no additional biography is asserted. URL constructed by code: `https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=1040.594s`.

Case 3 — 68 words; readable/central-message/attribution PASS; **semantic FAIL**:

> The speaker says body language shapes both how others judge us and how we feel about ourselves, not just how we communicate.
>
> She argues that holding a powerful pose for two minutes before a stressful situation can change hormones, boost confidence, and improve outcomes like job interviews.
>
> Her message is to "fake it till you become it" and share this simple technique, especially with people who lack power.

| Statement | Exact selected segment numbers | Assessment of every material part |
|---|---|---|
| 3.1 | 141,142,143,144,145,244,245,246 | PASS for the broad attributed outward/self thesis:141/142 complete others' thoughts/feelings;143–145 ask and affirm evidence for the self question;244–246 give the self/mind conclusion. “Not just how we communicate” paraphrases that contrast, rather than adding a separate empirical result. |
| 3.2 | 227,228,229,230,233,234,237,238,239,253,259,280,281,282,301,401 | FAIL.280–282 supports poses followed by a stressful interview; the exact two-minute treatment201/202 is missing.239 supports the narrow generic hormone-change clause (the answer asserts no particular hormone/percentage). **Confidence** lacks240/241.301 says “these people” were rated more positively, but lacks the hiring/high-power-group antecedents298/299;280–282 includes both groups, and227–230 is gambling, not that interview result.401 is irrelevant to confidence. |
| 3.3 | 401,402,403,418,421,422,423,424,425,426 | Slogan401–403 and especially people without power421–423 PASS. Sharing simple science is explicit in418, but **the posing antecedent417 is absent from this statement's evidence**.424/425 supplies private/body/two-minute context without naming posing. Complete antecedent support remains partial/FAIL under the frozen criterion; statement3 does not silently borrow statement2's references. |

Case 4 — 17 words; **unavailable/semantic PASS**:

> The source does not provide the exact publication DOI of the power-posing study discussed in the talk.

Statement 4.1 is classified `unavailable`, with **zero IDs/references**, and invents no DOI. Whole-source inspection supports absence; an invented excerpt would not prove it. No inference statements occurred live; their explicit labelling/basis is covered offline.

The two unequivocal compound-support failures (1.2 and3.2) are sufficient to fail the gate regardless of borderline interpretation of other paraphrases. Strict JSON and many correct IDs did not resolve complete passage selection. No output was rewritten, window expanded, ID shifted, sample discarded, prompt revised, or new call made after this result.

## Spend ledger

New allocation only; all previous ledgers remain closed. Standard documented input/output rates $0.75/$4.50 per million. Worst-case per generation `(128000×0.75 +4096×4.50)/1e6 = $0.114432`, rounded up to **$0.115** before each send. Four calls reserve **$0.460**, below $0.50. Output caps include billed reasoning. The official counts matched returned usage exactly in every case.

| Case | Verified/returned input | Returned output, including reasoning | Reasoning subset | Cached input subset | Usage-priced estimate, undiscounted input |
|---|---:|---:|---:|---:|---:|
| 1 | 16984 | 522 | 306 | 0 | $0.01508700 |
| 2 | 17299 | 107 | 48 | 16768 | $0.01345575 |
| 3 | 16984 | 799 | 516 | 16768 | $0.01633350 |
| 4 | 16987 | 145 | 89 | 16768 | $0.01339275 |
| Total | 68254 | 1573 | 959 | 50304 | **$0.05826900** |

Applying the separately documented $0.075/M cached-input rate yields **$0.02431380 estimated**, not an invoice. Reasoning is already included in output, never added twice. **Actual billing UNKNOWN.** Ledger CLOSED,4/4 generation calls,4 separate counting HTTP requests,0 retries/repair calls. Exclusive existing `ledger.json` prevents an accidental second live run in the same directory. A fresh directory is not authorization for another allowance.

## Reproduction and verification

Use Node24.22.0/npm11.19.1. Actual pinned executable is `.tools/node-v24.22.0-win-x64/node.exe`; npm is invoked through its bundled `node_modules/npm/bin/npm-cli.js`, with that Node directory first on PATH. Ordinary `npm test` imports only inert harness definitions; it has no live flag and uses fake/blank configuration. No dependency installation was necessary or performed.

Exact opt-in harness syntax (paths are repository-relative; the third argument must be under the ignored evidence directory):

```powershell
.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server scripts/responses-eval.ts --prepare artifacts/local/03f-single-id/candidate/source.json artifacts/local/03f-responses/independent-xml.json artifacts/local/03f-responses/
.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server scripts/responses-eval.ts --live artifacts/local/03f-single-id/candidate/source.json artifacts/local/03f-responses/independent-xml.json artifacts/local/03f-responses/
```

These commands were executed once via task-owned `actions.mjs prepare/live`; the now-closed directory intentionally refuses repetition. Prepare performs no API call. Live loads the standing authorized key using the existing backend helper without printing/copying private environment files. No endpoint override or automatic retries. Evidence is public-source material but remains ignored.

All offline compilation/tests ran in a fresh task-owned `.env`-free copy under `artifacts/local/03f-responses/offline-checkout`, with a node_modules junction, blank real keys, unusable loopback DB, all public flags false and the existing network-denial preload. The latter is test configuration, not a changed public deployment. Commands below are child commands recorded with absolute executable/argv/cwd/start/end/exits in `commands.jsonl`; final logs have the listed UTC prefixes on22October.

| Check / exact command | UTC start–end | Observed / status / exit | Evidence under `artifacts/local/03f-responses/` |
|---|---|---|---|
| `node --conditions=react-server --test tests/unit/responses-candidate.test.ts` | 01:24:13.954–01:24:14.258 | 38/38 PASS /0 | `candidate-2026-10-22T01-24-13-954Z.log` |
| `node --conditions=react-server --test tests/unit/context.test.ts tests/unit/youtube-evidence.test.ts tests/unit/youtube-evidence-format.test.ts tests/unit/youtube-text-citations.test.ts tests/unit/text-caption-packing.test.ts tests/unit/provider-admission.test.ts tests/unit/priming.test.ts` | 01:22:25.497–01:22:27.399 | 283/283 PASS /0; unchanged affected modules, also rerun in final whole suite | `focused-2026-10-22T01-22-25-497Z.log` |
| `npm run lint` | 01:24:14.260–01:24:21.654 | Clean PASS /0 | `lint-2026-10-22T01-24-14-260Z.log` |
| `npm run typecheck` | 01:24:21.655–01:24:25.512 | Generated types and strict compilation PASS /0 | `typecheck-2026-10-22T01-24-21-655Z.log` |
| `npm test` | 01:24:25.513–01:24:32.435 | 1744/1744 PASS, no skips /0 | `test-2026-10-22T01-24-25-513Z.log` |
| `npm run build` | 01:24:32.438–01:24:39.031 | PASS /0; build `WKt4fufGvvpRBt8dLggOY` | `build-2026-10-22T01-24-32-438Z.log` |
| `python artifacts/local/03f-responses/parse_captions.py` | 01:25:03.611–01:25:03.775 | All428 original XML comparisons PASS /0 | `source-preservation.json`, `independent-xml.json`, parse log |
| `node --conditions=react-server artifacts/local/03f-responses/preserve.mjs` | 01:25:03.776–01:25:04.304 | 24 voice/PDF manifest byte comparisons and existing text source reconstruction PASS /0 | `preservation.json`, preserve log |
| Exact `--prepare` above | 01:25:10.873–01:25:11.018 | Frozen pre-live identities PASS /0 | `freeze.json`, `prompt.txt`, `schema.json` |
| Exact `--live` above | 01:25:17.170–01:25:33.081 | Four completed protocol results /0; semantic FAIL/PASS/FAIL/PASS | `ledger.json`, all four raw/results/token/request files, live log |
| `node --conditions=react-server artifacts/local/03f-responses/evaluate.mjs` | 01:27:37.921–01:27:38.014 | Canonical/usage/frozen-identity audit PASS /0; worker semantic gate FAIL | `per-claim-evaluation.json` |
| `node --conditions=react-server artifacts/local/03f-responses/audit.mjs` | Before and after live; final time in command ledger | 557 protected tracked files unchanged;13 browser chunks and20 production traces exclude candidate; private-file integrity and build-input equality PASS /0 | `audit.json`, `changed-files.sha256.json`, final audit log |

Initial development typecheck at01:21:28.432–01:21:36.351 exited2: history narrowing, Promise union inference and a readonly test-fixture mutation needed typing corrections. Corrected before freeze; failed log retained. Later server enum validation also gained a non-string rejection test before freeze. Earlier successful development builds (`xVvEdASqY22nxe4At2bQw`, `FGFD7taB_te3fqynvv0P1`) are not the final build. Build output warns about multiple lockfiles due to the isolated checkout; no lockfile/config was removed or changed to silence it. No failing live request was retried.

## Hashes, acceptance and cleanup

Pre-live/final executable hashes:

| File | SHA256 |
|---|---|
| `src/server/text/responses-candidate.ts` | `b598179b5a8389e9573444d57be5529cc08063eb8dfa2ccd0461c32143acf4c1` |
| `src/server/text/responses-transport.ts` | `bb8f97d27d300e918e849bf9af87d9eeda19e68a14432b88952443c05b27657a` |
| `scripts/responses-eval.ts` | `968cc7c286770fd904b8cb264fe49898c8083790353247ffb080fb5d6252bf0c` |
| `scripts/lib/responses-evaluation.ts` | `49040d88c04e7a5d34d6821a0d13bf7caf22c4478a6e577c5a8c95746eb6dbb1` |
| `tests/unit/responses-candidate.test.ts` | `f89db423d5c79dc8594a3c54b86cbd3fd05d8362f48401835f96c9c697af61b6` |

The final eight-file hash manifest, including all three handoff documents, is `artifacts/local/03f-responses/changed-files.sha256.json` (documents cannot embed their own stable digest). `git diff --check` passes. All557 protected inputs beyond the two updated tracked handoffs remain unchanged, including runtime entry points, PROVIDER_TEXT_POLICY, voice/PDF code and lockfile. Twenty-four byte-identical manifests independently cover both context variants, voice and PDF/text paths, two run IDs and two wire sizes. New candidate code is absent from13 browser chunks and20 production traces and has no route caller.

| Acceptance criterion | Result / evidence |
|---|---|
| Isolated reusable server-only pinned Responses candidate | PASS: two modules, explicit DTO/key/transport, exact live request/envelope policy; no public wiring. |
| Full canonical source/locators, no fabricated reference promotion | PASS:428 independent XML comparisons, frozen source; synthetic empty/order/fractional/isolation tests;59 canonical occurrences. Semantics remains separate. |
| Strict bounded statements/classification, useful answer independent of reference failure | PASS: schema and server validation; missing/unknown/mixed/empty references preserve readable statements unconfirmed. |
| Explicit terminal/cancel/late-result behavior, no retries | PASS offline38 tests; live only completed path observed. |
| Frozen reproducible four-case evaluation and bounded spend | PASS execution: hashes, exact prior questions, fixed DOI case, four calls, CLOSED ledger. |
| Complete semantic support in both summaries / Princeton / absent fact | **FAIL / PASS / PASS**: both summaries fail complete compound/antecedent support; all seven statements/clause assessments retained. |
| Required offline checks / build / unchanged voice and PDF | PASS as recorded; no browser, physical phone/audio, owned lifecycle or deployed proof claimed. |

No server/browser processes, database rows, source imports, provider-managed conversations or background jobs were created. Test/check/live child processes exited; no task process remains to kill. Existing source/evidence/shared data were not deleted. SIGINT listeners/timers/readers are cleaned by the harness/candidate/transport; injected late-resolution/rejection tests cannot revive output. Private environment-file hashes match before/after live, and no private file exists in the isolated checkout. Raw public-source evidence, frozen inputs and logs remain ignored for PM review.

**Handoff: READY_FOR_REVIEW; 03F remains IN_PROGRESS.** No additional provider spend is authorized by this report. PM should review the implementation and the precise failed semantic gate before deciding further work. Owned text lifecycle/expiry/Stop/SSE integration, streaming UX, actual UI, deployed/physical-device/voice checks are NOT_RUN for this candidate and require a separately assigned task. A candidate success would still have been scoped evidence only; this evaluation did not achieve that four-case success.
