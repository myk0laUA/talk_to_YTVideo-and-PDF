# 03F controlled composition diagnosis

21 October 2026, Toronto. **READY_FOR_REVIEW** for the completed diagnostic; both summary semantic gates **FAIL**. Full 03F and original Steps 03/07/10 remain **IN_PROGRESS**. No integration, deployment or further fix is assigned by this result.

The existing composer failed even with sufficient, independently reviewed central-summary support supplied within the existing catalog limits. This establishes a composition/reference failure in this control; it does **not** establish selection as the sole limiting stage. No prompt, selector, model, schema, cap or transport was changed to obtain another answer.

## Identity and change boundary

Arrival was clean `main`, HEAD `334e7e2ffd06f90771132685ba4dfd31d03e409e`. Delivery is a dirty working tree with no commit or deployment. The existing root build ID `R_ixIZMDu1UXwpkBpA8ws` is unchanged and is **not** a new build of this delivery. No app rebuild was performed for this isolated diagnostic.

Only `src/server/text/responses-passages.ts` changes tracked TypeScript: extract the existing composition preparation into pure `preparePassageComposition`, call that same function from the existing lifecycle, and export the existing `compositionStatements` parser unchanged. The ignored harness uses those functions, the actual `resolveCatalogSelection`, `executeResponseStage` and `createResponsesTransport`. There is no second composer, fixture selector in application code, public route or new fallback. Human-selected IDs exist only in test evidence. Other delivery files are this report, `PROJECT_STATE.md` and `TESTING.md`.

Before editing, an offline replay captured existing requests and parsed results. After refactoring, all four captured catalog composition requests remain byte-identical, including the original question/history/schema and unavailable case; their parsed answers/statements/references are unchanged. A fifth preparation/parser replay checks the manually selected evidence with the original DOI question as an additional input variation; it is not a live summary result. The actual live control uses the original summary question below. `parity.json` records all five checks. Existing catalog baseline outputs were read/replayed, never regenerated.

The final audit checks 574 protected tracked files, 106 prior catalog/passage/Responses JSON artifacts, private-file integrity and the root build identity. Routes, production policy, dependencies/lockfile, voice/PDF configuration and public flags are unchanged. Source import/acquisition, DB, browser, hosted and physical-phone/audio checks are outside this task and were not run.

## Evidence reviewed before calls

Ignored evidence root: `artifacts/local/03f-composition-control/`. `reviewed-evidence-map.json` contains the preregistered required ideas, exact original Albanian supporting captions, block IDs and antecedent assessments. `selected-evidence.json` preserves all supplied block fields and constituent captions. This is implementation-worker review independent of model selection/output, not external human or PM approval.

All 428 saved `sq` captions were read, along with the original four-case scoring and both catalog summary failures. A new independent Python XML parse exactly equals every saved ID, order, text, fractional start and duration, and reconstructs the full text without normalization. XML SHA256 is `42a9d221fc19431642651beeaa0848400b5d5424461562d1fc99602ad68b541d`; fullText SHA256 remains `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`.

The fixed selection has **7 actual current blocks / 80 original captions**, all at most 12 captions/120 seconds. Existing limits remain 8 blocks/96 captions and at most 3 references per statement.

|Original range|Actual opaque block ID|Captions / seconds|
|---|---|---:|
|145–156|`block_3cb75252303a47e9ea4f0461d19e81011dab953e92d24771847f9b38a03c2ad8`|12 / 39.254|
|157–168|`block_871830fe4fd3ec35d5b27b1b71a435ef0368fd54b65adfd4d6e8d47f087f1fca`|12 / 39.997|
|193–204|`block_ee8cda8ab71422b507709ed46a8816b9c65ce4af8e132fb7c09e55eb9ad52ee5`|12 / 35.846|
|313–324|`block_e3780720399613d125f2933cae33b5f7c57cf1eb4d1fb4d1aa75d48045e12d97`|12 / 33.305|
|397–408|`block_b7a3f5b568b9eb153f91bf5a959a15f322678902bad96f1f6167842ed7716099`|12 / 34.206|
|409–420|`block_a1f198bd1a8b5538e35832e75b07580d8c5a87eb1a2adf25c5043f55857341a8`|12 / 36.703|
|421–428|`block_84fd59e844f4fd347489b0df1582b31c882d249aa07d96c3688939771f88d268`|8 / 20.393|

These numeric ranges are review labels, not additional IDs sent to the model. Exact original passages, including punctuation/entities, are in the frozen map; the following table explains support rather than supplying an expected answer to the prompt.

|Required idea|Original support reviewed before calls|Complete support within reference cap|
|---|---|---|
|Central body/mind/behavior/outcomes chain|315–317; 316: “që trupi jonë ndryshon mendjen tonë, / dhe mendja sjelljen tonë,”; 317 continues “e sjellja rezultatin”|One block,313–324; explicit subjects/chain.|
|Acting powerful/own feelings; meaning of mind|150–154 gives acting/feeling-powerful relationship;156–162 gives body/mind question and thoughts/feelings definition.|145–156 plus157–168; at most two blocks.|
|Named two-minute poses|197–202 introduces the minimal intervention and lab experiment;201 “dhe këta njerëz bënë, për dy minuta,”;202 names powerful/powerless positions.|193–204 contains duration, participants and named poses. No hormone quantities/gambling results required.|
|Practice before stress|405–407 small changes/two minutes;408 “Pra se të vlerësoheni në një situatë / stresuese,”;409–410 specifies two minutes/locations;417 explicitly names posing.|397–408 plus409–420 supplies the condition and named-practice antecedent together.|
|Concluding internalization/small changes|401–403 says become/internalize it;404–407 introduces small changes leading to big changes and two minutes.|397–408. No need to summarize the partly selected student story.|
|Sharing/simple/private practice and beneficiaries|417 names posing;418 simplicity;420 sharing;421–423 people without technology/status/power;424–426 privacy/body/two minutes/possible life change.|409–420 plus421–428, addressing the baseline missing417–420 antecedent.|

**Required support in supplied selection: SUFFICIENT**, recorded before generation. Mechanical blocks can contain unrelated fragments; that does not authorize optional unsupported role-change or story details. Required ideas can be expressed with at most three actual references per statement. No scientific detail or expected answer was added to composition instructions. The evidence map/scoring is not model prompt content.

## Freeze and live procedure

The original question, used identically twice:

> In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.

Both calls have fresh context, empty history, only the same selected canonical evidence and question, no selection generation, no provider conversation/previous-response ID, `store=false`. The unchanged pinned policy is `gpt-5.4-mini-2026-03-17`, medium reasoning, strict `atomic_passage_statements_v1`, 4096 output tokens, 128000 input cap, no tools, buffered output, default service tier and truncation disabled. The actual response envelopes confirm snapshot/medium/store=false/previous_response_id=null. Cached input on the second call is not conversational history.

`freeze.json` was written at **2026-10-22T03:10:19.511Z**, before generation began at03:10:27.295Z. It freezes 28 code/source/evidence/scoring/documentation inputs, plus the request identity and original evaluation contract. The complete execution03:10:26.376–03:10:36.621UTC is21October in Toronto. No frozen executable, prompt, schema, selection or scoring changes followed the calls; no resampling, repair or judge was used.

|Identity|SHA256|
|---|---|
|Freeze file|`327eab63ca6f6d688311cde3260cb6806a081a53b77f3cbc90b5606cfc6de624`|
|Actual serialized composition request|`2e922e5fae829dd7ba3361255907a5258d2c4125e061a02717aea2c2f6607197`|
|Prepared-request evidence file|`21467dad8dd5ca3e5ceb1278998fd734f190f64ee9880c8ac4fb3fa180fb3b2a`|
|Selection evidence file|`93c62c1bd12370b73fca7978b264f1bc77870a9e86878396b44ecd6586c776ca`|
|Reviewed evidence map|`44e583986e92f8865eb6b07515662762784d4d847aa2f9817b3486011bd6ea74`|

The freeze, raw responses, exact request/token files and results remain intact. `final-frozen-hashes.json` identifies both complete outputs and ledger; `changed-files.sha256.json` identifies the final four-file delivery. Before/after parity evidence and prior baseline artifacts are retained.

## Complete answers and per-claim assessment

Original scoring is unchanged: under100words, attributed claims, central message including body/mind/behavior/outcomes and small changes/practice before stress, complete support for every material assertion and antecedent **inside its own cited blocks**. A selected but uncited block does not support a statement. `per-claim-evaluation.json` enumerates every material clause, exact cited original text, missing support and whether missing original captions were supplied elsewhere. Those diagnostic IDs were never added to citations.

**Control1 — 53 words**, verbatim displayed answer:

> The speaker says the body can change the mind, and that even small changes in role or posture can shape how people feel.
>
> The speaker urges people to do two minutes of power posing before stressful situations, saying it can raise testosterone, lower cortisol, and may help people without tech, status, or power.

|Statement / actual cited ranges|Material assertions|Assessment|
|---|---|---|
|1 /157–168,193–204,397–408|Body changes mind.|PARTIAL:157 asks the question,160 defines mind and197–202 gives a posture/feeling intervention. The clear affirmative316 was supplied but not cited.|
|1 /same|Small role changes shape feelings.|FAIL:193 says “this role change”; its particular role/subject in186–190 is absent even from the supplied selection. This optional detail was unnecessary for the required central summary.|
|1 /same|Small posture changes affect feelings.|PASS for the narrow claim:197–202 names the intervention/duration/powerful or powerless posture and feeling powerful.|
|2 /409–420,421–428|Two minutes of power posing.|PARTIAL:409/425 duration and417 posing are cited; the powerful/powerless qualifier201–202 was supplied in193–204 but not cited here.|
|2 /same|Before stressful situations.|FAIL:408 is the explicit before-stress condition, supplied in397–408 but omitted from this statement's citations.409 begins mid-instruction.|
|2 /same|Raise testosterone/lower cortisol.|PASS as attributed source reporting:413 explicitly states both;417 supplies posing within the same block. No independent scientific validation claimed.|
|2 /same|May help people without technology/status/power.|PASS:417–420 plus421–426 provides the missing practice antecedent and beneficiary/outcome context together.|

Protocol/schema/ID membership PASS. Attribution and length PASS. Correct evidence for every assertion **FAIL**. Central-message coverage **FAIL**: body/mind/feelings and before-stress advice appear, but the behavior→outcomes chain316–317 is omitted; the full small-change/internalization conclusion is not conveyed. Overall summary semantic gate **FAIL**.

**Control2 — 36 words including the displayed inference label**, verbatim:

> Inference: The speaker’s central message is that body posture can change the mind, and that even brief two-minute “power poses” can make people feel more powerful, improve how they face stress, and may change their lives.

The model classified its single statement `inference`, with this exact basis:

> The speaker says the body changes the mind, describes two-minute power poses in a lab experiment, and urges people to use them before stressful situations because small changes can lead to big changes.

Actual reference array: two valid IDs for145–156 and157–168, then this **one 128-character JSON string**:

```text
block_ee8cda8ab71422b507709ed46a8816b9c65ce4af8e132fb7c09e55eb9ad52ee5','block_b7a3f5b568b9eb153f91bf5a959a15f322678902bad96f1f6
```

It combines separator characters and a truncated second ID inside a single schema-valid string. It is not either actual block ID. The unchanged parser preserves it as **unconfirmed**, with two source-matched references; no splitting or repair occurred. This is valid JSON/schema, not a JSON parse failure, and the array still has only three items.

|Material assertion|Support from its actual references|Assessment|
|---|---|---|
|Body posture can change mind.|Valid145–156 supports acting/feeling-powerful and157–168 mind/feelings terminology.|PASS as the explicitly labelled narrow inference.|
|Brief two-minute power poses make people feel powerful.|Acting/feeling-powerful150–154 is in a valid block; two-minute named poses197–202 is supplied but not validly cited.|FAIL for the compound assertion.|
|Improve facing stress.|408–416 is supplied but neither relevant block is validly cited.|FAIL.|
|May change lives.|426 is supplied but421–428 is uncited.|FAIL.|
|Inference basis: two-minute lab experiment and before-stress recommendation.|200–202 and408–410 are supplied but outside both valid references.|FAIL; basis text is not another evidence channel.|

Protocol/schema, attribution, inference label/basis presence and length PASS. Membership **FAIL**; correct cited support **FAIL**. Central coverage **FAIL**: behavior→outcomes is omitted and before-stress advice appears only in the unsupported basis, not the displayed answer. The full internalization/small-change conclusion is also omitted. Overall summary semantic gate **FAIL**.

These distinguish three independent judgments: **required support was present in the selection**, **each output failed correct cited support**, and **each output failed complete central coverage**. The first failure does not depend on the more debatable breadth of its body→mind clause: the missing role antecedent and408citation are concrete failures. The second has an unresolvable reference as well as uncited stress/life-change claims. No evidence was appended after observing either output.

## Tokens, latency and closed allowance

[Official model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini) was freshly fetched before generation, confirming the exact snapshot and standard per-million-token rates: input$0.75, cached input$0.075, output$4.50. Local Markdown snapshots and `rates-verified.json` preserve verification. The existing transport uses the [official input-token counting endpoint](https://developers.openai.com/api/docs/guides/token-counting) with instructions, evidence/question, reasoning, tools and strict text schema. No guessed tokenizer/schema omission.

|Control|Official count / reported input|Output (includes reasoning)|Reasoning|Cached input|Counter ms|Generation ms|Buffered readable ms|
|---|---:|---:|---:|---:|---:|---:|---:|
|1|7461 /7461|641|321|0|898.28|4544.98|5451.76|
|2|7461 /7461|601|327|7296|208.02|4553.38|4764.12|

Both requests and counts are identical; full returned usage is retained. Totals14922input/1242output, including648reasoning and7296cached input. These are local buffered provider diagnostics including counting/evidence writes, not app streaming/phone/audio latency.

**NEW ledger CLOSED:**2/2generation calls,2 separately disclosed non-generation counting requests,0selection calls,0retries/repair/judges/new acquisitions. Each generation was reserved$0.115 beforehand; worst-case128000input/4096output costs$0.114432 at verified rates. Total reservation$0.230 within$0.25. Usage-priced estimate **$0.0167805** without cache discount, **$0.0118557** using reported cache. Actual billing remains **UNKNOWN**, absent invoice evidence. Previous eight-call allowance remains closed and unchanged. No further generation is authorized by this result.

## Verification and acceptance mapping

Pinned Node24.22.0 and npm11.19.1 were used for every actual check/live runner. Absolute executables: `.tools/node-v24.22.0-win-x64/node.exe` and that directory's `node_modules/npm/bin/npm-cli.js`; `checks.mjs` asserts both versions. Initial system discovery26.5.0/12.0.1 was not used for checks. Dependencies/lockfile were preserved; no installation was needed.

`checks.mjs` creates a task-owned `.env`-free offline checkout, uses blank keys/unusable DB/false synthetic flags and the existing network-denial preload. These offline flags do not modify root or deployed configuration. The following commands use `node`/`npm` as those pinned executables. `commands.jsonl` records absolute executable, full argv, cwd, UTC start/end, exit and corresponding log; the independent Python argv/env/exit is in `source-preservation.json`.

|Command / check|Local context and observed result|Exit|
|---|---|---:|
|`node --conditions=react-server --test tests/unit/responses-catalog.test.ts tests/unit/responses-passages.test.ts tests/unit/responses-candidate.test.ts`|Offline isolated fake transports/network denial;140/140PASS, including shared cancellation/terminal/bounds/parser paths.|0|
|`npm run lint`|Offline isolated checkout;PASS,0warnings.|0|
|`npm run typecheck`|Offline isolated checkout;Prisma generation/Next type generation/TypeScriptPASS, no DB connection.|0|
|`node --conditions=react-server artifacts/local/03f-composition-control/baseline.mjs` then `parity.mjs`|Five pre/post request/parser comparisons; four exactly equal original captured live requests. No model/network call.|0 final /0|
|`node --conditions=react-server artifacts/local/03f-composition-control/evidence-map.mjs`|Independent XML equality, all428/fullText hash,7blocks/80captions, required ideas≤3references; prereviewed map.|0 final|
|`node --conditions=react-server artifacts/local/03f-composition-control/official.mjs`|Fresh official documentation/snapshot/rates and reservation bounds verified.|0|
|`node --conditions=react-server artifacts/local/03f-composition-control/control.mjs --prepare`|Freeze once;zero generation/counter requests.|0|
|Same harness `--live`|One opt-in execution, exactly2generations/2counters;both complete. Execution success is not semantic acceptance.|0;semanticFAIL|
|`node --conditions=react-server artifacts/local/03f-composition-control/evaluate.mjs`|Raw/value equality, exact input counts, fresh-context/policy checks, frozen-input integrity, per-claim judgments, usage/output hashes and cleanup records.|0;semanticFAIL|
|`node --conditions=react-server artifacts/local/03f-composition-control/audit.mjs`;`git diff --check`|Protected/prior/private/build/freeze integrity;final delivery hashes;diff whitespacePASS.|0|
|Build/full-suite/DB/acquisition/UI/hosted/device/audio|Outside required narrow checks;no app rebuild or acceptance inferred.|NOT_RUN|

Two diagnostic setup failures were corrected **before freeze**, with failed logs retained: baseline helper initially resolved an import one directory too high (exit1, before capture/network); Python pipe initially emitted Windows-encoded text into a UTF-8 reader (equality exit1), fixed with explicit `PYTHONIOENCODING=utf-8`. The successful rerun compares original text exactly; neither failure made a provider request. There were no failed candidate/lint/typecheck checks or paid retries.

The task's bounded-harness/reuse/parity criteria map to `control.mjs`, `parity.json` and140focused checks. Prereviewed completeness/bounds/source criteria map to the frozen evidence map/catalog/independent XML. Freeze/identical-context/spending criteria map to freeze/request identities, both raw outputs/token counts and the exclusive CLOSED ledger. Claim/central-message criteria map to the complete answers and per-claim assessment above; both FAIL. Preservation/cleanup criteria map to audit, final hashes and cleanup records.

All task child processes exited. No server, browser, source import, DB row, background job or provider-managed conversation was created; no shared data was deleted. Private files remain unchanged and were not copied to the offline checkout or printed. Ignored evidence is intentionally retained for PM review. Public voice remains enabled and public YouTube disabled, unchanged. Return **READY_FOR_REVIEW**, stop; full03F remains incomplete.
