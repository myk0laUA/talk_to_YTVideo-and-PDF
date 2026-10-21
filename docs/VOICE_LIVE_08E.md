# Task 08E — local WebRTC check and bounded compatibility correction

**Proposed READY_FOR_REVIEW for a partial outcome; live voice acceptance is BLOCKED.** Two allowed credential/session attempts reached the real SDP endpoint, but the application rejected its response MIME before applying the remote description. One narrow correction is implemented and verified offline. The two-session allowance is exhausted; no corrected live run or next task is authorized by this delivery. PM owns acceptance and sequencing. Original Steps 02/07/08 and other unmet gates remain open.

## Build and changes

Arrival: clean `main`, HEAD `9f1956fe5b31807276da7728bba11f3c37ec94e3`. Delivery is dirty/uncommitted; no commit, push, deployment, provisioning, private-file, schema, dependency or lockfile change.

Both live attempts used accepted build **oPnTtxqDDAJ354MEMqPB3** in the retained `artifacts/local/08d/offline-checkout`. All **114** relevant source/package/config/schema inputs matched the working repository before reuse. The root `.next` build was older and was not used. Corrected offline build: **eWWc14UbbAeK9tTjsF5oN**, retained separately in `artifacts/local/08e/offline-checkout`. All execution used **Node 24.22.0 / npm 11.19.1** from existing `.tools`; host-default Node 26/npm 12 was inspected only.

Changed files:

- `src/app/voice-browser-adapters.ts`: the bounded SDP response reader accepts `application/sdp` or `text/plain`, including charset parameters. JSON preparation/credential responses still require JSON. Success/no-redirect checks, 100,000-byte limit, abort/body cancellation, SDP version/audio/data-channel structure and native SDP parsing remain. Source fidelity, ownership, model/transcription settings, effective ACK checks and media ordering are unchanged.
- `tests/unit/voice-browser-adapters.test.ts`: six regressions cover both successful MIME types with full ACK/media/Stop invariants, and HTML, malformed plain text, oversized plain text and redirects failing before remote description/media.
- This report, `docs/PROJECT_STATE.md` and `docs/TESTING.md`: evidence and remaining gates; no step completion claim.

The new regression first failed only the plain-text success case (5/6 passed), reproducing the live mismatch. After the correction, all six passed. Existing adapter tests still cover JSON MIME rejection. The actual upstream body was unavailable to the passive response observer, so this report does not claim that it passed the SDP parser or that the correction resolves every provider compatibility issue.

Current official sources were searched and opened on 20 October 2026 UTC. The [OpenAI WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime) consumes the answer as text; it does not establish that an HTTP 201 means the native connection completed. The actual observed `text/plain; charset=utf-8` header, local fail-closed reader and reproduced regression establish this correction's cause. No model substitution or architecture change was made.

## Bounds, fixture and environment

Standing project test-credit authorization was applied within Task 08E's **US$1 estimated**, **two credential/session attempts**, **four response starts**, **120 seconds/session** limits. The second attempt addressed the concrete evidence gap after the first closed before channel events; it captured safe MIME and caught-exception categories. There were **two mint requests total, two SDP requests total, zero observed response starts and zero response.done events**. Neither attempt retried Start. No further live call occurred after diagnosis or correction.

The [exact mini model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) lists per-million-token prices: text input **$0.60**, cached text **$0.06**, text output **$2.40**; audio input **$10**, cached audio **$0.30**, audio output **$20**. The [Realtime cost section](https://developers.openai.com/api/docs/guides/voice-latency-cost?voice-api=realtime) describes accumulated context and approximately 10 input/20 output audio tokens per second. Preflight conservatively allowed four responses, each with 10,000 text input tokens, 5,000 audio input tokens including history/margin, and all 512 output tokens charged at the higher audio rate: **$0.26496**, plus **$0.30** extra margin. This is a preflight estimate, not provider enforcement or an actual bill. The actual small three-item manifest was 5,084 serialized bytes.

Durable ignored `artifacts/local/08e/allowance.json` is sealed **EXHAUSTED_SESSION_ALLOWANCE_NO_RERUN**. Original consumed ledger, attempt timestamps, preflight and usage record are preserved alongside it. Input/output/cached/reasoning/audio token counts, actual usage estimate, billed charges and cumulative project cost are **unavailable/null** because no response usage or billing evidence arrived. Prior recorded project estimate **$0.00810552** is historical only. Zero observed starts does **not** establish zero cost.

Each attempt used a fresh isolated Chromium profile and a normal fresh-visitor upload/read/remove through the real local built application, parser and existing PostgreSQL. The normal anonymous bootstrap produced an initial upload 401, followed by the successful upload 201; no source was seeded. Only process-local loopback origin, owned voice/PDF gates and existing PDF local-HTTP setting were enabled. The private environment files were read privately and their hashes remained unchanged. Caption/text/proof paths stayed off. No SQL, migration, reset or bulk cleanup ran.

The reused invented three-page PDF and predetermined two questions/expected facts are in ignored `fixture.json`. Both complete previews matched every authored page, including beginning/middle/end. PDF: **3,022 bytes**, SHA256 **a593fb961f3a9bfa7775df5433ba8443dc9df45ff05d3d47c3131433dd1be7e8**. Complete extracted-preview SHA256: **60a6d979eeff68b7aeada0061d0f912a0bec754fc486fd90ecde70577dee32d3**.

Windows `System.Speech` generated the synthetic WAV offline; no paid transcription/TTS was used. WAV: **18,359,038 bytes**, **48 kHz/16-bit/mono**, **191.2395 seconds**, SHA256 **43eaadac4a3fca007b71be26710f9584ea8f0a7a23a4a99c49023f5c7e889798**. Signal segments were approximately 5.1–10.6 and 51.5–60.4 seconds, with trailing silence beyond the session deadline to prevent looping. Native Chromium file-backed microphone flags were configured, but the application never reached microphone attachment. Neither synthetic speech question reached a live answer. Physical microphone permission, human speech/audibility and phone behavior are not established.

The temporary observer used CDP native-object discovery, passive event listeners and read-only native state/statistics. No native media/peer/channel function was replaced, no provider/SDP response was intercepted, and no protocol event or source/storage fixture was injected in either live attempt. The second attempt used immediate-resume caught-exception observation, which may affect timing; it is diagnostic evidence, not latency measurement. No raw SDP, credentials, headers/HAR, real microphone recording or audio deltas were saved. Safe synthetic fixture/screenshots and numeric/category evidence remain ignored.

## Live verification and acceptance mapping

| Criterion / procedure | Expected | Observed / status | Safe evidence under `artifacts/local/08e` |
| --- | --- | --- | --- |
| Build/config/fixture preflight | Matching accepted inputs, private prerequisites, bounded cost | **PASS**: 114 matching inputs; required settings present; authored PDF/audio verified offline | `baseline.json`, `preflight.json`, `observer-check.json` |
| Normal fresh upload/full preview | All three authored pages via parser/storage/UI | **PASS** twice; upload 201, owned GET 200, complete preview equality | `live-results.json`, `preview-before.{png,yml}`, corresponding `session-2/` files |
| Actual Voice UI, owned preparation/credential | Real authorized preparation and ephemeral mint | **PASS** twice: preparation 201 and credential 200/no-store | Both live result files, metadata only |
| SDP/native peer/channel | Applied remote answer and open native connection | **FAIL/BLOCKED**: SDP HTTP 201 twice; second header `text/plain; charset=utf-8`; local MIME rejection before remote description/open channel. One native peer/channel per attempt closed | Second `network`/`exceptionCategories`, both `afterStop` states |
| Full source ACK/effective final settings before media | Three source items, all effective ACKs before microphone | **NOT_RUN live**: no protocol events/ACKs or microphone sender; three-item manifest prepared. Offline corrected regression preserves full barrier | `session-2/live-results.json`; six focused regressions and full adapter results |
| VAD, question 1 beginning-section factual response | Source-grounded spoken answer and assistant text | **NOT_RUN**: no VAD/response/audio; answer judgment unavailable | Both empty `answers`, zero starts/done |
| Question 2 middle/end follow-up, no extra response | Second accurate answer after first | **NOT_RUN**: no question submitted through active media; no generated answer | Same; predetermined fixture stays ignored |
| Numeric usage and incoming audio | response.done usage/audio-token breakdown and native packets/duration | **UNAVAILABLE/NOT_RUN**: no usage, no incoming track, no usable RTP/audio duration evidence; no audible playback claim | `usage.json`, both native snapshots |
| Explicit Stop with retained assistant text/full preview | Stop closes resources and retains received content | **NOT_RUN for active-session Stop/retention**: app failed/closed first, Stop already disabled. Cleanup attempted Stop without retry; peer/channel closed, no sender track, audio paused/srcObject cleared, transcript empty | `failure.{png,yml}`, `afterStop` in both reports |
| Remove only newly uploaded test source/read denial | Normal UI DELETE and subsequent read denial | **PASS** twice: DELETE 200/no-store, read 404; normal empty-source UI | Both `removed` screenshots/result files |
| Fresh original/default process | Voice unavailable; three voice routes 503/no-store; no lingering resources | **PASS** after both attempts; corrected-build fresh secret-free process also PASS with zero peers/channels/audio and external requests | Both `defaultDisabled`; `corrected-default-disabled.{json,png,yml}` |
| Final preservation/process cleanup | Private files unchanged, processes exited, ports free | **PASS** as detailed in final `audit.json`; no deployment or public gate change | `audit.json`, changed-file hashes and command ledger |

Live command 1: **23:31:33.104–23:31:44.903 UTC**, exit **1**; credential request **23:31:38.302**, failure/Stop attempt **23:31:42.786**. Live command 2: **23:33:19.671–23:33:27.577 UTC**, exit **1**; credential request **23:33:23.624**, failure/Stop attempt **23:33:25.135**. Both stayed well inside 120 seconds. Actual credential acquisition occurred after the recorded request, making those elapsed bounds conservative. Commands were `node artifacts/local/08e/live.mjs` and `node artifacts/local/08e/live.mjs --second` with the pinned executable.

Capture limitations are retained: first driver expected preparation status 200 instead of actual 201, so did not record its manifest; this observation bug could not cause the application MIME failure. The second observer correctly captured the three-item preparation, but Playwright could not read the already-cancelled SDP response body; structural flags are unavailable. It recorded the safe MIME and generic local-unavailable caught-exception category instead. The second driver's internal command label omitted `--second`; the actual invocation above and separate directory/allowance attempt identify it. No failed driver is relabelled PASS. Full sensitive-response scanning and actual SDP/native parser success remain unproven.

## Corrected offline verification

All correction checks run in the retained `.env`-free copy, with empty real keys, unusable loopback DB and outbound-denial preload. Built browser suites inject synthetic repository/provider/SDP/native media and are distinct from the two failed live attempts. No real SQL/provider operation occurs in these commands. Node **24.22.0**, npm **11.19.1**.

| Command | UTC start–end, 20 October 2026 | Observed | Status / exit | Log under artifacts/local/08e |
| --- | --- | --- | --- | --- |
| `npm run lint` | 23:34:34.551–23:35:37.660 | No warnings | PASS / 0 | `lint-2026-10-20T23-34-34-551Z.log` |
| `npm run typecheck` | 23:35:37.662–23:36:10.186 | Prisma/Next/TypeScript | PASS / 0 | `typecheck-2026-10-20T23-35-37-662Z.log` |
| `npm run test` | 23:36:10.189–23:36:14.714 | 1,444 units | PASS / 0 | `test-2026-10-20T23-36-10-189Z.log` |
| `npm run build` | 23:36:14.717–23:36:29.196 | eWWc14UbbAeK9tTjsF5oN | PASS / 0 | `build-2026-10-20T23-36-14-717Z.log` |
| `npm run test:voice-adapter` | 23:36:29.197–23:36:49.319 | 57 units + 378 built assertions / 32 scenarios | PASS / 0 | `test-voice-adapter-2026-10-20T23-36-29-197Z.log` |
| `npm run test:owned-voice` | 23:36:49.321–23:37:06.507 | 94 units + 392 built assertions | PASS / 0 | `test-owned-voice-2026-10-20T23-36-49-321Z.log` |
| `npm run test:mode-switch` | 23:37:06.509–23:38:18.055 | 156 browser assertions | PASS / 0 | `test-mode-switch-2026-10-20T23-37-06-509Z.log` |
| `npm run test:recovery` | 23:38:18.056–23:40:16.474 | 248 browser assertions | PASS / 0 | `test-recovery-2026-10-20T23-38-18-056Z.log` |
| `npm run test:boundaries` | 23:40:16.476–23:40:20.409 | 186 units + 59 built HTTP assertions | PASS / 0 | `test-boundaries-2026-10-20T23-40-16-476Z.log` |

Corrected-build fresh default check: **PASS/exit 0**, **23:37:30.838–23:37:33.735 UTC**; unavailable UI, three 503/no-store routes, zero native peers/channels/audio objects/external requests, process shutdown and port 3134 released. Focused green regression: **6/6**, **23:34:33.930–23:34:34.549 UTC**, exit 0.

Supporting commands: preflight/audio generation and observer syntax/self-checks exited 0 before live issuance; exact initial wall-clock start/end for the shell/audio invocation were not separately recorded. `preflight.json` records **23:28:52.731 UTC**. The focused red regression is retained, exit 1 at **23:34:17.935–23:34:21.503 UTC**. No full unchanged suite was run before correction. Build warning about the nested checkout's workspace root is retained in the build log.

## Remaining work and PM handoff

Review the narrow MIME correction, regression and evidence with proposed **READY_FOR_REVIEW**, **partial outcome / live gate BLOCKED**. The corrected build has no real-service verification because both allowed sessions were consumed identifying the mismatch. Do not reset the ledger or rerun these live drivers. PM must decide whether to assign a new bounded live check and allocation after review; this worker starts no next task.

A future explicitly assigned check should use a fresh visitor/source/profile and reviewed allowance, upload the same fixture normally, inspect the full preview, select Voice and Start once, confirm open native channel/all effective source ACKs before media, enable playback normally and speak the two prewritten questions in `fixture.json`. Require numeric usage after the first response before continuing, judge both answers, Stop, inspect retained assistant text/full preview, remove only that fresh source and restore defaults. If performed by a human, use the same two questions, wait for the first complete answer/usage review before the follow-up, and Stop on any unexpected behavior; no paid attempt is authorized by this runbook alone.

Physical microphone/speaker/audibility/interruption, phone/iOS/Android, user transcription/both-speaker transcript, hosted integration, live YouTube, full grounding evaluation and unsupported model/tokenizer/accounting gates remain **NOT_RUN**. Local resource closure does not prove upstream billing cessation or credential revocation. The permanent key remains server-only; no public activation occurred.


## Correction 1 — 21 October 2026 UTC / 20 October Toronto

**Proposed READY_FOR_REVIEW, partial outcome; full live voice remains BLOCKED.** The one newly authorized corrective attempt proves the earlier MIME correction through native SDP application, connected peer, open data channel and effective initial settings ACK. The next real provider contract fails on source `item.id` length. A small additional correction is prepared and tested **offline only**; no second corrective live attempt occurred. This section supersedes the earlier native-connection blocker while preserving every original failed attempt and unmet gate.

### Identity, bounds and preservation

Arrival was clean `main`, HEAD **07dc98c1d40a2d551a65f8656b00e142050e08b5**. Live build **eWWc14UbbAeK9tTjsF5oN** was reused after all **114** application/package/config/schema inputs matched. Node **24.22.0**, npm **11.19.1**. New offline item-ID correction build **bfL8fNWLOziONuzc2GTon** is retained separately under `artifacts/local/08e/correction-1/offline-checkout`. Delivery is dirty/uncommitted; no commit/push/deployment/provisioning/dependency/schema/private-file change or public activation.

The new exclusive `correction-1/allowance.json` and permanent `attempt.lock` were written before the sole Start. **One credential/session attempt consumed; zero observed response starts, zero response.done events; no automatic restart.** Original `artifacts/local/08e/allowance.json` remains exhausted and unchanged. The new allocation is also sealed exhausted; **do not rerun or reset either ledger**. Credential request was **00:03:45.605 UTC**; failure/Stop cleanup request **00:03:50.550 UTC**; final default-process cleanup completed by **00:03:53.448 UTC**, well inside the 120-second bound. No extra paid turn or call followed diagnosis.

Current exact mini [official pricing](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) was searched/opened again: per million tokens text input/cache/output **$0.60/$0.06/$2.40**, audio input/cache/output **$10/$0.30/$20**. Conservative incremental preflight **$0.13248** for two responses plus **$0.20 margin** fits the new **$0.50** allocation. It assumes per response 10,000 text input tokens, 5,000 audio input tokens including history/margins, and all 512 output tokens charged at the higher audio rate, without cache discounts. Actual prior/new/cumulative charges and token/audio/cache/reasoning breakdown remain **unavailable/null**. No response usage or billing evidence arrived; zero observed starts is not a zero-cost claim. See separate `usage.json` and sealed ledger.

The existing PDF, questions/expected facts and offline WAV were reused unchanged. PDF SHA256 **a593fb961f3a9bfa7775df5433ba8443dc9df45ff05d3d47c3131433dd1be7e8**; extracted-preview SHA256 **60a6d979eeff68b7aeada0061d0f912a0bec754fc486fd90ecde70577dee32d3**; WAV SHA256 **43eaadac4a3fca007b71be26710f9584ea8f0a7a23a4a99c49023f5c7e889798**. WAV signal segments **5.1–10.6** and **51.5–60.4 seconds**, total **191.2395 seconds**, with enough trailing silence to prevent repetition before the session deadline. Native file-backed synthetic input was configured, but microphone attachment was never reached. Browser **Chromium 156.0.8078.4**, local Windows/headless isolated profile; no physical microphone/human audibility/phone claim.

The revised passive observer was established offline before acquisition: native object discovery, actual local-native remote-description stage, safe ACK/usage projection with explicit synthetic test messages, sentinel redaction, unchanged native function identities and closure passed. These offline projection events did not enter the live application. The live observer used read-only CDP discovery, passive native listeners and state/stats; no API replacement, response interception, source/storage seed, protocol injection or exception pausing. It captured only status/MIME, SDP structural booleans/count, safe settings/ACK/error categories, native lifecycle and numeric data. No raw SDP, headers/HAR, keys, tokens, raw source protocol bodies or audio deltas were retained. Synthetic fixture/screenshots remain ignored.

### Reached stages and acceptance

| Criterion / actual procedure | Expected | Observed / status | Evidence under `artifacts/local/08e/correction-1` |
| --- | --- | --- | --- |
| Matching build/private prerequisites/controlled audio | Safe bounded preflight before mint | **PASS**: 114 inputs, existing settings present, timing and observer self-check passed | `preflight.json`, `baseline.json`, `observer-check.json` |
| Fresh profile/visitor and normal PDF UI upload/full preview | Real parser/PostgreSQL and all authored pages | **PASS**: normal anonymous bootstrap401 then upload201, owned GET200; complete3page preview equal to fixture | `live-results.json`, `preview-before.{png,yml}` |
| Actual Voice Start/preparation/credential | One owned preparation and ephemeral mint | **PASS**: preparation201, credential200/no-store, one Start/credential request | `network`, ledger and attempt lock |
| SDP MIME/body/native application | MIME accepted and actual native remote description | **PASS**: real calls201 `text/plain; charset=utf-8`; 1,681-byte answer had version/audio/application structure; native remote type `answer`, signaling stable | Safe `network.structure` and `observer.remoteDescriptionApplied` |
| Native peer/channel | One connected peer/open ordered channel | **PASS**: connection/ICE connected and native channel-open event; exactly one peer/channel | Native events in `live-results.json` |
| Effective initial configuration | Exact initial settings ACK, source/media still barred | **PASS**: all11 recorded initial-setting match flags true, sender absent; requested model, text-only output,512 cap/no tools/truncation, null VAD/transcription, marin | First `session.updated` projection |
| Source ACK/final settings before microphone | All3item ACKs and effective final voice settings | **FAIL/BLOCKED**: provider `string_above_max_length`, parameter `item.id`, while source messages were being created. No source done ACK or final voice ACK; no sender track | Safe error categories, manifest count3/bytes5084 |
| Two predetermined factual spoken answers/VAD/transcript/usage/audio | Beginning/middle/end facts, two starts, numeric usage and incoming speech stats | **NOT_RUN**: setup failed first; both answer judgments unavailable;0starts/done, no microphone input or generated assistant text. Incoming remote track existed but speech/RTP evidence unavailable | Empty `answers`, native snapshots and `usage.json` |
| Active Stop/assistant-text retention | Explicit active Stop with text/full preview retained | **NOT_RUN**: automatic provider-failure cleanup had already disabled Stop. Cleanup attempted Stop without restarting; no text existed to retain | `stop.activeClick=false`, `controlAlreadyDisabled=true`, `failure.{png,yml}` |
| Terminal media/peer/channel/audio cleanup | No live resources | **PASS** for failure cleanup: peer/channel closed, incoming audio track ended, sender absent, audio paused/srcObject cleared | `afterStop` |
| Remove only fresh test source/read denial | Normal UI DELETE/read404 | **PASS**: DELETE200/no-store, read404/no-store, normal empty-source UI | `removed.{png,yml}`, result metadata |
| Fresh original/default-disabled process | Unavailable UI and503/no-store routes | **PASS**: three voice routes503/no-store, disabled Start,0native peer/channel/audio/track objects and external requests; server/profile closed | `defaultDisabled`, `default-disabled.{png,yml}` |
| New offline-build default state and preservation | Disabled operation; original artifacts/private files/processes/ports unchanged or closed | **PASS** as recorded below and in final audit; no live acceptance inferred | `corrected-default-disabled.json`, `audit.json`, `changed-files.sha256.json` |

Native observation times (page `performance.now`, milliseconds) show remote description applied **7406.5**, peer connected **7725.8**, channel open **7834.8**, initial effective ACK **7937.8**, first source-ID error **8021.7**. These are structural event timings, not microphone/answer/audibility latency. No raw-body capture gap occurred in this attempt; the actual SDP text was read transiently only to compute safe booleans/byte count. The original attempt's unavailable body remains unavailable and its historical failure is preserved.

### Offline source-ID correction

The rejected IDs were **45 characters** for the server's UUID run and first source items (`36-character UUID + _source_ + ordinal`). The captured safe error establishes length rejection, but did not retain a numeric upstream maximum. The [current client-event reference](https://developers.openai.com/api/reference/resources/realtime/client-events) documents unique client-provided item IDs without establishing that missing numeric bound. Accordingly, **32 is a conservative application envelope for the new regression, not a claimed measured provider limit**; the compact UUID IDs are at most **30 characters** across all4,096 allowed item ordinals. Acceptance by the real provider remains untested.

`src/shared/priming-manifest.ts` adds a shared deterministic `sourceItemId`: the entire128-bit UUID is encoded in base36, followed by a separate base36 item ordinal. No UUID bits are truncated and runId itself remains unchanged. Non-UUID text/measured run IDs keep their exact existing representation. `src/shared/priming-controller.ts` checks the same exact generated ID; it does not loosen ACK matching, content/status/predecessor checks, reconstruction, effective settings or the source-before-media barrier. Admission recomputes the full manifest as before. No authorization, model, transcription or architecture change.

`tests/unit/provider-voice-admission.test.ts` adds six checks: both source kinds/A–B with UUID IDs/full ACK readiness;12,288 unique IDs across three UUID namespaces/all4,096 ordinals, including runs differing only in low bits; invalid ordinal denial and existing text ID preservation; foreign-run ACK ignored/altered manifest denied. Four length regressions first failed, then all six passed. Full1450units and affected built suites below use the delivered final immutable test fixture. The first green focused run preceded an equivalent immutable-construction cleanup in that fixture; the full unit/affected checks use its final version. A temporary offline runner had an initial quoting syntax failure before executing tests; its source is retained as `offline-syntax-failed.mjs`, exit1, with exact initial wall-clock start/end not separately captured. The four red regression failures are separate from that harness failure. No failure is labelled PASS.

### Commands and offline validation

All correction checks use Node24.22.0/npm11.19.1 in the **new**, `.env`-free, network-blocked copy with empty real keys/unusable loopback DB. Provider/repository/media are injected only in these offline suites. The live command remains exit1 and is not replaced by the successful regression results. Nested-checkout workspace-root warning is retained; no framework configuration change was made.

| Exact command | UTC start–end, 21 October2026 | Observed | Exit / status | Safe log under correction-1 |
| --- | --- | --- | --- | --- |
| `npm run lint` | 00:06:27.292–00:07:32.015 | No warnings | 0 / PASS | `lint-2026-10-21T00-06-27-292Z.log` |
| `npm run typecheck` | 00:07:32.018–00:07:49.184 | Prisma/Next/TypeScript | 0 / PASS | `typecheck-2026-10-21T00-07-32-018Z.log` |
| `npm run test` | 00:07:49.187–00:07:53.770 | 1450 units | 0 / PASS | `test-2026-10-21T00-07-49-187Z.log` |
| `npm run build` | 00:07:53.772–00:08:05.260 | bfL8fNWLOziONuzc2GTon | 0 / PASS | `build-2026-10-21T00-07-53-772Z.log` |
| `npm run test:voice-adapter` | 00:08:05.262–00:08:27.048 | 57 units + 378 built checks /32scenarios | 0 / PASS | `test-voice-adapter-2026-10-21T00-08-05-262Z.log` |
| `npm run test:owned-voice` | 00:08:27.050–00:08:44.717 | 94 units +392built checks | 0 / PASS | `test-owned-voice-2026-10-21T00-08-27-050Z.log` |
| `npm run test:owned-text` | 00:08:44.719–00:09:01.402 | 417 built HTTP/browser checks | 0 / PASS | `test-owned-text-2026-10-21T00-08-44-719Z.log` |
| `npm run test:mode-switch` | 00:09:01.404–00:10:12.390 | 156 browser checks | 0 / PASS | `test-mode-switch-2026-10-21T00-09-01-404Z.log` |
| `npm run test:recovery` | 00:10:12.392–00:12:03.644 | 248 browser checks | 0 / PASS | `test-recovery-2026-10-21T00-10-12-392Z.log` |
| `npm run test:boundaries` | 00:12:03.646–00:12:07.490 | 186units +59HTTPchecks | 0 / PASS | `test-boundaries-2026-10-21T00-12-03-646Z.log` |

Focused red: **4/4 failed**, **00:05:53.206–00:05:53.699 UTC**, exit1. Green: **6/6 passed**, **00:06:26.742–00:06:27.290 UTC**, exit0. New offline-build fresh default check: **00:08:24.254–00:08:25.701 UTC**, exit0; unavailable UI/three503-no-store routes/0native peer-channel-audio/external requests, server/profile closed and port3134 released. Final preservation details and six delivery hashes are in `audit.json` and `changed-files.sha256.json`.

Initial preflight command `node artifacts/local/08e/correction-1/preflight.mjs` exited0 at **00:01:03.343–00:01:08.711 UTC**; exclusive ledger created before acquisition. Observer check command exited0 at **00:01:48.324–00:01:49.640 UTC**. Live command `node artifacts/local/08e/correction-1/live.mjs` ran **00:03:40.538–00:03:53.448 UTC**, **exit1**, stopped at the first new provider contract. Exact remaining commands/UTC/exits/logs below and in `commands.jsonl` are all **21 October2026UTC**; Toronto date remains20October.

### Handoff and remaining blocker

Review proposed **READY_FOR_REVIEW** for native-connection evidence plus an offline-only item-ID correction, **partial / live BLOCKED**. The new single attempt and original two attempts are all consumed. No new live validation of compact IDs is authorized by either ledger. PM decides acceptance and any later explicitly bounded allocation; no next task is started.

The next unfinished stage is real provider acceptance/completed ACK of the compact source IDs, then final settings/media/two spoken questions/numeric usage/active Stop with retention. The existing fixture questions and expected facts remain ignored. Any later authorized human run should upload fresh, inspect full preview, select Voice/Start once, wait for all source ACKs before speaking, enable playback normally, ask question1, review its facts/usage before question2, then Stop/remove/restore defaults. Stop on the first failed contract; this procedure alone does not authorize another paid attempt.

Human audibility/physical mic/speaker/interruption, physical phone/iOS/Android, user transcription/both-speaker transcript, hosted integration, live YouTube/full grounding evaluation remain **NOT_RUN**. Connection/remote-track evidence is not spoken-answer or audible-playback proof. Local closure cannot establish upstream billing cessation or revoke previously delivered credentials.
