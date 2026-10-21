# Task09C — user speech transcription

Proposed **READY_FOR_REVIEW** for Task 09C only. Implemented and verified offline, then with real local WebRTC and synthetic microphone input. Clean arrival on main at **f73f61d0e2ccffdd3601afd126b5287e24f91a31**; delivery is a dirty working tree, without commit, push or deployment. Final production build **EBv0wdPqgWwrUXxwS9SvQ**; first build CO9tNvqjP1ZKHwAWvV4bJ. Both builds have the same 114 application inputs. Node 24.22.0/npm 11.19.1. Dates below are 21 October 2026 UTC / 20 October Toronto.

Policy/model and changes

Voice policy is now **provider-voice-full-source-2026-10-21-v2**, with exact transcription model **gpt-4o-mini-transcribe**. It reuses the existing proof model and remains explicitly supported for Realtime input transcription in the [official client-event schema](https://developers.openai.com/api/reference/resources/realtime/client-events). The [model card](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe) lists the alias/default snapshot; no realtime conversation-model or text-policy change. No language or prompt hint is imposed. Effective ACKs may expand absent language/prompt into empty defaults; different models, nonempty hints, forced language and unreviewed fields fail closed.

The same official schema describes ASR as asynchronous guidance. UI copy now explains that estimate only when the voice factory is configured; unavailable builds retain their disclosure. The [official event guide](https://developers.openai.com/api/docs/guides/realtime-transcription) defines item_id/content_index and warns about cross-turn completion ordering. The existing sole TranscriptStore already implements this mapping, rank/dedup rules, honest failures and clearing; it was reused without another store, persistence or lifecycle change.

Changed implementation: src/shared/priming-provider-policy.ts (immutable model binding/matcher), priming-manifest.ts (initial null; final model), priming-controller.ts (effective ACK barrier), src/app/voice-session.tsx (one disclosure). Added focused regressions in tests/unit/provider-voice-admission.test.ts and transcript.test.ts; extended tests/voice-adapter/fakes.mjs and scripts/verify-voice-adapter.mjs. Strict manifest reconstruction/admission, owned issuance, null mint settings, source ACK fidelity, no tools/truncation, 512 output, source replacement and microphone-free text policy remain enforced. No server provider/schema/dependency/configuration change.

Acceptance evidence

| Criterion | Observed result / evidence |
| --- | --- |
| 1: initial off, exact final after all source ACKs; old/wrong settings rejected; text unaffected | PASS:1,460 units including explicit old revision, missing/null/wrong ASR, hints/language/unreviewed fields, initial-null/final-model and empty-default ACK cases.75 priming tests; owned voice94+392 and owned text417 checks. Both live runs show all 3 matching source ACKs before final 11 effective checks and sender attachment. |
| 2: identity/order/duplicates/finals/failures/Stop/source/stale events | PASS:64 transcript tests, including added multi-content failure/cancel/Stop/stale case; existing final-before-delta/delayed-final/priming-exclusion/source/reset suites retained. Both live runs map2committed user items/content0 to their own assistant predecessors, one bubble per item. No live late-final-after-response was observed; offline coverage proves that case. |
| 3: built UI both speakers/partial/failure/Stop/defaults/bundles | PASS:433 built adapter assertions/35 scenario records;57 adapter units. Desktop1440/390px partial/failure/stopped screenshots inspected. Mode156/transcript-view32/boundary186+59 suites pass.13 client chunks exclude new fixture/private markers; production traces exclude tests/scripts/artifacts. No recovery/departure logic changed. |

All ordinary checks use artifacts/local/09c/offline-checkout: no private .env, empty real keys, unusable loopback database, existing dependency junction and outbound-denying preload/browser guards. Suites inject provider/storage/media explicitly. Expected outcomes were each command's assertions passing with exit0; the two historical failures below remain failures. Required command names are unchanged. Evidence root: **artifacts/local/09c/**; exact paths/environment/runtime and UTC/exits are in commands.jsonl/all-commands.json.

| Command | UTC start–end | Exit | Context |
| --- | --- | --- | --- |
| `npm run test:transcript` | 01:13:49.595–01:13:50.875 | 0 | isolated offline |
| `npm run test:priming` | 01:13:50.878–01:13:52.161 | 0 | isolated offline |
| `npm run lint` | 01:13:52.162–01:14:19.578 | 0 | isolated offline |
| `npm run typecheck` | 01:14:19.582–01:14:27.837 | 0 | isolated offline |
| `npm run test` | 01:14:27.840–01:14:32.666 | 0 | isolated offline |
| `npm run build` | 01:14:32.668–01:14:44.418 | 0 | isolated offline |
| `npm run lint` | 01:14:55.228–01:15:02.629 | 0 | isolated offline |
| `npm run test:voice-adapter` | 01:15:02.634–01:15:30.526 | 1 | isolated offline |
| `npm run lint` | 01:16:09.547–01:16:16.351 | 0 | isolated offline |
| `npm run test:voice-adapter` | 01:16:16.355–01:16:40.232 | 0 | isolated offline |
| `node artifacts/local/09c/observer-check.mjs` | 01:16:25.794–01:16:26.262 | 0 | offline observer |
| `npm run test:owned-voice` | 01:16:40.236–01:16:57.750 | 0 | isolated offline |
| `npm run test:owned-text` | 01:16:57.751–01:17:14.269 | 0 | isolated offline |
| `npm run test:transcript-view` | 01:17:14.271–01:17:30.630 | 0 | isolated offline |
| `npm run test:mode-switch` | 01:17:30.632–01:18:40.872 | 0 | isolated offline |
| `npm run test:boundaries` | 01:18:40.874–01:18:44.662 | 0 | isolated offline |
| `node artifacts/local/09c/preflight.mjs` | 01:19:00.426–01:19:06.352 | 0 | preflight |
| `node artifacts/local/09c/live.mjs 1` | 01:19:09.756–01:20:39.385 | 1 | real local/synthetic microphone |
| `npm run build` | 01:21:24.847–01:21:32.978 | 0 | isolated offline |
| `node artifacts/local/09c/correct-observer.mjs (includes node --test artifacts/local/09c/drain.test.mjs)` | 01:21:57.946–01:21:58.105 | 0 | offline observer |
| `node artifacts/local/09c/observer-check.mjs` | 01:21:58.605–01:21:59.563 | 0 | offline observer |
| `node artifacts/local/09c/live.mjs 2` | 01:22:05.882–01:23:26.516 | 0 | real local/synthetic microphone |
| `npm run lint` | 01:24:08.527–01:24:15.581 | 0 | isolated offline |
| `npm run test:voice-adapter` | 01:24:15.584–01:24:39.056 | 0 | isolated offline |

The first built adapter run failed when two additional scenarios pushed the final microphone-denial case past the existing10-per-network issuance limit. Two injected settings cases now run in a separate isolated process; application limits were unchanged. Corrected suite passed before live work. The final rerun additionally checks both new fixture/private markers against the final build.

Live evidence and preserved observer failure

Fresh visitors/profiles, real local built app, normal synthetic PDF upload/real parser/PostgreSQL, native file-backed Chromium microphone and OpenAI WebRTC. Original PDF/WAV and corrected08E WAV preserved; corrected WAV SHA256 **6a850c52140159a9c3e8a8e9e762254071e33b267ba43b3f5b5f07ecdfd70c6d**. No responses/native APIs replaced, protocol commands injected, source seeded, credentials/HAR/raw SDP/headers/audio deltas recorded, .env edited, SQL/migration run or deployment changed. Only process-local loopback/PDF/voice settings enabled. Passive CDP discovery records safe facts and ASR text, not raw session traffic.

Attempt 1 **01:19:09.756–01:20:39.385**, exit1: actual source/final/model barrier, both accurate ASRs/answers and numeric usage passed. A 15-second observer wait expired while second playout was still pending; active Stop at01:20:35.729, removal404/default503/resource closure passed. This failure is preserved in session-1/live-results.json/failure.png. It is not relabelled a pass. The observer deadline was corrected offline to remaining time under the original 110-second observation bound, retaining115-second Stop/118-second close backstops. Two deadline regressions and native observer self-check passed; an unchanged-input rebuild preceded the sole optional second attempt. No application/audio/policy/wording correction.

Attempt 2 **01:22:05.882–01:23:26.516**, exit0: all 3 source ACKs, final transcription/model/settings before media; two accurate factual answers across all 3 pages; numeric first-response usage and first ASR reviewed before second unmute. Both user questions have **0/11 and 0/19 normalized word errors** (case/punctuation ignored), with14/21 real delta events and one authoritative completion each. All four questions across both runs have0/60 word errors. Exact synthetic text, safe provider item/content IDs, predecessor/response timing and usage are retained only in ignored summary.json/session-*/live-results.json. No live delayed final occurred. Both provider output_audio_buffer.stopped events arrived before explicit active Stop **01:23:22.735**; this confirms observed buffer drain, not human audibility. Four turns remained byte-for-byte equal after Stop; all 3 preview pages remained exact. Inspected session-2/stopped.png, preview-after-stop.png and default-disabled.png.

Both attempts: normal test-owned DELETE200/no-store then owned read404/no-store; native peer/channel closed, local/remote tracks ended, audio paused/srcObject cleared, browser profiles/server processes closed. Attempt 2 listener audit records zero owned native listeners after observer release. Fresh default process: disabled Start, all three voice routes503/no-store, native peer/channel/audio/track counts0, external requests0. First-attempt resource evidence remains separate. Final audit.json verifies private hashes,114inputs,3,979 pre-existing 08E artifacts, protected tracked files, process/port cleanup and zero private-value matches. changed-files.sha256.json contains the final 11 delivery hashes; inspect that manifest rather than inventing a commit identity.

Usage and spending

[Official pricing](https://developers.openai.com/api/docs/pricing), fetched during09C: realtime-mini text input/cached/output $0.60/$0.06/$2.40 and audio $10/$0.30/$20 per million; mini-transcribe input/output $1.25/$5 per million, estimated $0.003/minute. Preflight **$0.62696** includes all four response bounds, four total minutes of possible transcription($0.012), separate$0.05transcription uncertainty and$0.30margin. Duration pricing is an estimate, not a hard billing cap.

| Attempt/turn | response total/input/output | input text/audio | cached text | output text/audio |
| --- | --- | --- | --- | --- |
| 1/Q1 | 1074/750/324 | 714/36 | 0 | 97/227 |
| 1/Q2 | 1360/873/487 | 770/103 | 704 | 133/354 |
| 2/Q1 | 1056/762/294 | 726/36 | 0 | 104/190 |
| 2/Q2 | 1208/875/333 | 772/103 | 0 | 102/231 |

ASR completion events supply their own numeric usage: per session input 103 audio/output 39 text tokens; across 2 sessions input 206/output 78, estimated **$0.00064750**. This separate ASR work is not assumed included in response.done usage. Known response estimate: **$0.02527544** cache adjusted ($0.02565560undiscounted); combined numeric estimate **$0.02592294** ($0.02630310undiscounted). Reasoning counts are subsets of output, not charged twice. Conservatively replacing ASR token estimate with the full four-minute estimate plus uncertainty gives **$0.08765560** including undiscounted responses. Actual incremental/cumulative billed amounts and historical project spending remain unknown/null; no purchase/reload/billing action.

The separate09C allowance.json and permanent session-1/session-2 attempt.lock files record **2 credential/session attempts, 4 response starts TOTAL: exhausted, no more live work**. All exhausted08E ledgers were preserved.

Remaining gates / handoff

Final preservation command: `node artifacts/local/09c/audit.mjs`, **01:26:07.103–01:26:13.222 UTC**, exit **0**. All 482 protected tracked files, 114 application inputs, 3,979 pre-existing 08E artifacts and private hashes match; secret-value matches **0**, all six test ports released, owned servers exited. `process-audit.json` at **01:26:43.275 UTC** confirms **0** Playwright Chromium processes. The subsequent final hash refresh/recheck is separately logged in commands.jsonl/all-commands.json; the final eleven delivery hashes are in changed-files.sha256.json.

Physical microphone, human listening, iPhone/Android, natural-pause/interruption usability, hosted integration, live YouTube and broader evaluation remain NOT_RUN. The earlier 200 ms pause sensitivity remains an explicit real-human usability gate; the controlled WAV does not resolve it. Later PM-authorized device testing should upload/preview a source, Start, speak two natural questions with pauses, inspect both speakers, verify audible output/interruption and Stop/cleanup. No further live attempt is authorized by09C. PM owns review/completion/sequencing; no full original step or public/phone gate is marked complete.
