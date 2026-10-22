# 03F complete passages — worker handoff

21 October 2026, Toronto. **READY_FOR_REVIEW: implemented; live evaluation failed at the first selection.** The model returned ranges exceeding the fixed limits. Code rejected them before composition, and the harness stopped. One generation call was made; no answer was composed and cases2–4 are NOT_RUN. No retries, post-live executable changes, integration or further spending. Full03F and original Steps03/07/10 remain IN_PROGRESS; PM owns acceptance and the next decision.

## Identity and implementation

Clean arrival: `main`, HEAD **`9847b9c12fc7524f7bc36cdaeedc38c271bc4b00`**. Dirty delivery, no commit/push/deployment. Final task-owned local build **`8sIT-YES3OGwwZZBznKOy`**, built 01:54:01.335–01:54:19.475 UTC22October (21October Toronto). No root/deployed build is substituted for this identity.

| File | Behavior / reason |
|---|---|
| `src/server/text/responses-stage.ts` | Extracted the existing buffered envelope/usage/budget/terminal/cancellation handling into a shared server-only module. Pinned policy unchanged. Strict output-specific validation remains with each candidate. |
| `src/server/text/responses-candidate.ts` | Reuses shared stage execution; original full-source DTO validation, prompt, schema, statement/reference behavior retained. Exact old case1 request hash remains identical; all38 prior tests pass. |
| `src/server/text/responses-transport.ts` | Existing fixed-endpoint, bounded, no-retry transport now accepts a generic prepared stage for input counting; fetch behavior unchanged. |
| `src/server/text/responses-passages.ts` | Two-stage server-only candidate, strict schemas/prompts, exact ordered range resolution, opaque code-created passage IDs, atomic composition and whole-operation deadline/reservation orchestration. |
| `scripts/passages-eval.ts` | Explicit prepare/live harness, same saved questions/order/history recipe, source/freeze checks, both-stage reservation before each case, separate counters and generation ledger, stage-specific raw/request/result evidence. |
| `tests/unit/responses-passages.test.ts` |65 meaningful injected checks for selection, composition, source/history preservation, invalid evidence, bounds, cancellation, errors and late work. |
| This report; `PROJECT_STATE.md`; `TESTING.md` | Results, exact commands, failed selection and review handoff. |

Stage1 receives all ordered canonical captions, including empty entries and precise original locators. Stage2 receives **only** code-resolved selected passages, explicit selection availability, question and bounded conversational history. It does not see the whole source, and history is never evidence. Both requests use the same existing validated DTO/history path; no database or browser-selected authority is introduced. A future caller must enforce ownership/expiry and lifecycle independently.

Each selected range resolves by original array positions, never numeric-ID arithmetic. Bounds:8nonoverlapping passages, each≤24captions and≤120seconds including durations, with an additional preregistered≤96caption aggregate limit to prevent broad document citation. Unknown/reversed/overlapping/oversize ranges reject the entire selection; no sorting, padding, merging, clipping or post-answer expansion. `unavailable`/`insufficient_evidence` carries no passages and still proceeds to uncertainty composition in offline tests.

Opaque passage IDs are source/range-content hashes created by code. Canonical excerpts, passage time envelopes, video links and every constituent caption/ID/start/duration/link are code-produced. The passage link identifies its **range start**; precise facts use constituent locators. A matched passage means membership only: `semanticSupport` remains `not_evaluated`. Unknown/missing/mixed references preserve readable statements unconfirmed. Inferences require a basis and are labelled. No raw partial JSON is answer prose.

Both stages are reserved before counting/generation. One≤120second deadline covers reservation, both counters, provider calls and evidence callbacks; each generation also retains the existing≤60second stage deadline. Abort/timeout/error blocks subsequent work, including stage2 counting; late results/rejections cannot revive output. Stage-specific diagnostics identify reserve/select/compose, request hash, count, usage, elapsed time and safe failure category. No automatic retries, repair calls, tools or model judges.

## Freeze, source and exact live failure

Used OpenAI Docs guidance already loaded in this conversation; refreshed official [model/capabilities/pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [strict structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [token counting parameters](https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count). Snapshots retained as ignored `official-*.md`. Policy remains `gpt-5.4-mini-2026-03-17`, medium reasoning,4096total output per stage, storefalse/truncationdisabled/no tools/background/streaming/default tier. Returned policy matches. Standard input/output rates remain $0.75/$4.50 per million.

Independent Python ElementTree parse again matches **all428** saved acquisition XML captions against `03f-single-id/candidate/source.json`: sq, original order/IDs/text/fractional starts/durations and fullTextSHA256 **`b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`**. No new source acquisition, database import or language change. Real source has0empty captions; synthetic tests cover empty/Unicode/sparse/nonmonotonic entries.

Frozen **01:54:42.935UTC**, before generation at **01:54:52.586UTC**. `freeze.json` SHA256 **`d4c7ee8f9bdf2fd0b1ab2dd35d063250f07648036d157f32ed680bdf11e0e677`**. It includes code, both prompts/schemas, bounds, unchanged questions/scoring and source identities. Selection prompt/schema hashes: `14a042cdf9791a7a1409b78a49f7e99ac7a72c2e16e5c07c621b2c45697ece3b` / `d54a6ac3c5c3fbb0bfbe150b16a78b1f2283c1cff7b5abca583269c886a40741`; composition: `9a3b227d27ea2f8f7c917eeac61febb3b626461b9fe5c83903d1cd78e5c43422` / `6269bd4b60206fabda95a61c1479ae478503c10c4a858a9448437728e6c175d8`. All8frozen inputs match after live; no executable/schema/prompt/test edit followed it.

Same four questions/order from `scripts/lib/responses-evaluation.ts`:

1. “In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.”
2. “In the personal story later in the talk, how long was the annual Princeton talk, and how many people was it given to? Include supporting source references.”
3. Same summary question in fresh context.
4. “What is the exact publication DOI of the power-posing study discussed in this talk? Answer only if the source provides it, with supporting source references.”

Case2 would contain the exact new case1question/answer/statements/classification/basis/passage IDs as bounded history; other cases fresh. No case1answer exists, so that history was not fabricated. Prior live outputs are retained baseline evidence, never rerun.

**Exact case1stage1 output** (JSON structure PASS):

```json
{"availability":"selected","passages":[{"start_id":"segment-141","end_id":"segment-157"},{"start_id":"segment-200","end_id":"segment-245"},{"start_id":"segment-253","end_id":"segment-261"},{"start_id":"segment-401","end_id":"segment-426"}]}
```

Selection request SHA256 **`2a6a29a33e5a8b1f65413248de585d296adb297aeff767c8a597e4b841def11f`**. Whole case started01:54:52.123UTC and completed01:54:55.393UTC; total **3272.20ms**, including input counter/buffering/evidence/validation. Stage diagnostic3267.50ms. First readable answer latency **NOT_RUN**, because no answer was composed; this is not streaming/UI evidence.

| Requested original range | Captions | Time envelope / duration | Bound result / relevance |
|---|---:|---|---|
|141–157|17|433.706–488.744s /55.038s|Within bounds. Broad outward/self nonverbal thesis, evidence/examples and body/mind question; relevant summary material.|
|200–245|46|623.325–755.087s /131.762s|**FAIL both24caption and120second limits.** Full experiment/treatment/gambling/hormone sequence; detailed science exceeds the selected passage limit and is more than needed for a short central summary.|
|253–261|9|771.766–802.139s /30.373s|Within bounds. Evaluative situations/interview example, without the later actual high-power interview result.|
|401–426|26|1164.251–1242.289s /78.038s|**FAIL24caption limit.** Relevant becoming/practice/stress-preparation/sharing conclusion, but overbound.|

All endpoints exist and are ordered, with no overlaps. Nominal total **98/428captions (22.90%)**, also exceeding the frozen96aggregate limit. This does not cite most of the source, but it still fails individual and aggregate bounds. Runtime rejects at range2; the independent offline audit enumerates the additional failures without modifying the output. No subset was admitted, no opaque selected-passage result was returned, no second request or input count was created, and no range was shortened to make it fit.

The raw requested ranges nominally include prior missing treatment201/202, hormone referents231/233and236/237, confidence239–241, and posing/share417/418. They **do not** include interview-group298/299/301. These are retrospective worker diagnostics against the exact Stage1selection; they were not prompt hints and were never added to evidence. Because selection was rejected **before Stage2generation**, inclusion is not an admitted-support or semantic success claim. All constituent original captions/excerpts/locators are retained in `case-1-selection-audit.json` for independent review.

| Frozen case | Selection | Composition / per-claim evaluation |
|---|---|---|
|1summary|**FAIL invalid_passages**|NOT_RUN;0answer statements. Attribution/central-message/under100word/semantic support not assessable.|
|2Princeton|NOT_RUN|No preceding new answer for prescribed history; original355at1040.594s remains preserved source data, not a new factual success.|
|3repeat summary|NOT_RUN|Evaluation stopped on case1selection error; no resampling.|
|4absent DOI|NOT_RUN|No new missing-answer evidence. Prior candidate's DOI PASS remains historical only.|

All four frozen cases have explicit records, including `case-1-compose-not-run.json` and `case-{2,3,4}-not-run.json`. `per-claim-evaluation.json` records0new assertions and no invented semantic PASS. Actual stage1request/counter/raw/result are retained; absent stage2requests/results are marked absent, never reconstructed. **The remaining demonstrated failure is selecting bounded complete passages. Composition performance is unproven live.** Strict schema constrained fields, not valid range size or truth. No new architecture or further paid work followed this outcome.

## Spend and bounds

NEW allowance≤8generations/≤$1.00estimated, prior ledger closed. Both stages reserved before case1:2×$0.115 = **$0.230**; conservative per-stage bound `(128000×0.75 +4096×4.50)/1e6 = $0.114432`. Maximum four-case reservation would have been $0.920; it was not spent or reserved for unrun cases.

Actual: **1generation,1separate non-generation counter HTTP request,0retries**. Official count16989equals returned input16989, including exact full source/instructions/schema/question; no assumed tokenizer estimate. Returned334output tokens include254reasoning tokens,0cached input. Usage-priced estimate **$0.01424475**, not an invoice; **actual billing UNKNOWN**. No stage2count/usage/latency exists. Ledger CLOSED with$0.230reserved, one attempted generation; unused allowance is not permission to resume or rerun.

## Verification and reproducibility

All offline checks use pinned Node24.22.0/npm11.19.1 in a task-owned `.env`-free checkout at `artifacts/local/03f-passages/offline-checkout`, blank real credentials, unusable loopback DB, false test flags and existing network-denial preload. Source/transport tests use injected fake results; they are not real ownership/lifecycle/provider/phone proof. Permanent key loaded only by explicit live invocation through the existing helper, never printed/copied.

Actual commands use `.tools/node-v24.22.0-win-x64/node.exe`; npm is the bundled `node_modules/npm/bin/npm-cli.js` with pinned Node first on PATH. `commands.jsonl` records absolute child executable/argv/cwd/UTC start/end/exits and unique logs. Ordinary tests/imports are inert; no live call occurs without `--live`.

```powershell
.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server scripts/passages-eval.ts --prepare artifacts/local/03f-single-id/candidate/source.json artifacts/local/03f-passages/independent-xml.json artifacts/local/03f-passages/
.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server scripts/passages-eval.ts --live artifacts/local/03f-single-id/candidate/source.json artifacts/local/03f-passages/independent-xml.json artifacts/local/03f-passages/
```

Executed once through task-owned actions.mjs. Exclusive freeze and ledger files intentionally prevent repeating in the same directory; another directory grants no additional allowance.

| Exact child check | UTC22October start–end | Expected / observed / exit | Evidence in `artifacts/local/03f-passages/` |
|---|---|---|---|
|`node --conditions=react-server --test tests/unit/responses-passages.test.ts`|01:53:39.373–01:53:39.988|65/65PASS /0|`candidate-2026-10-22T01-53-39-373Z.log`|
|`npm run typecheck`|01:53:39.989–01:53:44.208|Strict compilationPASS /0|`typecheck-2026-10-22T01-53-39-989Z.log`|
|`npm run lint`|01:53:44.208–01:53:52.282|No warnings/errorsPASS /0|`lint-2026-10-22T01-53-44-208Z.log`|
|`node --conditions=react-server --test tests/unit/responses-candidate.test.ts tests/unit/context.test.ts tests/unit/youtube-evidence.test.ts tests/unit/youtube-evidence-format.test.ts tests/unit/youtube-text-citations.test.ts tests/unit/text-caption-packing.test.ts tests/unit/provider-admission.test.ts tests/unit/priming.test.ts`|01:53:52.284–01:53:54.140|321/321PASS /0, including prior38|`focused-2026-10-22T01-53-52-284Z.log`|
|`npm test`|01:53:54.143–01:54:01.334|1809/1809PASS, no skips /0|`test-2026-10-22T01-53-54-143Z.log`|
|`npm run build`|01:54:01.335–01:54:19.475|BuildPASS /0;8sIT-YES3OGwwZZBznKOy|`build-2026-10-22T01-54-01-335Z.log`|
|`python artifacts/local/03f-passages/parse_captions.py`|01:54:28.868–01:54:29.090|428independent XML comparisonsPASS /0|`source-preservation.json`, `independent-xml.json`|
|`node --conditions=react-server artifacts/local/03f-passages/preserve.mjs`|01:54:29.091–01:54:29.674|24voice/PDF manifest comparisonsPASS /0|`preservation.json`|
|Exact `--prepare` above|01:54:42.791–01:54:42.953|Frozen identitiesPASS /0;0API calls|`freeze.json`, prompts/schemas/source|
|Exact `--live` above|01:54:51.963–01:54:55.410|Runner0; candidateFAIL invalid_passages, safe halt|`ledger.json`, case1select request/tokens/raw, result|
|`node --conditions=react-server artifacts/local/03f-passages/evaluate.mjs`|01:56:35.850–01:56:35.936|Offline protocol/source/freeze/usage assertionsPASS /0; selectionFAIL|`case-1-selection-audit.json`, `per-claim-evaluation.json`, NOT_RUNrecords|
|`node --conditions=react-server artifacts/local/03f-passages/audit.mjs`|Before/after live; final timestamp in ledger|562protected tracked files,23prior frozen artifacts, request parity, build/client/privacy/diff checksPASS /0|`audit.json`, final9file SHA256manifest|

Tests cover valid selection/composition and uncertainty, exact ordered/Unicode/empty/sparse captions, no extra source in Stage2, all range/aggregate/time bounds, unknown/mixed references retaining answers, classification/inference/schema validation, source isolation, both counters' throw/over/mismatch paths, both stages' refusal/incomplete/malformed/provider/transport errors, abort at every callback boundary, one deadline not renewed between stages, noncooperating late resolve/reject, pre-abort and reservation denial. Live only exercised successful provider completion followed by invalid-range rejection.

Development failures retained: first lint01:49:35.188–01:50:50.272 exit1 on an unused test destructuring local; first typecheck01:52:02.409–01:52:43.431 exit2 on duplicate imported/local CandidateRequest after extraction. Both corrected before freeze. An initial inline local helper-preparation command had a shell-quoting SyntaxError/exit1 and was replaced by a saved helper; it made no provider call. Build's isolated nested-lockfile warning retained; no dependency/config change made to silence it.

## Hashes, acceptance and cleanup

| Changed executable file | SHA256, frozen and unchanged after live |
|---|---|
|`src/server/text/responses-candidate.ts`|`9004a10726a342b77ec8ad4683555de3ecf152bdda1fed18d667b062d4cec543`|
|`src/server/text/responses-transport.ts`|`54c89d54d3183a5690ed07f47a2ded28482614899defa60d298e75208c4a1797`|
|`src/server/text/responses-stage.ts`|`6fa57476e14de224e76cbe8b0682e605708409ca71eabd7a4d8b6332961e0e10`|
|`src/server/text/responses-passages.ts`|`13d7b5ec95758eeb79ca58d4773c4d9b2722824afb8b19404ea2fc5c3f2fc1ce`|
|`scripts/passages-eval.ts`|`4f4c14e298b14de553f0fbbda16a4168b08d0ab720938ed630154dee6bbd3a86`|
|`tests/unit/responses-passages.test.ts`|`4681dc04d4a3e7610dcf7fa7c0c72faba16b4189e611254b29febe1b52fc6672`|

Final nine-file hashes including all3handoffs are in `changed-files.sha256.json`; documents cannot embed their own stable hashes.562other tracked files unchanged, including original Responses report/questions/scoring/tests, runtime entry points, PROVIDER_TEXT_POLICY, voice/PDF code and package-lock.23old frozen source/request/output/ledger/prompt/schema/evaluation artifacts byte-identical; original case1request SHA256 `063c73eb7e399bda7b61b71611833d7133ee781aa4ab706990c2e55eee633483` still matches after shared-code extraction.24existing voice/PDF manifests byte-identical;13browser chunks/20production traces exclude the candidates. `git diff --check`PASS.

| Criterion | Acceptance evidence / limit |
|---|---|
|Two-stage isolated implementation, same pinned policy/transport/source validation|PASS offline65new/321affected checks; no public wiring.|
|Exact complete-range resolution, bounded rejection and opaque canonical evidence|PASS implementation/tests; live correctly rejects46/26caption ranges. Model selection itselfFAIL.|
|Atomic composition, readable answers independent of unresolved references, uncertainty|PASS injected tests; live compositionNOT_RUN.|
|Both-stage reservation, exact counters, cancellation/deadline/late suppression|PASS tests; live1counter/1generation, no compose counter after selection failure.|
|Same frozen evaluation, all cases retained, no retries/post-live edits|PASS audit/records; only case1attempted, others explicitNOT_RUN after terminal selection error.|
|Both summaries, Princeton20/20/precise355locator and absent DOI all semantically pass|NOT_MET. No new answer statements; capability gateFAIL before composition. Historical passes do not fill these cells.|
|Required checks/build and unchanged voice/PDF/runtime boundaries|PASS as recorded; no browser/phone/deployed proof.|

No task server/browser/background job, DB row/import, source acquisition or provider-managed conversation was created. Test/live child processes exited. Readers, timers and listeners are cleaned; ignored evidence and task-owned build are retained for review. Private environment-file hashes unchanged before/after live; none copied to the isolated checkout. No shared data or prior evidence deleted. Public voice enabled/YouTube disabled remain unchanged by this work.

**Return READY_FOR_REVIEW and stop.** No additional sampling, range repair or spend. PM can review the implemented safety/bounds and precise Stage1failure; no owned text/SSE/Stop integration is begun. Full03F remains IN_PROGRESS.
