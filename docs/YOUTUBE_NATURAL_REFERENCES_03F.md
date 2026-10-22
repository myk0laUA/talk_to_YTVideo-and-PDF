# 03F Route A — natural answers and stored source references

**READY_FOR_REVIEW — implemented offline; bounded live semantic gate FAIL.** 21 October 2026 Toronto (command timestamps below are22OctoberUTC). Natural summary/follow-up answers now remain independently readable, and four live references resolved deterministically to original stored captions. Their associated semantic support fails: the summary selected insufficient passages, and the factual follow-up again selected354instead of355. This is not grounded citation acceptance or deployment approval.03F and original Steps03/07/10 remain IN_PROGRESS/open. No further sampling, prompt change, parser repair, migration or later task was started after the pair.

## Identity and changes

Clean arrival `main`, HEAD `e7c86a3f927e6da5e9138db7690e03106ad17d7c`; dirty delivery, no commit/push/deployment. Normal uninstrumented production build **`nM0j1bWNJgirIaU5aRck2`**, built/tested in ignored `artifacts/local/03f-route-a/offline-checkout/` without private env files. Pinned Node24.22.0/npm11.19.1. Product code was unchanged between that build and the live pair. Final input comparison, changed-file hashes and cleanup are retained in `artifacts/local/03f-route-a/audit.json`, `identity.json`, `changed-file-hashes.json` and `cleanup.json`.

| Changed module | Result |
|---|---|
| `src/server/text/youtube-evidence.ts` | Removed obsolete claim-JSON scanner/quote matching/display replacement. Optional exact marker lookup attaches bounded original caption references without modifying `part.text`. Resolver exceptions preserve text with explicit unconfirmed/incomplete status. |
| `src/shared/youtube-evidence.ts` | Annotation offsets preserve marker-group associations in the original answer; pending/source_matched/unconfirmed/incomplete states describe source membership, not semantic truth. Reasons distinguish missing/malformed/unknown/long/invalid/bounded annotations. |
| `src/shared/priming-manifest.ts` | Conditional YouTube-text/B `youtube-text-natural-references-v4` instructions request concise attributed natural prose and optional exact inline IDs. Source/manifest/instruction admission remains exact; no stale v3 or competing production JSON parser. |
| `src/app/transcript-view.tsx` | Always renders answer text as plain React text. References and aggregated notices render separately. Details identify original marker IDs and stored times, and explicitly ask the visitor to check whether the excerpt supports the statement. No verified-answer label or model-URL linkification. |

Updated six test files: unit evidence/format/owned-text/HTTP-controller and transcript-view harness/spec. `registry.ts`, shared transcript store, HttpTextController production retention, socket, ownership/expiry, policy/caps, preview/storage/schema/dependencies remain unchanged. Existing pending→incomplete Stop retention works with the new DTO. All24voice/PDF manifest comparisons remain byte-identical to HEAD; no voice/acoustic or PDF format change.

## Implemented invariants and limits

- Every bounded received answer character remains in the transcript through actual store deltas, registry stream/snapshots, client retention, Stop and plain rendering. Whitespace, Unicode, escaped strings, HTML-looking content and model URLs are preserved as inert text. Annotation failures and limits never replace it. Captured malformed summary replay preserves both raw claims, **as literal malformed JSON**, not as a new natural or grounded answer.
- Only exact bracket markers such as `[segment-355]` are recognized, using the selected session's checked source snapshot. Maximal adjacent whitespace-separated markers form one group; punctuation starts another. No inferred claim boundaries or semantic associations are manufactured. Unknown/malformed markers remain unconfirmed; no neighboring-ID, quote, timestamp or URL repair. Original marker positions remain in the answer and annotation offsets.
- At most8groups/3markers per group and240characters per whole caption; the existing transcript16000-character bound remains authoritative. Over-limit annotations produce a notice without reducing answer text. Long captions are unconfirmed, never clipped into purported support. Duplicate marker occurrences retain their associations within those bounds; display is not globally deduplicated.
- Full original caption text, fractional stored time and URL built from validated stored video ID are the only trusted reference fields. Same IDs in sourceA/B resolve only against the current snapshot. A source-matched excerpt means membership only; a wrong existing ID deliberately matches membership and must fail separate semantic evaluation.
- References remain pending during generation, including when a complete marker has arrived. Only matching successful terminal output finalizes them. Stop/failure/cancellation/timeout leaves in-flight annotations incomplete without references; existing source/run/item/response and invalidation gates reject late work. Already completed owned turns can retain their references on Stop. Registry final snapshot/source-disposal ordering is unchanged.

Remaining limitation: ordinary bracketed text can conservatively produce an unconfirmed annotation, and optional markers may be omitted or wrongly selected. Code cannot detect unsupported material statements merely because some other marker matches. Full-source grounding still requires human claim-to-passage review; no automatic entailment test or additional model verifier was added.

## Offline verification

All checks were local Windows, pinned runtime, isolated checkout with blank real provider keys, unusable loopback DB and external-network-denying preload. Browser suites retain their explicit synthetic storage/transports/media and network guards. No private `.env` was copied. The existing Playwright CLI skill was used for live UI operations; React guidance and bounded Impeccable clarify/harden were applied only to annotation display. Desktop/phone viewport screenshots were visually reviewed together; these are Chromium emulation, not physical-phone/audio evidence.

Exact argv, cwd, UTC start/end/exits and log filenames: `artifacts/local/03f-route-a/commands.jsonl`. Commands below use `.tools/node-v24.22.0-win-x64/node.exe` and its adjacent `node_modules/npm/bin/npm-cli.js` through the ignored `verify.mjs` runner.

| Command / procedure | UTC22October / exit | Observed |
|---|---|---|
| `node artifacts/local/03f-route-a/verify.mjs focused lint typecheck` |00:01:08–00:01:56 |Focused265/265PASS, lint0; first typecheck2 on a new test fixture's missing snapshot fields/string generation type. Corrected the authored fixture to use the actual empty store snapshot and typed generation union. Failure log retained. |
| `npm run typecheck` |00:02:17–00:02:22 /0 |PASS after fixture correction. |
| `npm run test` |00:02:22–00:02:29 /0 |1684/1684PASS, no skips. |
| `npm run build` |00:02:29–00:02:41 /0 |Normal build `nM0j1bWNJgirIaU5aRck2`; no answer observer/instrumentation. |
| `npm run test:owned-text` |00:02:41–00:02:59 /0 |417built HTTP/browser checksPASS. |
| `npm run test:transcript-view` |00:02:59–00:03:19 /0 |40/40PASS across four viewports; literal text, separate notices/references, inert HTML/model URLs, layout/reading behavior. |
| `npm run test:text-session` |00:03:19–00:04:08 /0 |108/108PASS, synthetic no-microphone lifecycle. |
| `npm run test:mode-switch` |00:04:08–00:05:20 /0 |156/156PASS. |
| `npm run test:owned-voice` |00:05:20–00:05:41 /0 |125unit +392built checksPASS. |
| `npm run test:voice-adapter` |00:05:41–00:06:17 /0 |113unit +571built checks/48scenariosPASS. |
| `node --conditions=react-server artifacts/local/03f-route-a/preserve.mjs` |helper timestamp in preservation.json /0 |24voice/PDF manifest comparisons unchanged; all428sections/locators reconstruct losslessly in7text items/431fragments,107595wire bytes,16384maximum event bytes. |
| `node --conditions=react-server artifacts/local/03f-route-a/prepare.mjs` |helper timestamp in captured-replay.json /0 |Both exact retained final assistant parts preserved by the new projection, including the formerly hidden summary claim. Proposed live questions/passages recorded and both response estimates reserved before setup. |
| `npm run lint` final rerun |00:10:52–00:11:59 /0 |PASS after authored test typing correction; no product changes after build/live. |
| `node artifacts/local/03f-route-a/audit.mjs` |00:12:19–00:12:21 /0; final rerun recorded separately |241current product/test/script inputs match the normal build copy;13delivery hashes,150release chunks without answer observer; private env/no-copy/process/port/owned cleanup PASS. Final audit also checks every retained preview heading/duration against stored sections. |

Focused argv includes evidence/format, YouTube-text-citations, caption packing, setup timing, socket pacing, priming, text lifecycle and owned-text; full unit suite additionally covers admission/transcript/HTTP-controller/expiry/replacement. Authored coverage tests every delta split, partial/malformed/absent/duplicate/excess markers, original Unicode/whitespace, hostile source/model URLs, long captions, same ID across snapshots, exception fallback and stopped/late events. The unrelated-caption test explicitly demonstrates membership without pretending to automate semantics.

Final lint rerun after the test typing correction and final audit commands/exits are in the command ledger; no production code changed after the successful build. Read-only Windows glob searches that returned invalid/missing paths were corrected with explicit paths/rg filters; they did not change product files. No fresh hosted, real voice, microphone, phone or full deployment test was run.

## Bounded live pair — real local UI/storage/provider

Normal production build above, loopback `http://127.0.0.1:3133`, fresh anonymous owned visitor, real PostgreSQL, direct uncached public `Ks-_Mh1QhMc` captions and existing Realtime text model. Private env values were supplied only to the task child; no file copy, key print, provider-event or credential capture. Existing task-only caption observer cloned only public YouTube responses for XML fidelity; no production source/build patch, debugger, per-token output logging or model-traffic interception. Voice/proofs/managed captions were disabled only in this local child. Public voice enabled/YouTube disabled deployment remains unchanged and was not queried.

One actual acquisition:201, **sq /428sections /18,822characters /3292words**. Fresh XML→owned storage→every preview text/time/duration and fullText equality PASS; SHA256 `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`. Upstream evidence has one watch/player/timedtext chain, all200/no-store; one caption XML. The initial anonymous import POST401/cookie bootstrap preceded201; it was not a second extraction. Expected post-delete GET404 is also recorded in browser console.

| Observation | Actual / decision |
|---|---|
| Source readiness |4080ms browser observation. Full source acknowledged before summary; no readiness/source truncation regression. |
| Summary |Completed,125output tokens;1835ms response observation. Concise attributed natural prose, fully visible and retained. Three references41/145/161at145.458/445.073/495.033seconds exactly match stored captions. **Availability/membership/field determinism PASS; semantic support FAIL.** |
| Summary claim1: posture affects external judgments and internal feelings |Broad source theme exists, but41is a downstream example of social judgments,145is an evidence-exists statement without its antecedent,161a fragment about psychology. These excerpts do not fully support the compound claim. References are appended at the paragraph end, leaving individual claim association unclear. FAIL. |
| Summary claim2: reported pose studies/risk/hormones and bidirectional psychology |Related speaker-reported study results occur elsewhere, notably225–238, with body/mind discussion nearby. The actual displayed41/145/161do not contain the results or complete argument. Scientific claims are attributed to the speaker rather than independently verified facts, but citation support FAIL. |
| Summary claim3: becoming credible through practice under stress |Later narrative/practice theme exists; expertise/credibility wording is interpretive. None of the displayed references supports that concluding assertion. FAIL; no omitted source reference inferred into the answer. |
| Princeton follow-up |Completed,93output tokens;1953ms observation including Stop. Readable and correctly attributed **20minutes/20people facts PASS**. Actual marker354resolves to a night-before introduction at1038.665seconds; the facts are355at1040.594seconds. **Semantic reference FAIL.** No ID repair or model/endpoint switch. |
| Every displayed reference |All4original excerpts, stored fractional timestamps and generated video URLs match current owned source exactly. This does not turn the wrong selections into supporting evidence. |
| Stop/source retention/removal |Both answers and all4turns remain byte-for-byte in UI text after Stop; full428-section preview retained. Own DELETE200/own GET404. Browser closed; exact server child61352/parent55656identity checked and force-stopped. Port/private-file checks retained in final audit. |

Exact bounded visible answers, rendered attachments/notices, all material claim reviews and fresh source passages remain ignored in `answer-checks.json`, `question-1.log`, `followup.log`, `source.json`, `source-preservation.json`, `cleanup-browser.json`, XML and screenshots under `artifacts/local/03f-route-a/`. No third-party raw text in committed tests/docs. `evaluate.mjs` exits0 for correctly checking/reporting this evidence; its **product semantic outcome is FAIL**, not a passing model evaluation.

## Ledger, cleanup and PM handoff

OpenAI Docs verified current [exact-model pricing](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini): text US$0.60input/$0.06cached/$2.40output per million tokens; official Markdown retained with hash/retrieval identity. Using128000uncached input +512output gives$0.0780288per response, rounded up to$0.079. **Both reservations total$0.158before setup**, within the new$0.16estimate allowance. Ledger CLOSED: **1session/2responses/1uncached direct acquisition**,218reported output tokens. Actual input/cached usage/billing UNKNOWN; UI output-token counts and estimates are not a billing statement or hard application spend cap. No retry or verifier call. Prior ledgers remain closed.

Final audit verifies current source/test/script inputs match the normal build copy, private `.env` unchanged/no private env copy, browser closure, exact process exit,3133rebind and changed-file hashes. Package/lockfile/policies/ownership/source/voice/PDF remain protected. Initial test typing failure is retained; all required final commands pass. No deployment, host administration, DB reset/cleanup, new service/dependency, phone request or later step.

**PM review requested:** accept/reject the scoped Route-A implementation and its failed live semantic evidence separately. Readability is restored and stored references are deterministic, but correct selection/associated support remains unresolved. Full03F is not complete or deployment-ready. Further work requires a new bounded PM assignment; this worker stops here.
