# Task08F — natural pauses and interruption/follow-up

Proposed **READY_FOR_REVIEW — partially verified live**. Original Step08 remains open; PM owns acceptance. Explicit 600 ms voice policy and source-grounded interruption/follow-up are implemented and have bounded local synthetic-input real-service evidence. A real playback wiring defect was found during screenshot review and fixed offline. **The final playback fix has no live-provider or human-audibility verification.** No further session is permitted under this allocation.

## Identity and scope

Clean arrival main HEAD **6f0183ba2700c90a9b9eb30f930ad42987512fc2**. Delivery is dirty/uncommitted main: seven application/test files and three documentation files. No commit/push/deployment. Pinned Node24.22.0/npm11.19.1 throughout verification; default shell versions26.5.0/12.0.1 were inspected only. Dependencies reused by junction in the .env-free copy, no install/lockfile change.

Live build **Fn1wXqwYzTpxFuMdNFQQA**; final offline playback-corrected build **YhkhD73NHaU1gpomogsBg**. 114 original live inputs are frozen under ignored `artifacts/local/08f/live-inputs/`; baseline hashes bind that earlier build. Final 114 inputs are compared with the current isolated copy. These builds must not be conflated. All ordinary checks use empty real keys, an unusable 127.0.0.1:1 database, allowlisted environment and outbound-denying preload/individual browser guards. No real storage or provider contact occurs in those checks.

Changed behavior/files:

- `src/shared/priming-provider-policy.ts`: reviewed revision **provider-voice-full-source-2026-10-21-v3**, silenceDurationMs600; exact model/voice/output cap/transcription unchanged.
- `priming-manifest.ts`: explicit final-only silence_duration_ms600 for provider voice; initial VAD/ASR null, text policy and legacy scripted manifests unchanged.
- `priming-controller.ts`: binds manifest and final effective value, includes silence in configuration fingerprint, denies missing/wrong ACK before media. The new red regression previously acquired media for undefined/null/200/599/601/string600; all now deny. Stale v2 and coherently reserialized altered manifest deny.
- `src/app/voice-browser-adapters.ts`: after the captured playback defect, bind speaker.srcObject only once a remote track exists. Repeated track events preserve that binding. Cleanup/ownership, explicit playback action and media barrier unchanged.
- Three unit files add 9 policy checks, one captured event-order check and one playback wiring regression. No transcript store/UI/architecture/source authorization/schema/dependency change.

## Official basis and policy

Current [server VAD guide](https://developers.openai.com/api/docs/guides/realtime-vad) defines silence_duration_ms as the endpointing silence interval; shorter intervals detect turns sooner.600ms is the task's conservative starting value, **not a universal optimum**. Retain server_vad, automatic create_response/interrupt_response true, idle_timeout_ms null; threshold/prefix are omitted and their provider defaults merely observed. Both live final ACKs show 600 before microphone attachment; initial turn detection/transcription remain null. Exact gpt-4o-mini-transcribe stays final-only.

[Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) distinguishes response cancellation from output-buffer management in WebRTC. [Client events](https://developers.openai.com/api/reference/resources/realtime/client-events) and [server events](https://developers.openai.com/api/reference/resources/realtime/server-events) support the targeted generation cancel and independent buffer-clear/stopped observations. Offline tests retain both ACK orders and clear-only completed-generation behavior. Live08F cancelled still-generating responses; it did not exercise clear-only after completed generation.

Official pages were fetched before editing/preflight; safe Markdown copies are ignored `08f/official-*.md`. [Current pricing](https://developers.openai.com/api/docs/pricing): realtime mini text input/cache/output0.60/0.06/2.40 and audio10/0.30/20USD per million tokens; mini ASR1.25input/5output, estimated0.003USD/minute. No model substitution.

## Controlled waveform

Original WAV SHA256 **43eaadac4a3fca007b71be26710f9584ea8f0a7a23a4a99c49023f5c7e889798** preserved. Derived WAV **cef05d4b672862369196520772ff4101c4685e79b7756a378cf9ed704beb6f5e**,48kHz16bitmono,191.2395seconds/nonrepeating within allowance. Main PCM hashes/timing in `waveform.json` prove byte-identical copies of original segments; **no quiet-gap compression**. Prior split is already recorded in08E correction2attempt1 at 200 ms;08F does not spend a new 200 ms baseline turn.

| Question | Original segment | Scheduled window | Internal quiet preserved | Purpose |
| --- | --- | --- | --- | --- |
| What is the project codename, and who is the trial recorder? |5.00–8.54s|5.00–8.54s|340ms|Natural-pause acceptance |
| For that same project, how many cobalt tiles were used, and what are the final delivery location and time? |51.40–58.31s|45.00–51.91s|350ms and280ms|Deliberately interrupt answer |
| What was the storage crate label? |Offline Windows System.Speech|90.00–92.5095s including trailing silence|Unaltered synthesis|Grounded follow-up |

The original extra spoken trailing prompts after0.94/0.95s sentence gaps are excluded. First-main PCM SHA256db94b63b77a03ff8c0a61d27fbd9f9d5b3869d47d78626735fc4486d1a628648. Follow-up WAV SHA256d21ce7e7ec5adf61f5922893f78acfe0f87b35f96f9d06889909a97c20c6fd54. Offline native file-backed capture first signal5.178s/last8.516s, tracks ended/AudioContext closed. SAPI generation's standalone invocation UTC was not retained; subsequent preparation/capture/hash commands have exact timestamps. This is synthetic speech, not a person/device microphone test.

## Bounded real local evidence

Fresh native Chromium profiles/visitors; actual PDF upload/parser/PostgreSQL owned routes/OpenAI native WebRTC. No native API replacements, provider interception, seeded source, protocol injection, debugger pause, HAR/raw SDP/headers/credentials/audio recording. Only passive safe event/statistics projections and ordinary UI actions. All3full-source ACKs and final effective settings precede sender attachment; one peer/channel/credential request each. Playback enable was clicked normally, but **its promise timed out and UI showed Try speaker playback**. Native received/decoded output is not proof of HTML speaker playback.

| Command | UTC start/end on21October2026 | Exit | Outcome |
| --- | --- | --- | --- |
| `node artifacts/local/08f/live.mjs 1` |01:41:18.561–01:42:26.050|1|Full natural question/answer, UI cancellation/clear; failed observer stale-start contract, no follow-up |
| `node artifacts/local/08f/live.mjs 2` |01:47:12.105–01:49:03.081|0|Three planned responses, cancellation/decoded silence/follow-up/retention/removal/default cleanup; playback limitation discovered in later screenshot review |

Attempt1 clear61724.6ms → late started61724.7ms → cancelled61800.3ms; existing controller remained cleared/confirmed. First failure/driver/snapshots remain unchanged. A narrow **observer-gap correction**, not an app event-order change, was verified offline before the sole optional second attempt: require generation terminal + matching clear, later stopped after any late started, then >=1500 ms advancing decoded sample duration with stable native RTP energy and level<=0.001. Four observer tests pass; native loopback oscillator check proves this can distinguish signal from quiet. Two earlier native checks had no decoded sink/audio and failed, then the normal audio sink was added; all results retained. No failed command is relabelled PASS.

Attempt2 timeline (page performance clock, ms): response2created57693.1; buffer started58259.3; ordinary Interrupt requested58391/click complete58466.9; clear58467.6; response.done **cancelled**58524.4; controller confirmation and1517.9ms native silence verified by60613.5. Native signal quiet was maintained through 276 sample observations before follow-up unmute90202.4. No late buffer-start event for the interrupted response occurred in attempt2. Generation was still active before the click, so this establishes generation cancellation plus buffer clearing, not clear-only cancellation of a finished response. HTML speaker playback/audibility remain unverified.

Three exact actual ASR questions have **0/36 normalized word errors** in attempt2; attempt1has 0/30, total 0/66. Punctuation/case are ignored only for word matching; actual provider text is retained. All question words, including those after the preserved pauses, occur in single user turns. Complete answers correctly identify Cedar Lantern/Mira Solen and KITE-482. Cancelled response honestly retains partial text: “For the same project, the inventory section says the team used exactly 18” (spacing retained exactly in artifacts). It is not scored as a complete answer to question2. Both-speaker order is You/Assistant/You/Assistant/You/Assistant. Follow-up's committed predecessor is the interrupted assistant item; no new session/repriming or extra response. Received final ASR preceded its corresponding response.done in these runs; live delayed final is NOT_RUN, offline regressions cover it.

Natural question2nd-attempt approximate waveform end→response.created **712.9ms**, →first output-buffer-start **1333.6ms**. First-attempt equivalents784.3/1591.2ms. Provider speech_stopped receipt→response.created7.3ms/first buffer628ms in attempt2 (1.1/808ms in attempt1). Waveform timing uses observed sender attachment as capture-clock proxy; it includes scheduling/capture/network uncertainty. VAD audio_end_ms includes configured silence. These are tiny-sample event latencies, **not first-audible-response measurements**, median/worst usability proof or600ms tuning approval. Full numeric timelines are in `summary.json`.

Active Stop retained all 6 texts byte-for-byte and full 3-page preview. Desktop/390px interrupted/retained screenshots inspected: cancellation and unconfirmed-playback disclosures remain readable, no clipping; actual viewport emulation only. Explicit mute was checked against disabled outgoing native tracks; scheduled unmute retained one session. Stop ended both tracks, closed peer/channel, detached/paused audio and removed native listeners. Each newly uploaded source alone was removed normally DELETE200 then owned read404/no-store. Profiles/servers closed. Fresh original-default processes after both attempts and final secret-free rebuilt process showed unavailable Start, all 3 voice routes 503/no-store, zero peer/channel/audio/track objects and zero external requests. Final preservation/port/process/hash audit lives in `audit.json`.

## Playback defect: offline correction only

Screenshot review exposed blocked playback despite successful incoming RTP/provider events. Offline native diagnostic `playback-check.mjs` reproduced the adapter's empty-stream binding: .play()pending, readyState0/currentTime0 with live/unmuted incoming track. Appending the element did not fix it. Binding after the first remote track resolved .play(), readyState4/currentTime3.517418s, with loadedmetadata/canplay/playing events. A regression against the actual adapter failed on the original wiring, then passed after the narrow srcObject change; complete adapter/built/default checks use the final build. This controlled oscillator diagnostic does not prove provider audio or human audibility. The fix is intentionally **not described as live verified**. Both session allowances were already consumed when it was found; no further paid turn or acquisition was made. A later PM decision is needed for any additional live validation.

## Allocation, usage and cleanup

Exclusive08F ledger/attempt locks: **2 credential/session attempts,5 response starts** (3completed/2cancelled), exhausted/no rerun. Credential→final cleanup63.256s and106.720s, below180s each. Limits2/6/180s/US$1never raised;09C/all 08E exhausted ledgers unchanged. Preflight estimate **US$0.76544** = six responses conservatively budgeted10ktext/5kaudio input plus512all-audio output each, full6minutes estimated ASR,0.05ASR uncertainty and0.30reserve. Source wire remained below10kbytes; output cap512effective. Numeric response and ASR usage was required before subsequent generation. Stop on first observed failed contract was honored; late screenshot discovery remains explicit.

Known response estimate **US$0.02200544** cache-adjusted; ASR **US$0.00077375**; total **US$0.02277919**. Undiscounted totalUS$0.02378015. Actual bills/prior/cumulative project cost unknown, not zero. Numeric nested usage in both session results supports these calculations; reasoning tokens are subsets, not charged twice. No billing/account/purchase change.

Private .env files were read only in memory for authorized live use; none copied/edited/printed. No SQL/migration/cleanup scheduler/caption/deployment operation. No new public configuration. Browser/server closure is awaited; audit verifies recorded server PIDs and released ports. All logs/screenshots/controlled WAVs/ledgers are ignored under `artifacts/local/08f/`, with previous 08E/09C artifacts hashed/preserved.

## Acceptance and remaining gates

| Criterion | Status/evidence |
| --- | --- |
|1exact final pause policy/ACK/media barrier; initial/text unchanged|PASS offline and real local earlier build, v3/600effective after all3source ACKs;118focused policy tests |
|2natural pause question one user turn/response/all intended words|PASS local synthetic input twice; original340ms PCM preserved, factual answers, measured event latency |
|3UI interruption and fresh grounded follow-up|PASS generation cancellation/buffer clearing/decoded silence/order/one session on live build; **PARTIAL for full playback behavior** because speaker promise failed; corrected wiring offline only |
|4both-speaker Stop/preview/mute/removal/default restoration/text fallback|PASS local real route/retention evidence plus isolated regressions on final build; no human/audio claim |

NOT_RUN: live provider verification of final playback-corrected build, human listening/first-audible latency, physical microphone/barge-in, real-person pause tolerance/noisy speech, iPhone/Android audio/keyboard, hosted voice/text, live YouTube and full source evaluation. No new task, public activation or full Step08/09completion. `test:recovery` not repeated: lifecycle/departure/cleanup implementation unchanged; adapter teardown remains covered by adapter/voice/mode/boundary regressions. PM reviews this partial handoff and decides completion.

Final audit PASS: 485 protected tracked files and 287 prior08E/09C artifacts unchanged; all private files preserved, both114-input identities match, all11 audited ports released and all5 recorded server PIDs exited. Ten delivery SHA256 values are in `artifacts/local/08f/changed-files.sha256.json`; exact audit detail in `artifacts/local/08f/audit.json`.

## Final required verification

Every row is local isolated/offline; built/browser rows use final buildYhkhD73NHaU1gpomogsBg. Provider/media fixtures are explicitly simulated except the separate native oscillator/file-capture diagnostics. Expected result is exit0 with no real provider/DB contact.

| Command | Started UTC | Ended UTC | Exit | Log under artifacts/local/08f |
| --- | --- | --- | --- | --- |
| `npm run test:priming` | 2026-10-21T01:51:34.487Z | 2026-10-21T01:51:35.748Z | 0 | test-priming-2026-10-21T01-51-34-487Z.log |
| `npm run test:interruption` | 2026-10-21T01:51:35.750Z | 2026-10-21T01:51:36.789Z | 0 | test-interruption-2026-10-21T01-51-35-750Z.log |
| `npm run test:transcript` | 2026-10-21T01:51:36.791Z | 2026-10-21T01:51:37.695Z | 0 | test-transcript-2026-10-21T01-51-36-791Z.log |
| `npm run lint` | 2026-10-21T01:51:37.697Z | 2026-10-21T01:51:45.123Z | 0 | lint-2026-10-21T01-51-37-697Z.log |
| `npm run typecheck` | 2026-10-21T01:51:45.126Z | 2026-10-21T01:51:49.555Z | 0 | typecheck-2026-10-21T01-51-45-126Z.log |
| `npm test` | 2026-10-21T01:51:49.558Z | 2026-10-21T01:51:54.121Z | 0 | test-2026-10-21T01-51-49-558Z.log |
| `npm run build` | 2026-10-21T01:51:54.123Z | 2026-10-21T01:52:01.918Z | 0 | build-2026-10-21T01-51-54-123Z.log |
| `npm run test:voice-adapter` | 2026-10-21T01:52:01.919Z | 2026-10-21T01:52:24.744Z | 0 | test-voice-adapter-2026-10-21T01-52-01-919Z.log |
| `npm run test:voice-session` | 2026-10-21T01:54:30.052Z | 2026-10-21T01:55:34.259Z | 0 | test-voice-session-2026-10-21T01-54-30-052Z.log |
| `npm run test:owned-voice` | 2026-10-21T01:55:34.262Z | 2026-10-21T01:55:49.683Z | 0 | test-owned-voice-2026-10-21T01-55-34-262Z.log |
| `npm run test:owned-text` | 2026-10-21T01:55:49.686Z | 2026-10-21T01:56:03.889Z | 0 | test-owned-text-2026-10-21T01-55-49-686Z.log |
| `npm run test:mode-switch` | 2026-10-21T01:56:03.890Z | 2026-10-21T01:57:00.149Z | 0 | test-mode-switch-2026-10-21T01-56-03-890Z.log |
| `npm run test:boundaries` | 2026-10-21T01:57:00.150Z | 2026-10-21T01:57:03.534Z | 0 | test-boundaries-2026-10-21T01-57-00-150Z.log |

Final totals: priming75/interruption63/transcript64/lint/typecheck/**1471 units**/build; adapter58+433built, voice UI208, owned-voice94+392, owned-text417, mode156, boundaries186+59. Earlier final-build voice UI run207passed/1beforeEach fixture-load timeout before application behavior; trace preserved under `voice-session-failed/`, unchanged-command rerun is recorded separately. No timeout/product adjustment. Initial8policy red failures, playback red regression and observer/native development failures remain visible below. Safety/identity read commands and SAPI's standalone UTC are not all retained as timed command records; no fabricated exact times.

## Command ledger (including failed commands)

Pinned executable `.tools/node-v24.22.0-win-x64/node.exe` and its bundled npm-cli.js run commands below. `npm run test` is the runner's exact spelling for `npm test`. JSONL has full isolated cwd/environment/runtime and logs; this table preserves actual exits and timestamps.

| Exact command | Started UTC | Ended UTC | Exit | Evidence |
| --- | --- | --- | --- | --- |
| `node --conditions=react-server --test tests/unit/voice-browser-adapters.test.ts` | 2026-10-21T01:35:32.199Z | 2026-10-21T01:35:34.039Z | 0 | focused-2026-10-21T01-35-32-199Z.log |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 2026-10-21T01:35:40.951Z | 2026-10-21T01:35:42.240Z | 1 | focused-2026-10-21T01-35-40-951Z.log |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 2026-10-21T01:36:02.601Z | 2026-10-21T01:36:03.876Z | 0 | focused-2026-10-21T01-36-02-601Z.log |
| `npm run test:priming` | 2026-10-21T01:36:03.879Z | 2026-10-21T01:36:05.224Z | 0 | test-priming-2026-10-21T01-36-03-879Z.log |
| `npm run test:interruption` | 2026-10-21T01:36:05.226Z | 2026-10-21T01:36:06.333Z | 0 | test-interruption-2026-10-21T01-36-05-226Z.log |
| `npm run test:transcript` | 2026-10-21T01:36:06.335Z | 2026-10-21T01:36:07.301Z | 0 | test-transcript-2026-10-21T01-36-06-335Z.log |
| `npm run lint` | 2026-10-21T01:36:07.303Z | 2026-10-21T01:36:16.533Z | 0 | lint-2026-10-21T01-36-07-303Z.log |
| `npm run typecheck` | 2026-10-21T01:36:16.537Z | 2026-10-21T01:36:24.498Z | 0 | typecheck-2026-10-21T01-36-16-537Z.log |
| `npm run test` | 2026-10-21T01:36:24.502Z | 2026-10-21T01:36:29.025Z | 0 | test-2026-10-21T01-36-24-502Z.log |
| `npm run build` | 2026-10-21T01:36:29.026Z | 2026-10-21T01:36:40.617Z | 0 | build-2026-10-21T01-36-29-026Z.log |
| `npm run test:voice-adapter` | 2026-10-21T01:36:40.618Z | 2026-10-21T01:37:04.660Z | 0 | test-voice-adapter-2026-10-21T01-36-40-618Z.log |
| `node artifacts/local/08f/prepare.mjs (original PCM copy + offline SAPI follow-up)` | 2026-10-21T01:37:12.928Z | 2026-10-21T01:37:12.997Z | 0 | safe JSON/report in 08f |
| `node artifacts/local/08f/observer-check.mjs` | 2026-10-21T01:37:14.025Z | 2026-10-21T01:37:14.848Z | 0 | safe JSON/report in 08f |
| `npm run test:voice-session` | 2026-10-21T01:37:04.662Z | 2026-10-21T01:38:28.299Z | 0 | test-voice-session-2026-10-21T01-37-04-662Z.log |
| `npm run test:owned-voice` | 2026-10-21T01:38:28.300Z | 2026-10-21T01:38:45.740Z | 0 | test-owned-voice-2026-10-21T01-38-28-300Z.log |
| `node artifacts/local/08f/observer-check.mjs` | 2026-10-21T01:38:51.708Z | 2026-10-21T01:38:52.136Z | 0 | safe JSON/report in 08f |
| `npm run test:owned-text` | 2026-10-21T01:38:45.741Z | 2026-10-21T01:39:02.380Z | 0 | test-owned-text-2026-10-21T01-38-45-741Z.log |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 2026-10-21T01:40:07.886Z | 2026-10-21T01:40:11.021Z | 0 | focused-2026-10-21T01-40-07-886Z.log |
| `npm run test:mode-switch` | 2026-10-21T01:39:02.382Z | 2026-10-21T01:40:15.162Z | 0 | test-mode-switch-2026-10-21T01-39-02-382Z.log |
| `npm run test:boundaries` | 2026-10-21T01:40:15.164Z | 2026-10-21T01:40:19.043Z | 0 | test-boundaries-2026-10-21T01-40-15-164Z.log |
| `npm run lint` | 2026-10-21T01:40:11.026Z | 2026-10-21T01:40:20.383Z | 0 | lint-2026-10-21T01-40-11-026Z.log |
| `npm run typecheck` | 2026-10-21T01:40:20.386Z | 2026-10-21T01:40:24.303Z | 0 | typecheck-2026-10-21T01-40-20-386Z.log |
| `npm run test` | 2026-10-21T01:40:24.307Z | 2026-10-21T01:40:28.757Z | 0 | test-2026-10-21T01-40-24-307Z.log |
| `node artifacts/local/08f/capture-check.mjs` | 2026-10-21T01:40:37.935Z | 2026-10-21T01:40:48.315Z | 0 | safe JSON/report in 08f |
| `node artifacts/local/08f/observer-check.mjs` | 2026-10-21T01:41:11.259Z | 2026-10-21T01:41:12.233Z | 0 | safe JSON/report in 08f |
| `npm run test:interruption` | 2026-10-21T01:43:55.728Z | 2026-10-21T01:43:57.047Z | 0 | test-interruption-2026-10-21T01-43-55-728Z.log |
| `npm run lint` | 2026-10-21T01:43:57.050Z | 2026-10-21T01:44:04.537Z | 0 | lint-2026-10-21T01-43-57-050Z.log |
| `npm run typecheck` | 2026-10-21T01:44:04.539Z | 2026-10-21T01:44:08.624Z | 0 | typecheck-2026-10-21T01-44-04-539Z.log |
| `npm run test` | 2026-10-21T01:44:08.626Z | 2026-10-21T01:44:13.178Z | 0 | test-2026-10-21T01-44-08-626Z.log |
| `node artifacts/local/08f/native-silence-check.mjs` | 2026-10-21T01:45:06.207Z | 2026-10-21T01:45:16.315Z | 1 | safe JSON/report in 08f |
| `node artifacts/local/08f/native-silence-check.mjs` | 2026-10-21T01:45:43.487Z | 2026-10-21T01:45:53.580Z | 1 | safe JSON/report in 08f |
| `node artifacts/local/08f/native-silence-check.mjs` | 2026-10-21T01:46:17.023Z | 2026-10-21T01:46:21.263Z | 0 | safe JSON/report in 08f |
| `node --test artifacts/local/08f/silence.test.mjs` | 2026-10-21T01:46:53.528Z | 2026-10-21T01:46:53.697Z | 0 | safe JSON/report in 08f |
| `node artifacts/local/08f/playback-check.mjs` | 2026-10-21T01:50:01.579Z | 2026-10-21T01:50:13.430Z | 0 | safe JSON/report in 08f |
| `node --conditions=react-server --test --test-name-pattern=08F tests/unit/voice-browser-adapters.test.ts` | 2026-10-21T01:51:18.412Z | 2026-10-21T01:51:21.907Z | 1 | adapter-focused-2026-10-21T01-51-18-412Z.log |
| `node --conditions=react-server --test --test-name-pattern=08F tests/unit/voice-browser-adapters.test.ts` | 2026-10-21T01:51:33.959Z | 2026-10-21T01:51:34.484Z | 0 | adapter-focused-2026-10-21T01-51-33-959Z.log |
| `npm run test:priming` | 2026-10-21T01:51:34.487Z | 2026-10-21T01:51:35.748Z | 0 | test-priming-2026-10-21T01-51-34-487Z.log |
| `npm run test:interruption` | 2026-10-21T01:51:35.750Z | 2026-10-21T01:51:36.789Z | 0 | test-interruption-2026-10-21T01-51-35-750Z.log |
| `npm run test:transcript` | 2026-10-21T01:51:36.791Z | 2026-10-21T01:51:37.695Z | 0 | test-transcript-2026-10-21T01-51-36-791Z.log |
| `npm run lint` | 2026-10-21T01:51:37.697Z | 2026-10-21T01:51:45.123Z | 0 | lint-2026-10-21T01-51-37-697Z.log |
| `npm run typecheck` | 2026-10-21T01:51:45.126Z | 2026-10-21T01:51:49.555Z | 0 | typecheck-2026-10-21T01-51-45-126Z.log |
| `npm run test` | 2026-10-21T01:51:49.558Z | 2026-10-21T01:51:54.121Z | 0 | test-2026-10-21T01-51-49-558Z.log |
| `npm run build` | 2026-10-21T01:51:54.123Z | 2026-10-21T01:52:01.918Z | 0 | build-2026-10-21T01-51-54-123Z.log |
| `npm run test:voice-adapter` | 2026-10-21T01:52:01.919Z | 2026-10-21T01:52:24.744Z | 0 | test-voice-adapter-2026-10-21T01-52-01-919Z.log |
| `node artifacts/local/08f/default-final.mjs` | 2026-10-21T01:52:45.089Z | 2026-10-21T01:52:47.388Z | 0 | safe JSON/report in 08f |
| `npm run test:voice-session` | 2026-10-21T01:52:24.745Z | 2026-10-21T01:53:39.582Z | 1 | test-voice-session-2026-10-21T01-52-24-745Z.log |
| `npm run test:voice-session` | 2026-10-21T01:54:30.052Z | 2026-10-21T01:55:34.259Z | 0 | test-voice-session-2026-10-21T01-54-30-052Z.log |
| `npm run test:owned-voice` | 2026-10-21T01:55:34.262Z | 2026-10-21T01:55:49.683Z | 0 | test-owned-voice-2026-10-21T01-55-34-262Z.log |
| `npm run test:owned-text` | 2026-10-21T01:55:49.686Z | 2026-10-21T01:56:03.889Z | 0 | test-owned-text-2026-10-21T01-55-49-686Z.log |
| `npm run test:mode-switch` | 2026-10-21T01:56:03.890Z | 2026-10-21T01:57:00.149Z | 0 | test-mode-switch-2026-10-21T01-56-03-890Z.log |
| `npm run test:boundaries` | 2026-10-21T01:57:00.150Z | 2026-10-21T01:57:03.534Z | 0 | test-boundaries-2026-10-21T01-57-00-150Z.log |
| `node artifacts/local/08f/write-report.mjs (first invocation)` | UTC not retained | UTC not retained | 1 | safe JSON/report in 08f |


## Correction 1 — 21 October 2026 UTC / 20 October Toronto

Proposed **READY_FOR_REVIEW for the bounded browser-playback correction**. The first attempt passed on the unchanged corrected application build. The ordinary Enable speaker playback button led to resolved application playback status, native play/playing events and an advancing HTMLAudioElement timeline through a real provider response. The matching provider output buffer subsequently stopped, followed by explicit active Stop and complete cleanup. This supersedes the earlier “final build not live verified” limitation for this specific controlled local browser check. It does not establish human audibility, physical microphone/phone behavior or full Step08 completion. PM owns acceptance.

### Identity and changes

Clean arrival `main`, HEAD **a79bb0796b477522a2ffe5751ab092f9d7a5f3f8**. Reused build **YhkhD73NHaU1gpomogsBg** from `artifacts/local/08f/offline-checkout`; all **114 application/build inputs** match the current repository and retained build copy. No application, test, policy, model, prompt, VAD, transcription, ownership, dependency or configuration change; no rebuild or unchanged full-suite repetition. Pinned Node **24.22.0**, npm **11.19.1** verified again.

Delivery changes only this appended report, `PROJECT_STATE.md` and `TESTING.md`; dirty/uncommitted, no commit/push/deploy. Safe evidence is in ignored **artifacts/local/08f/correction-1/**. `baseline.json` binds actual tracked/private/prior-artifact hashes, `changed-files.sha256.json` contains the three delivery hashes, and `audit.json` records the final preservation checks. Earlier report sections, failures, WAVs and exhausted08F/09C/08E ledgers remain unchanged.

### Preparation, observer and budget

Current official [pricing](https://developers.openai.com/api/docs/pricing), [exact realtime model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), [exact ASR model](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe) and [server events](https://developers.openai.com/api/reference/resources/realtime/server-events) were retrieved before acquisition. The HTML server-reference fetch exceeded the browser tool's size limit; the official Markdown retrieval succeeded and is retained with the other `official-*.md` copies. Rates remain realtime text input/cache/output $0.60/$0.06/$2.40 and audio $10/$0.30/$20 per million tokens; ASR input/output $1.25/$5, estimated $0.003/minute. No model substitution or billing action.

New exclusive correction allowance: **US$0.50 estimated incremental ceiling**, at most **2 credential/session attempts, 2 response starts total, 1 response per attempt, 120 seconds per attempt**. Preflight **US$0.39448** comprises two conservative responses with 10,000 text/5,000 audio input tokens and 512 all-audio output tokens each ($0.13248), four full minutes estimated ASR ($0.012), $0.05 ASR uncertainty and $0.20 reserve. These estimates are not a hard billing cap. Source wire was again checked below10,000 bytes and effective output cap512. Previous actual costs remain unknown.

The native microphone WAV contains only the predetermined question, “What is the project codename, and who is the trial recorder?” Original PCM5.00–8.54s is byte-identical, including its **340ms internal pause**. All other speech, including the old extra trailing prompt, is replaced with silence; no voiced samples/gap compression. Duration **191.2395s**,48kHz/16bit/mono, so no loop or second utterance within120s. No paid TTS/private microphone recording.

| Artifact | SHA256 |
| --- | --- |
| Preserved original questions.wav |43eaadac4a3fca007b71be26710f9584ea8f0a7a23a4a99c49023f5c7e889798|
| New correction question.wav |66c79f69056853fa435f899b6cd985fb152b4247d3fdaf74fd12505016cfc022|
| Preserved main-question PCM |db94b63b77a03ff8c0a61d27fbd9f9d5b3869d47d78626735fc4486d1a628648|

The observer was reviewed offline and checked against native peer/oscillator fixture playback. It only subscribes to events and reads UI/native state/stats. Static checks exclude direct play calls, srcObject assignments, element creation/appending and native replacement in observer code; native API/function/setter identities remain unchanged. The offline fixture's ordinary button produced play/playing, readyState4/currentTime1.011333s, peer-receiver track binding and terminal pause/detach. This fixture result is separate from the real-service result below; the live application had no oscillator or extra sink. No observer mutation “fixed” the live audio.

### Actual local application result

Command **node artifacts/local/08f/correction-1/live.mjs 1**, **02:09:01.719–02:09:37.098 UTC**,21October2026, **exit0**. Fresh native Chromium profile/visitor; actual authored three-page PDF upload, parser, PostgreSQL owned routes and OpenAI WebRTC. No native API replacement, provider interception, seeded source, protocol injection, direct observer play/rebinding/appending or private audio capture. Only temporary process-local loopback/PDF/voice flags. Permanent settings/deployment unchanged.

Normal Start produced one owned preparation, one credential request and one native peer/open ordered channel. Initial effective VAD/transcription null, all three complete-source ACKs, and final **v3/600ms/exact gpt-4o-mini-transcribe** effective settings were confirmed before outgoing microphone attachment. Normal Enable speaker playback was clicked once. The sole actual audio element was already bound to the live peer receiver track; it was not bound/rebound by the observer.

All timestamps in the following table are the same page's performance clock in milliseconds; they are event receipts/observations, not human-audibility measurements.

| Observation | Timestamp/value | Meaning |
| --- | --- | --- |
| loadedmetadata / canplay |7228.1 /7228.2ms|Native element readyState4, initially paused/currentTime0 |
| Normal enable action requested / click returned |8197.0 /8374.5ms|Ordinary UI owns the play call |
| Native play / playing |8426.0 /8426.2ms|Events from that same actual application element |
| Application UI available observed |8480.6ms|“Playback enabled. This does not confirm what you heard.” |
| Response created |17414.6ms|One planned generated answer |
| Matching output buffer started |18324.3ms|Provider output begins; HTML clock observed9.954813s |
| Matching response.done completed |19525.5ms|Generation finished; output buffer still active |
| Matching output buffer stopped |29658.1ms|Provider reports complete buffer drain |
| HTML clock at stop observation |21.397787s, readyState4, paused=false|Clock advanced **11.442974s** across output; multiple monotonic observations |

Play-promise resolution is evidenced by the actual application’s **available** UI: the unchanged VoiceLifecycle sets this status only after awaiting connection.playback.play(), which invokes native HTMLAudioElement.play(). The observer never invoked/wrapped play. Native play/playing, readyState and clock progression independently support this UI evidence. UI available appeared **283.6ms** after the request observation. This is materially stronger than paused=false, incoming RTP or the old offline oscillator result alone.

Before Stop, one bound audio track matched the actual peer receiver, was live/unmuted, and the HTML timeline continued through the response. Incoming provider RTP additionally recorded91,717bytes/1,109packets,22.56decoded-sample seconds and totalAudioEnergy0.83943208; these are supporting transport statistics, not the playback acceptance by themselves. Generation finished **10.1326seconds before buffer completion**. Full buffer drain is supported by its matching stopped event, while the HTML element remained active; a live MediaStream clock continues after speech and does not itself prove every word was heard. No physical listening claim.

Actual ASR exactly matches the intended complete question: **0/11 normalized word errors**, one user turn and one completed assistant turn. Target facts **Cedar Lantern** and **Mira Solen** and their Page1 location are correct. Full received answer is retained in safe results/screenshots. The assistant incidentally called the input “source image text” although this was a parsed text PDF; that inaccurate medium descriptor is preserved, not repaired with another paid turn. Factual acceptance is for the two requested names and source location, not a claim that every incidental phrase is correct.

`session-1/playback-complete.png` was visually inspected: UI explicitly enabled, generation complete/output stopped, both turns visible. `stopped-390.png` was also inspected for retained text and readable controls; viewport emulation is not a physical phone test. Existing transcript disclosure still says generated speech text/playback unconfirmed, appropriately avoiding a human-listening claim.

### Stop, removal, defaults and preservation

Explicit active Stop at **02:09:33.237UTC** completed **02:09:33.506UTC**. Both received texts stayed byte-for-byte, ordered You/Assistant, and full three-page preview matched before/after Stop. Mute was exercised after the sole response began and verified against the disabled outgoing native sender; no unmute/new question/session was needed.

Stop closed the peer/channel, ended local and remote tracks, paused/detached the sole actual audio element (srcObject false, sourceTracks empty, readyState0/currentTime0), released its owned listeners and stopped observer timers/listeners. CDP audit reports zero listeners on the peer, channel, both tracks and audio element after observer release. The existing controller/adapter cleanup is unchanged; profile closure removes the remaining page/UI resources.

Normal Remove deleted only this new source, DELETE200; owned read then404/no-store. Fresh original-default process/profile showed unavailable Start, all three voice routes503/no-store, zero peer/channel/audio/track objects and zero external requests. Profile/browser/server closure was awaited. Recorded server PIDs60328/38836 are exited; loopback3134/3136 released. Private files unchanged; no .env/SQL/migration/caption/billing/deployment action. Final audit: **493 protected tracked files,429 earlier artifacts unchanged;114 inputs/build unchanged**. No cleanup scheduler run.

### Usage and allowance

**1 credential/session attempt,1 response start/completed response**,31.345seconds from credential request to final cleanup, below120s. Exclusive correction lock and fsynced ledger preceded Start. Status **COMPLETE_ONE_ATTEMPT_NO_MORE_LIVE_WORK**; optional second attempt unused and no further acquisition justified. All old exhausted ledgers remain unchanged.

Realtime usage1079tokens:751input (708text/43audio),328output (102text/226audio),0cached;39reasoning is a subset, not added twice. ASR59tokens:43input audio/16output text. Known response estimate **US$0.00561960**, ASR **US$0.00013375**, total **US$0.00575335**, cached/undiscounted estimates identical. Actual billing/prior project cost unknown, not zero. Numeric usage is retained in `summary.json` and `session-1/live-results.json`; no additional paid turn was needed to repair observation or wording.

### Verification / acceptance / remaining gates

| Check | Environment and observed result | Status |
| --- | --- | --- |
| Corrected build identity |Read-only114input/source hashes, exact build YhkhD73NHaU1gpomogsBg |PASS |
| Passive observer |Offline native fixture, no app/provider/DB; play/playing/UI/time/binding/cleanup and native identity checks |PASS |
| Single WAV |Original main PCM/gap hash equal, zero other speech, duration beyond allowance/no loop |PASS |
| Acceptance1normal owned setup/playback |Actual local native WebRTC, full ACK-before-media, UI available + native playing/readyState/time |PASS |
| Acceptance2question/answer/output completion |Actual one ASR/answer, target facts2/2, real HTML timeline through matching completed response/stopped buffer; incidental medium-label error disclosed |PASS for specified targets |
| Acceptance3Stop/remove/defaults |Actual owned routes, retained turns/full preview, released native resources/listeners/profile/server, fresh default unavailable/no-store/zero resources |PASS |
| Final preservation audit |Protected493/prior429/private unchanged,114input/build hashes match, recorded PIDs exited/ports free |PASS |
| Unchanged full application suites/build |Not rerun, as required; no code correction. PM’s prior239focused checks and existing final suites remain historical evidence |NOT_RUN this correction |
| Human listening, first-audible latency, physical mic/barge-in/phone, real-person/noisy-speech usability, hosted/YouTube/full evaluation |No such evidence collected |NOT_RUN |

Meaningful commands used the pinned Node executable `.tools/node-v24.22.0-win-x64/node.exe`; exact UTC/exits/log context are in correction `commands.jsonl`, including final audit invocations. The inline initial preparation command's complete execution interval was not retained (baseline started02:05:47.442UTC); hashes/preflight independently verify its output. No timings are fabricated.

| Exact command | UTC start | UTC end | Exit |
| --- | --- | --- | --- |
|node artifacts/local/08f/correction-1/observer-check.mjs|2026-10-21T02:06:33.063Z|2026-10-21T02:06:35.030Z|0|
|node artifacts/local/08f/correction-1/preflight.mjs|2026-10-21T02:07:17.236Z|2026-10-21T02:07:17.552Z|0|
|node artifacts/local/08f/correction-1/live.mjs 1|2026-10-21T02:09:01.719Z|2026-10-21T02:09:37.098Z|0|

No code correction, second attempt, rebuild, commit/push, public activation or next task. PM reviews this bounded result; broader original Step08/09/device/release gates remain open.
