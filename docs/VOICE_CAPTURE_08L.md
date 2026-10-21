# Task 08L — optional microphone processing

21 October 2026 Toronto. Proposed **READY_FOR_REVIEW** for implementation/offline verification only. Physical acoustic improvement remains **NOT_RUN**; PM owns acceptance and deployment.

## Evidence and decision

The PM's iPhone user report and screenshot establish speech-trigger cancellation with short transcription fragments. They do not establish echo, breathing, handling noise, background speech, browser processing defaults or a defective VAD threshold. Chrome summary/follow-up acceptance on deployed cd48889 is retained. This incident is distinct from 08K's evidenced output-token truncation.

Inspection found the production browser factory requested `audio: true`; it did not request processing preferences or inspect track settings. The small correction requests `echoCancellation: { ideal: true }` and `noiseSuppression: { ideal: true }`. Echo cancellation targets speaker feedback; noise suppression targets non-speech input. Both are preferences, not exact device requirements. Unsupported preferences may be ignored; acquisition is still a single attempt behind existing initial/source/final ACK barriers. No capture retry, assistant-output microphone muting, transcript-length filtering or interruption removal was introduced.

These preferences may already match a browser's defaults and therefore may make no difference on the affected iPhone. Neither effective iPhone settings nor acoustic improvement was observed. No automatic-gain-control choice is justified by the supplied evidence, so its browser default is retained. No new production diagnostics, audio recording, device identifiers or raw provider-event collection was added. Existing safe completion details distinguish detected-speech cancellation, incomplete/max-output and transport failures.

## Documentation and provider contract review

Official sources retrieved on 21 October 2026:

- [W3C Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/#dom-mediatrackconstraintset): echo cancellation/noise suppression constraints and `ideal` versus required `exact` semantics support best-effort capture preferences.
- [OpenAI VAD guide](https://developers.openai.com/api/docs/guides/realtime-vad): threshold affects speech activation; silence duration detects speech end. Raising the existing 600 ms delay would not address onset sensitivity.
- [OpenAI session update reference](https://developers.openai.com/api/reference/resources/realtime/client-events): provider noise reduction precedes VAD; near-field and far-field modes depend on capture conditions. Omitted noise-reduction updates retain the current setting.

Reviewed issuance and its effective-session validator in `src/server/voice/provider.ts`, manifest construction in `src/shared/priming-manifest.ts`, and initial/final ACK validation in `src/shared/priming-controller.ts`. Issuance/initial configuration disable turn detection/transcription; final configuration enables server VAD, automatic response and interruption, 600 ms silence, and the selected transcription model. Provider noise reduction and threshold are not explicitly selected by this app; their effective values on the reported session are unknown. Choosing a new threshold or near/far-field mode without acoustic evidence would add an unmeasured tradeoff for deliberate speech. Provider policy remains v4/2048 with concise instructions, unchanged issuance/ACK agreement, text policy and full-source content. No policy-version change is needed for browser-only constraints.

## Regression and acceptance map

| Criterion | Evidence and limit |
|---|---|
| 1: justified change and regression | New built-browser assertions exercise the real production factory for PDF and YouTube fixtures. Original implementation fails with actual `{ audio: true }`; corrected build requests both ideal preferences. This proves the request contract, not acoustic improvement. |
| 2: optional support, admission, cleanup | Browser fixture reports no optional processing support, ignores ideals and rejects exact requirements. Both source flows reach ready with one acquisition and an enabled track. Existing permission-denial, Stop/stale/late-media, source-expiry and withheld-ACK checks remain in adapter/lifecycle suites. |
| 3: interaction semantics | Existing interruption/adapter suites cover speech events, manual Interrupt, mute/unmute, follow-up, playback and Stop. Unit suite retains separate cancelled/incomplete/transport terminal handling. All input and provider/media responses are synthetic. |
| 4: provider agreement | Not changed. Existing priming/owned-voice suites retained; no new provider settings or shared manifest change. `test:owned-text` is not required by this brief for browser-only changes. |
| 5: pinned offline checks | Command table below and ignored `artifacts/local/08l/commands.jsonl`. Existing .env-free copy, empty real keys, unusable loopback DB, Node network-denial preload and browser routing guards. |

Changes are limited to the browser factory, existing browser fixture/assertions, this report and the two historical trackers. No React state/lifecycle or framework change; selected OpenAI Docs and Playwright guidance used, no visual redesign. Original Step 01–14 and spend ledgers preserved. No provider/DB call, deployment, environment change, dependency, commit or push. Public voice stays enabled.

## PM physical acceptance — NOT_RUN

After PM review/deployment, reload the affected iPhone and import an authored non-sensitive PDF. Record browser/iOS version, speaker or headset and approximate volume. Ask for a concise summary and listen silently at ordinary distance, then the previously problematic close-held position. Stop on the first unexpected cancellation and retain only safe completion details. During a fresh answer, say a clear follow-up; verify deliberate interruption and a complete relevant response, manual Interrupt, mute/unmute and Stop with no lingering microphone activity. If false interruptions remain, do one controlled speaker/headset comparison; correlation alone does not establish echo. Recheck Chrome summary/follow-up. Physical testing and any next correction belong to the PM; this worker stops at 08L.

## Build identity and exact verification

Arrival was clean `main`, HEAD `c102a7429712e224239c791ea16e88bc755f2b47` (newer than the brief's b70f042). Delivery is dirty/uncommitted. Final local build **iEysEoBvbhE38zkwpQ85x**; Node **24.22.0**, npm **11.19.1**. No deployed build change.

Commands below ran via `node artifacts/local/08l/verify.mjs <script names>` using the pinned `.tools/node-v24.22.0-win-x64/node.exe` and npm CLI. `npm run test` is the same package script as `npm test`. Logs are under ignored `artifacts/local/08l/`; timestamps are UTC on 21 October 2026. All checks are local, with synthetic provider/DB/media; no physical-device result.

| Command | UTC start–end | Expected / observed | Exit / status | Log |
|---|---|---|---|---|
| `npm run build` | 18:16:42.895–18:17:05.506 | Command passes | 0 / PASS | `build-2026-10-21T18-16-42-895Z.log` |
| `npm run test:voice-adapter` | 18:17:05.508–18:17:15.283 | Expected original-contract failure; actual audio:true; 107 units pass | 1 / expected RED | `test-voice-adapter-2026-10-21T18-17-05-508Z.log` |
| `npm run lint` | 18:17:24.613–18:18:05.527 | Command passes | 0 / PASS | `lint-2026-10-21T18-17-24-613Z.log` |
| `npm run typecheck` | 18:18:05.530–18:18:09.613 | Command passes | 0 / PASS | `typecheck-2026-10-21T18-18-05-530Z.log` |
| `npm run test` | 18:18:09.615–18:18:16.051 | 1572 units pass | 0 / PASS | `test-2026-10-21T18-18-09-615Z.log` |
| `npm run test:priming` | 18:18:16.052–18:18:16.884 | 75 units pass | 0 / PASS | `test-priming-2026-10-21T18-18-16-052Z.log` |
| `npm run test:interruption` | 18:18:16.885–18:18:17.594 | 64 units pass | 0 / PASS | `test-interruption-2026-10-21T18-18-16-885Z.log` |
| `npm run test:lifecycle` | 18:18:17.595–18:18:18.261 | 63 units pass | 0 / PASS | `test-lifecycle-2026-10-21T18-18-17-595Z.log` |
| `npm run build` | 18:18:18.262–18:18:22.809 | Command passes | 0 / PASS | `build-2026-10-21T18-18-18-262Z.log` |
| `npm run test:voice-adapter` | 18:18:22.810–18:18:48.234 | 107 units pass; 530 built checks pass | 0 / PASS | `test-voice-adapter-2026-10-21T18-18-22-810Z.log` |
| `npm run test:owned-voice` | 18:18:48.235–18:19:06.092 | 122 units pass; 392 built checks pass | 0 / PASS | `test-owned-voice-2026-10-21T18-18-48-235Z.log` |

Original production build **IMpkHu9hpk5rfJJT-LzIR** was built before the source edit with new regression assertions. Its expected failure and zero external calls are retained in `red-built-application.json`. Final adapter result: 45 scenarios/530 checks, external calls 0; owned-voice: 122 units/392 built checks, external calls 0. No unexpected test failures. `git diff --check` exits 0.

Changed-file SHA256 manifest: `artifacts/local/08l/changed-files.sha256.json`. Final source copies match the tested checkout. Requested capture preferences are asserted; actual device processing is **unobserved**, and the fixture intentionally provides no processing support. Provider policy/manifest and text behavior remain unchanged, so `test:owned-text` was not run. Remaining gap is physical acceptance, not an offline test failure.
