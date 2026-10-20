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
