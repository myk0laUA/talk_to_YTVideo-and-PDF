# Task 08M — automatic speech activation candidate

**Outcome: implemented; proposed READY_FOR_REVIEW for offline scope.** PM owns acceptance, deployment and physical comparison. Original Step08/12 remain open. One candidate only; voice stays enabled under the last PM-recorded hosted configuration.

## Identity and boundary

Clean arrival on `main`, HEAD **ac6759ab3ec321fa352cd747c2e896cb2b206ad5**, newer than the brief's ee5b5d4. Final code identity is that HEAD plus the uncommitted diff listed below; no commit or push. Tested local production build **3-El-Z-klqlvRbPgJxn3X**. All execution used **Node24.22.0/npm11.19.1**. The PM-recorded deployment remains application2d68242 / Render dep-dbcgd83rjlhs73bcmgug; the worker did not access or change it.

No paid/provider call, environment edit, shared database access, dependency/framework change, new control, retry/reconnect, recording or product raw-event retention. Prior spend ledgers and handoff history are preserved. No later task started. No React or Next.js implementation change; OpenAI Docs and the project Playwright skill were applied for contract research and existing isolated browser verification. No design audit.

## Evidence, hypothesis and exact candidate

The user reports deployed08L works on iPhone but remains sensitive; PM records speech-trigger cancellations and short unexpected-language transcripts. These observations do not establish the acoustic cause or whether each cancellation was unintended. Echo, handling/breathing noise and actual speech remain possible; effective device processing is unobserved.08L remains optional ideal echo-cancellation/noise-suppression preferences, not a proven acoustic fix.

The v4 baseline omitted the activation threshold, relying on the documented **0.5** server_vad default. Candidate **provider-voice-full-source-2026-10-21-v5** explicitly sets **0.6**, a modest absolute increase of0.1 on the documented0–1 scale. This is a product test candidate, not an empirically optimal value, a decibel adjustment or a measured percentage improvement. Requiring louder audio may reduce false activation but may miss quiet or distant deliberate speech, including the first question and follow-up. No threshold search or acoustic experiment was run.

Official OpenAI documentation searched and fetched21October2026 before selecting the candidate:

- [Client events / session.update](https://developers.openai.com/api/reference/resources/realtime/client-events): threshold range/default; disabled VAD uses null; updates return full effective settings via session.updated. Omitted settings retain their prior values.
- [VAD guide](https://developers.openai.com/api/docs/guides/realtime-vad): higher thresholds require louder audio; automatic conversation response/interrupt flags remain available.
- [Create client secret](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create): the same threshold contract is supported at session configuration. Issuance here intentionally keeps VAD disabled.
- [Server events / session.updated](https://developers.openai.com/api/reference/resources/realtime/server-events): effective session schema includes server_vad threshold. HTML retrieval exceeded the web tool size limit; the official Markdown was fetched successfully with Invoke-WebRequest into `artifacts/local/08m/server-events.md`.

| Stage / setting | v4 baseline | v5 candidate |
|---|---|---|
| Credential issuance | Text output, VAD null, transcription null | Same; no threshold object while VAD is disabled |
| Initial configuration ACK / source loading | Text output, VAD null, transcription null; no microphone/questions | Same; enabled VAD is rejected, even with0.6 |
| Final voice settings ACK | server_vad, threshold omitted (documented0.5 default) | server_vad, exact threshold0.6 required |
| Automatic response / interruption | create_response:true / interrupt_response:true | Same; hands-free default preserved |
| Speech-end silence / idle timeout | 600ms / null | Same |
| Browser capture / provider noise reduction | Ideal echo/noise preferences / provider default | Same; noise_reduction remains omitted |
| Transcription / voice / output cap | gpt-4o-mini-transcribe, no forced language/prompt / marin /2048 | Same |
| Text policy | provider-text-full-source-2026-10-20-v1,512 tokens; VAD/transcription null | Same at both stages |

## Changes and acceptance map

`src/shared/priming-provider-policy.ts` owns the only production threshold literal and versions voice to v5. `priming-manifest.ts` emits it only for final provider voice. `priming-controller.ts` validates exact manifest settings and effective final ACK threshold, and includes threshold in the settings fingerprint. Disabled initial VAD remains strictly null; the initial credential request/validation in `src/server/voice/provider.ts` is functionally unchanged, with an explanatory comment. No validation tolerance was added. Existing exact policy/projection checks reject stale v4 preparations before source reads or connection.

`tests/unit/provider-voice-admission.test.ts` adds15 cases for candidate agreement, initial/full-source/final ACK barriers, stale policy and wrong/missing manifest/policy/effective thresholds. Final ACK cases include omitted, null, stale0.5, wrong numeric, string and out-of-range values; late corrected ACK cannot revive failure. Enabled VAD in initial or stale initial ACKs at source/final phases rejects before microphone. `tests/unit/owned-voice.test.ts` adds3 issuance cases rejecting enabled VAD even with0.6. It still checks the exact source-free initial request and safe DTO.

`tests/voice-adapter/fakes.mjs` adds only synthetic numeric threshold summaries and missing/wrong final-ACK fault injection. `scripts/verify-voice-adapter.mjs` checks the built app's null→shared-threshold sequence for both source kinds and requires wrong/missing effective thresholds to fail at final_settings_ack with zero microphone/attachment. Documentation changes are this report, PROJECT_STATE and TESTING.

| Criterion | Evidence / practical limit |
|---|---|
| 1: evidence, one adjustable candidate and rationale | Comparison/documentation above; shared activationThreshold0.6 and v5 identity. Physical benefit is NOT_RUN. |
| 2: settings consistency and closed barriers; text unchanged |143 provider-admission units,125 owned-voice units, built threshold fault tests; priming75; owned-text417. Credential/initial settings require null VAD rather than an irrelevant threshold. |
| 3: existing interactions and lifetime protections | Interruption64/lifecycle63, full1590 units, adapter107 units/557 built checks and owned392 built checks pass. Existing deliberate speech events, manual Interrupt, mute/unmute, follow-up, Stop, late events, ownership/expiry and08J clock-skew tests retained. Scripted speech-start events establish control semantics only. |
| 4: pinned offline verification | All commands below exit0; build precedes built-browser checks. No new dependency or framework migration. |

## Verification

All checks are **local Windows**, in `artifacts/local/08m/offline-checkout`: no private .env, reused dependency junction, empty real keys, unusable loopback database and existing outbound-denial preload/browser guards. Provider/SQL/native media are injected synthetic fixtures. Browser checks use built Next routes and simulated media/peer/channel; viewport emulation is not physical phone/audio evidence. The runner is `artifacts/local/08m/verify.mjs`, invoked with the pinned Node executable and the script names in order. `npm run test` runs the same package script as `npm test`. Logs and exact UTC timestamps/exits live in `artifacts/local/08m/commands.jsonl`.

| Command | UTC start–end (21 October2026) | Observed | Status / exit | Evidence under artifacts/local/08m/ |
|---|---|---|---|---|
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 19:03:46.149–19:03:47.107 | 143/143 provider-admission units | PASS/0 | `focused-2026-10-21T19-03-46-149Z.log` |
| `npm run lint` | 19:03:58.770–19:04:34.289 | Clean lint | PASS/0 | `lint-2026-10-21T19-03-58-770Z.log` |
| `npm run typecheck` | 19:04:34.292–19:04:56.988 | Prisma/Next/TypeScript pass | PASS/0 | `typecheck-2026-10-21T19-04-34-292Z.log` |
| `npm run test` | 19:04:56.991–19:05:03.466 | 1590/1590 units | PASS/0 | `test-2026-10-21T19-04-56-991Z.log` |
| `npm run build` | 19:05:03.467–19:05:14.678 | Production build 3-El-Z-klqlvRbPgJxn3X | PASS/0 | `build-2026-10-21T19-05-03-467Z.log` |
| `npm run test:priming` | 19:05:14.679–19:05:15.519 | 75/75 units | PASS/0 | `test-priming-2026-10-21T19-05-14-679Z.log` |
| `npm run test:interruption` | 19:05:15.520–19:05:16.217 | 64/64 units | PASS/0 | `test-interruption-2026-10-21T19-05-15-520Z.log` |
| `npm run test:lifecycle` | 19:05:16.218–19:05:16.871 | 63/63 units | PASS/0 | `test-lifecycle-2026-10-21T19-05-16-218Z.log` |
| `npm run test:voice-adapter` | 19:05:16.872–19:05:44.177 | 107/107 units +557 built checks/48 scenarios; external network0 | PASS/0 | `test-voice-adapter-2026-10-21T19-05-16-872Z.log` |
| `npm run test:owned-voice` | 19:05:44.178–19:06:02.037 | 125/125 units +392 built checks; external network0 | PASS/0 | `test-owned-voice-2026-10-21T19-05-44-178Z.log` |
| `npm run test:owned-text` | 19:06:02.038–19:06:15.653 | 417 built checks; no live calls | PASS/0 | `test-owned-text-2026-10-21T19-06-02-038Z.log` |

Expected result for each command was its existing assertions passing or clean lint/type/build output. No test/build failures occurred. No red-baseline run was performed. One evidence-inspection command used a nonexistent browser-results.json path and exited1; corrected discovery found the actual built-application.json. The first documentation/audit helper also exited1 because it incorrectly expected12 command rows; corrected to the actual11 (one focused plus ten required package commands). These were evidence-helper failures, not product/test failures. The earlier failed patch context was corrected before any files in that patch changed.

Built adapter evidence: `offline-checkout/artifacts/local/08d/built-application.json`,48 scenarios/557 checks, forbiddenNetwork0. Owned voice: `offline-checkout/artifacts/local/02d/built-http.json`,392 checks, forbiddenNetwork0. Owned text:417 checks, no live calls. Scripts assert listener/track/peer/timer/ticket disposal and late-work containment; the final audit independently checks relevant TCP ports are released. No raw provider audio/session event capture or user's source was used.

`artifacts/local/08m/changed-files.sha256.json` contains exact hashes for all11 delivered files. `audit.json` records HEAD, dirty status, build identity, matched application/build inputs, unchanged lockfile and source-copy equality. The production code delivered matches the tested build inputs. Documentation was completed after verification; no implementation edits followed the successful checks.

## PM/device comparison — NOT_RUN

After review and PM deployment, reload to discard v4 preparation. Use the same iPhone/browser, source, speaker volume and position as the08L comparison. Request a concise summary and listen silently at normal and close-held distance. Record false cancellations separately from missed deliberate speech. Deliberately interrupt an audible answer at ordinary speaking volume, ask a follow-up, verify a complete reply, then Stop. Also check Chrome summary/follow-up. Record exact device/browser/OS, source, position/volume and build.

Stop after the first unexpected failure; retain safe completion reason and numeric usage details only. If false activation persists, one headset comparison may help isolate speaker feedback. If deliberate speech becomes unreliable, PM returns/reverts to the previous v4 policy rather than approving this candidate or running a threshold search. Actual provider acceptance, iPhone/Chrome acoustic behavior, reduced false cancellation and quiet-speech reliability remain **NOT_RUN**. The candidate is not accepted as an improvement until physical comparison supports it.

Return to PM at **READY_FOR_REVIEW**; no deployment or subsequent task is authorized by this handoff.
