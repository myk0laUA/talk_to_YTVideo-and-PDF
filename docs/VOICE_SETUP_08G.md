# Task 08G — Chrome voice setup diagnosis

21 October 2026, Toronto. **Partially implemented; proposed READY_FOR_REVIEW.** The reported hosted failure is **NOT_REPRODUCED locally**. No root-cause correction is claimed. Safe stage reporting is ready for PM review and a controlled hosted observation. PM owns completion and deployment.

## Identity and starting evidence

Clean arrival `main`, HEAD `806b32970b5d1a6298f1321c2025ef48f653a63b`; dirty, uncommitted delivery. Arrival `src/` matches deployed a416652. Existing sanitized evidence contained the user's generic-error screenshot/Chrome/no-prompt report, hosted text/restart successes and accepted local native playback, but **no failing hosted HTTP/native/ACK trace or device/OS/Chrome version**. Absence of a prompt cannot diagnose the cause because source setup precedes microphone access.

Baseline build **YhkhD73NHaU1gpomogsBg** was reused after **114 application input hashes** matched. New diagnostic build **BKAaUrr5lV6vuNI-D3rud** is separately identified; baseline live evidence is not a live test of this build. All commands use **Node 24.22.0/npm 11.19.1**. Dependency junction reused; no install or lockfile change. Native browser: Windows, Playwright Chromium **156.0.8078.4**, temporary profile.

Evidence: ignored `artifacts/local/08g/`, including `baseline.json`, `preflight.json`, `observer-check.json`, `session-1/live-results.json`, `commands.jsonl`, `changed-files.sha256.json`, `audit.json`. Built-suite reports/screenshots are under `offline-checkout/artifacts/local/`. Prior evidence/allocations are preserved. No user's PDF was requested or read.

## Reproduction before edits

`node artifacts/local/08g/live.mjs 1` (pinned executable), **04:10:02.070–04:10:36.998 UTC, exit 0**, 21 October (00:10 Toronto). Expected first failed stage or complete setup; observed complete setup, one grounded answer, browser playback and active Stop. **138 assertions, no capture gaps; no failing setup stage observed.** Actual local PDF parser/PostgreSQL/OpenAI WebRTC; ordinary native APIs, passive observer, no HTTP/provider/native mocks. Observer's offline native-peer/playback self-check passes.

Authored three-page Cedar Lantern PDF SHA256 `a593fb961f3a9bfa7775df5433ba8443dc9df45ff05d3d47c3131433dd1be7e8`. Single question: “What is the project codename, and who is the trial recorder?” Synthetic file-backed microphone WAV SHA256 `66c79f69056853fa435f899b6cd985fb152b4247d3fdaf74fd12505016cfc022`. This fixture is not the user's private one-page document.

| Stage | Observed baseline live result |
|---|---|
| Preparation HTTP/validation | 201/no-store; complete admission accepted |
| Credential issuance/validation | 200/no-store; exactly one request |
| SDP/native connection | 201 valid bounded text/plain SDP; remote description accepted, peer connected/channel open; no SDP body retained |
| Initial/source/final ACKs | All 11 initial properties match (VAD/ASR null); all 3 exact completed source ACKs; all 11 final properties match (fixed model, v3, 600 ms VAD, exact ASR) |
| Microphone | Normal application getUserMedia path, synthetic device; sender observed after full ACKs |
| Answer/playback | One completed factual Cedar Lantern/Mira Solen answer; normal playback control, native play/playing, readyState 4; HTML clock 9.693209→21.225939 seconds |
| Stop/removal/defaults | Active Stop retains both turns/full preview; tracks/peer/channel/audio/listeners released; only own fixture removed/read404-no-store; fresh baseline defaults: Start off, 3 voice POSTs503-no-store, zero native/external resources |

Page-relative times: initial ACK **7842.8 ms**, final ACK **8095.9 ms**, first sender **8222.4 ms**. Synthetic input and native media observations do not prove a real permission prompt, physical microphone, human audibility or phone behavior.

## Changes and reasoning

No speculative setup fix. Validation, model, v3/600 ms policy, ownership, expiry, single-use tickets, all deadlines and cleanup stay intact. No server module, route, text implementation or configuration changed.

| Changed file | Behavior |
|---|---|
| `src/shared/voice-diagnostics.ts` | Closed stage/outcome vocabulary, immutable per-attempt trace, maximum32 rows, elapsed time capped600000ms, numeric HTTP-status projection; freezes at failure/Stop |
| `src/app/voice-browser-adapters.ts` | Optional safe reporter for preparation/credential HTTP and validation, peer/local description, SDP HTTP/validation, remote description, peer/channel readiness and microphone request |
| `src/shared/voice-lifecycle.ts` | Owns trace, initial/source/final ACK stages, microphone attach, timeout/Stop outcomes; ignores stale reports, retains terminal trace, clears it on explicit fresh Start |
| `src/app/voice-session.tsx` | Failure-only Voice setup details; known preparation/ACK failures receive specific pre-microphone guidance |
| `tests/unit/voice-browser-adapters.test.ts`, `tests/unit/voice-diagnostics.test.ts`, `tests/unit/voice-lifecycle.test.ts` | Stage fidelity, no leakage/bounds, malformed and timeout paths, ACK/media barriers, Stop/late/stale behavior |
| `scripts/verify-voice-adapter.mjs` | Built failure-details/no-leak assertions and synthetic screenshot |

Rows accept only `stage`, `outcome`, `elapsedMs`, optional numeric `httpStatus`. They never receive errors, raw responses, SDP, credentials, cookies, owner hashes, IDs, source text or environment objects. No logging, telemetry, storage, debug endpoint, automatic retry or background session. Reporter progress does not invoke observers inside resource acquisition, preserving reentrant cleanup behavior.

HTTP failure identifies the failing boundary/status, not the server's private ownership/mint rejection reason. `invalid` means a rejected contract, not why the host returned it. Elapsed values are since Start, monotonically clamped. The existing total ACK deadline still starts before connection, unchanged.

## Verification

Ordinary checks run in the separate **08G .env-free copy**, empty real keys, unusable loopback DB and existing network-denied harness. Built checks use **BKAaUrr5lV6vuNI-D3rud**. Exact UTC/exits/commands and retained development failures are in `commands.jsonl`. Mocked provider/SQL/media tests are separate from baseline live evidence.

| Command/check | Expected / observed | Status |
|---|---|---|
| Complete-trace assertion with original HEAD application files | Missing diagnostics fails before instrumentation | Expected FAIL/1, `diagnostic-red.log` |
| `node --conditions=react-server --test --test-name-pattern=08G tests/unit/voice-browser-adapters.test.ts` | Correct stages, hostile-field rejection, late/stale/Stop handling | PASS/0,18 tests |
| `npm run test:lifecycle` | ACK/media barriers, fixed timeout category, cleanup | PASS/0,63 tests |
| `npm run test:priming` | Exact source/settings barriers/validation | PASS/0,75 tests |
| `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | Zero lint/TS errors, all units, production build | PASS/0,1490 final units; ledger uses equivalent `npm run test` |
| `npm run test:voice-adapter` | Owned composition/native adapter and actual safe failure UI | PASS/0,75 units+444 built checks; final added stale test included in1490 units |
| `npm run test:owned-voice` | Default-off, ownership, expiry, single-use issuance | PASS/0,94 units+392 built checks |
| `npm run test:owned-text` | Microphone-free text/ownership intact | PASS/0,417 built checks |
| `npm run test:voice-session`, `npm run test:mode-switch`, `npm run test:recovery` | Controls, single owner and failure/departure cleanup | PASS/0,208/156/248 checks, zero flaky/skipped |
| Native observer self-check / baseline live | Unchanged APIs; actual ACK→media→answer→playback→Stop | PASS/0, separate baseline build |
| Hosted diagnostic reproduction / physical Chrome prompt/audio | Affected environment's first failing stage | NOT_RUN, PM/human owned |

Initial post-edit focused run exposed a TypeScript parameter-property constructor unsupported by Node strip-only execution; replaced with explicit fields. Failed command/log retained. The original-HEAD red assertion proves diagnostic visibility was missing; it is **not proof of a repaired hosted cause**.

Final audit: **115 application inputs** match the diagnostic build's copy, **490 protected tracked files**, **429 prior evidence files**, **4 additional prior-ledger hashes** and the private `.env` hash unchanged. Eleven delivery SHA256 entries are in `changed-files.sha256.json`. Both live server PIDs exited; ports3119/3120/3121/3122/3123/3124/3126/3128/3129/3138 rebind successfully. `git diff --check` exits0. Final test-only addition and documentation updates did not change the build's application inputs. Failure screenshot was visually inspected; it explicitly shows a synthetic initial-settings rejection and contains only safe rows.

## Acceptance and remaining work

1. **Reported failure NOT_REPRODUCED** locally before edits. Missing observation is a controlled hosted trace on affected Chrome/device; no screenshot-based cause inferred.
2. Instrumentation has a before/after regression, malformed/timeout/late/stale/Stop/no-leak tests and built failure UI. No microphone before source/final ACKs, release after Stop/failure remains verified. No setup-policy fix claimed.
3. Owned-voice/priming/lifecycle/text/composed browser checks preserve ownership, exact effective policy, no automatic retry, single owner and cleanup; final preservation audit supplements them.
4. Baseline native setup, one grounded response, normal HTML playback and Stop pass with synthetic input. New diagnostic build is verified offline only. Hosted/physical verification remains separate.

Separate **08G allowance closed at1session/1response**, optional second unused. Conservative two-attempt preflight **US$0.39448** fits0.50, including4minutesASR/uncertainty/reserve. Current [official pricing](https://developers.openai.com/api/docs/pricing) for fixed `gpt-realtime-2.1-mini`: text $0.60/$2.40 and audio $10/$20 per million input/output; `gpt-4o-mini-transcribe` $1.25/$5 per million, estimated $0.003/minute. Observed numeric response **US$0.00567080**+ASR **US$0.00013375**=**US$0.00580455**. Actual billed/prior/cumulative cost unknown; not a hard bill cap. Credential-to-Stop27.307seconds; profile/server/resources closed within120seconds. Existing ledgers were not reused/reset.

## PM-only controlled hosted procedure

After review, PM may publish/deploy instrumentation through the existing release workflow and arrange **one controlled hosted check** under its own activation/allocation controls. Worker changed no Render setting or public gate. Do not ask the user to keep retrying the contained failing build.

1. Record deployed commit/build, hosted context, device/OS and exact Chrome version. Use an authored small one-page PDF. Verify preview and Text first.
2. Refresh, choose Voice, explicitly Start once. On failure open **Voice setup details**; retain only stage/outcome/HTTP-status/elapsed rows. Report last successful/first failing row and whether a microphone prompt appeared. Do not capture bodies, headers, HAR, cookies, SDP or credentials. Stop on the first failure; no repeated Start.
3. If microphone access is reached, record prompt/permission result, enable normal playback, ask one known factual question and report audible answer, interruption/follow-up and Stop separately. Those are human/device gates.
4. Preserve text/PDF and contain voice on failure. Return the observed first failing stage in one bounded worker brief. A preparation/credential HTTP failure can need further internal server diagnosis; do not weaken validation or timeouts based only on a status.

Exact hosted cause/fix, hosted/physical voice, human audibility, hosted YouTube, full grounding evaluation and release acceptance remain open. No `.env` edit, migration, shared cleanup, service/billing change, deployment, commit/push or later task. PM decides completion.
