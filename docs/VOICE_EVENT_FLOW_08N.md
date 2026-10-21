# Task 08N — interruption isolation and bounded evidence capture

Proposed **READY_FOR_REVIEW (partial diagnosis)**, 21 October 2026 Toronto. PM owns acceptance/deployment. This report covers only Task 08N under original Steps 08/09.

## Result and identity

An independent manual-interruption race is reproduced and corrected: an untargeted clear queued under native data-channel backpressure could be sent after a newer answer started. This is **not an established cause of the user's spoken-only symptom**. VAD interruption sends no application cancel/clear/create command. The reported headphone symptom remains **NOT_REPRODUCED offline**; one safe, bounded event recorder is provided for the PM's single physical observation.

Branch `main`, starting/final HEAD `b1acb24961ced48175f06c53afa37a4435c0fac2`, dirty delivery, no commit or deployment. The task's historical starting HEAD d6f9e15 is superseded by the checked-out PM handoff at b1acb24. Local final production build **r7IDUuBTM5ZJHzPMr_6kQ**, pinned Node **24.22.0**, npm **11.19.1**. Hosted 74ec316 remains unchanged and voice stays enabled. Hashes and complete dirty identity: `artifacts/local/08n/changed-files.sha256.json`, `audit.json` and `delivery.patch`.

## Required investigation order and red-before evidence

Before application behavior changed, the first focused offline run exercised track separation, delayed/interleaved transcript attribution and the real BrowserVoiceTransport queue. Two passed; the queued-clear case failed. See `artifacts/local/08n/focused-2026-10-21T19-53-03-198Z.log` (exit 1, 2 pass/1 fail). The failing assertion expected only `response.cancel`, but native send history also contained `output_audio_buffer.clear` after the new response started.

Reproduction: create response A and start its buffer; manually interrupt A with an initially writable channel; raise `bufferedAmount` to 100,000 before the cancel promise continuation; the controller enqueues clear; deliver response B and its buffer-start; lower the buffer and drain. The enqueue-time identity check had already passed, and the FIFO previously had no validity check at native send time. This changes newer output even though cancel itself is targeted at A. It requires the manual command path and cannot itself establish why a spoken Stop or unexpected sound produced a new response.

The narrow fix passes an optional validity predicate through PrimingTransport/PrimingBridge to BrowserVoiceTransport. It checks pending ownership, current response and output identity immediately before native send. Superseded writes resolve as dropped commands; normal sends keep FIFO order, fixed deadline, byte/item bounds, rejection and Stop cleanup. The green-after run at `focused-2026-10-21T19-53-46-891Z.log` passed the same three tests, exit 0. Extended coverage checks actual enqueue/send/drop separately, new output survival, successful dropped-promise completion and rejection on close. No wire command or provider setting was added.

Only after these checks did diagnostic instrumentation begin. The existing transcript `interrupted` flag was then characterized separately: it includes pending/failed observations even when terminal generation is completed. It is not proof of cancelled audio. That historical label behavior is retained; the trace exposes terminal status/reason and buffer observations separately. Another replay confirms that an old pending interruption can cross a new response, delay the new interruption's attribution/manual action until old confirmation/timeout, and leave microphone input enabled. It sends no command and starts no generation. No unrelated controller-state rewrite is proposed as a symptom repair.

## PM hypothesis matrix

| Priority / hypothesis | Evidence for / against | Finding and remaining discriminator |
| --- | --- | --- |
| 1. Detected input triggers provider automatic generation | Preserved final v5 manifest enables `create_response` and `interrupt_response`. Native fixture replays speech-start, cancellation with `turn_detected`, clear, speech-stop, commit and response B; records response ordinals 1/2 with zero outbound create/cancel/clear. | This distinguishes a new provider response from local playback **in the replay**. It does not prove the real input's source or provider behavior. Device trace must establish the corresponding sequence and absence of actual outbound create. |
| 2. Effective capture/routing or input leakage/noise | Sender object is exactly the acquired local mic; separate remote stream contains the remote track. Duplicate native track deliveries leave one track, one srcObject binding, no extra play. Supported/effective booleans are captured with explicit unknown values. | No application remote-to-sender path reproduced. Physical headset/input route and applied processing remain unknown until observation; requested constraints do not prove them. Even effective booleans cannot identify sound leakage or physical routing. |
| 3. Delayed untargeted clear affects a newer answer | Real queued-transport test fails before the fix and passes afterward. Trace shows enqueue without send while blocked, then drop after supersession. Targeted cancel and ordinary cancel→clear still work. | **Reproduced independent defect, corrected.** Manual command path; cannot explain the spoken-only report without an observed manual enqueue/send. |
| 4. Transcript labels/order mislead | Pending, failed and completed-generation replays show `interrupted` can be displayed without a cancelled terminal. Delayed ASR, duplicates, interleaved items and deliberate cross-role events never transfer assistant text into a user item. Old pending VAD delays attribution, but leaves input live and emits zero commands. | Label ambiguity is real; assistant→user text misattribution was not reproduced. UI ordering alone cannot establish event/audio order or renewed audible speech. Read terminal reason and buffer facts separately. |
| 5. Stop/continue response behavior repeats context | Current voice policy contains no explicit stop/continue semantics; code has no keyword interception. No real model call was made. A brief acknowledgement is compatible with the task's expected semantics. | **Unresolved.** Only after wire/session/input evidence is correct can repeated introduction be classified as response behavior. No prompting, language, text filtering or keyword change made. |
| 6. Duplicate startup/subscription or playback replay | One controller owner is guarded by Start/mount lifecycle; native fixture counts one peer/channel/media/attach/priming batch/binding. Rerenders, mute, interruption, late events and duplicate tracks do not acquire another session or call play. Built UI checks confirm those counts and reset on explicit new Start. | No duplicate startup/re-priming/replay reproduced. A new response ordinal indicates generation; repeated audible old material with no new ordinal requires separate playback investigation. This is not physical audio verification. |

## Diagnostic contract and changed files

- `src/shared/voice-event-diagnostics.ts`: one memory-only recorder per explicit voice attempt; newest 256 rows, at most 128 response/item/manual-command identities per map, monotonically ordered local elapsed milliseconds capped at one hour, closed event/stage/direction/terminal vocabulary and bounded numeric counters. Maps stop assigning new ordinals at capacity, never reuse them, and clear at end. Derived safe rows/counters remain after Stop for inspection. Source/new-session replacement and disposal discard the recorder; late calls cannot append. Full-source ACK volume does not consume conversation item ordinals before microphone attachment.
- `src/app/voice-browser-adapters.ts`: one inbound transport projection and enqueue/native-send/drop projection; native acquisition, attachment, track delivery and playback binding counts; optional `getSupportedConstraints`/mic `getSettings` projection. Only boolean echo cancellation/noise suppression/automatic gain control are retained, with `unknown` for missing, unsupported-type or throwing observations. No permission retry. Sender and receiver wiring is unchanged.
- `src/shared/voice-response.ts`, `priming-controller.ts`, `voice-lifecycle.ts`: native-send validity fix and lifecycle ownership of the recorder. Session/priming/play/mute/interruption stages share the same recorder. No second event subscription, timer, telemetry sink, recording or provider call is introduced.
- `src/app/voice-session.tsx`: extend the existing collapsed **Voice setup details** to active/ended sessions with safe JSON. Opening refreshes its snapshot; updates use the existing lifecycle notifications. The dump wraps and has a bounded scroll area. No automatic Start/play/retry effect.
- `tests/voice-adapter/fakes.mjs`, three existing unit files, new `tests/unit/voice-event-diagnostics.test.ts`, and `scripts/verify-voice-adapter.mjs`: native track identity/dedup/play assertions, race regression, attribution/label characterization, safe projection/bounds/cleanup/capture tests, and built desktop/390px evidence. The fake MediaStream now matches native addTrack idempotence.
- This report plus historical-preserving entries in `PROJECT_STATE.md` and `TESTING.md` form the handoff.

No source/transcript text, raw events, audio, IDs, track/device labels, device IDs, credentials, cookies, permanent keys, owner hashes or environment objects enter diagnostic output. Ordinal maps hold only bounded protocol identifiers internally while active. Text fallback, source ownership/expiry, optional 08L preferences, exact v5/2048/0.6/600ms policy, full-source ACK barrier and intentional interruption remain intact.

Official OpenAI documentation rechecked before application changes: [Realtime conversations — Interruption and Truncation](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation). WebRTC's server-managed output buffer automatically truncates unheard output on interruption; manual buffer clear also truncates history. No client-timed WebSocket truncation was copied into this application. Audio and data-channel observations do not provide a single clock for heard-word timing.

## Verification

All commands below ran locally in the `.env`-free isolated copy at `artifacts/local/08n/offline-checkout`, with reused locked dependencies, empty real provider keys, unusable loopback DB and established outbound-denied preloads/browser routes. No real database, provider, deployed server or physical device was contacted. Build preceded built-browser checks. Raw UTC start/end, command/exits and logs are in `artifacts/local/08n/commands.jsonl`; corrected focused-command labels are explained in `commands.corrected.jsonl`/`ledger-notes.md` (the copied harness initially mislabeled focused runs; test output is retained unmodified).

| Check / command | Expected and observed | Exit / status | Evidence under artifacts/local/08n |
| --- | --- | --- | --- |
| First `node --conditions=react-server --test --test-name-pattern=08N tests/unit/voice-browser-adapters.test.ts tests/unit/transcript.test.ts` | Track/attribution pass, queued old clear violates newer output | 1 / expected RED | focused-2026-10-21T19-53-03-198Z.log |
| Same three focused regressions after fix | 3/3 pass | 0 / PASS | focused-2026-10-21T19-53-46-891Z.log |
| Expanded Task08N unit cases | 13/13 pass within the full suite | 0 / PASS | test-2026-10-21T20-01-47-552Z.log |
| `npm run lint` | Zero warnings/errors | 0 / PASS | lint-2026-10-21T20-01-40-354Z.log |
| `npm run typecheck` | Prisma generation, route types, tsc pass | 0 / PASS | typecheck-2026-10-21T20-01-44-960Z.log |
| `npm run test` (npm test equivalent) | 1603/1603 pass | 0 / PASS | test-2026-10-21T20-01-47-552Z.log |
| `npm run build` | Production build r7IDUuBTM5ZJHzPMr_6kQ | 0 / PASS | build-2026-10-21T20-01-54-056Z.log |
| `npm run test:interruption` | 66/66; deliberate interruption/late events/Stop retained | 0 / PASS | test-interruption-2026-10-21T20-00-20-289Z.log |
| `npm run test:lifecycle` | 63/63; acquisition/mute/play/cleanup retained | 0 / PASS | test-lifecycle-2026-10-21T20-00-21-004Z.log |
| `npm run test:transcript` | 67/67; asynchronous role/item attribution retained | 0 / PASS | test-transcript-2026-10-21T20-00-21-670Z.log |
| `npm run test:voice-adapter` | 113 units + 571 built checks/48 scenarios, zero forbidden requests | 0 / PASS | test-voice-adapter-2026-10-21T20-01-58-746Z.log; offline-checkout/artifacts/local/08d/built-application.json |
| `npm run test:owned-voice` | 125 units + 392 built checks on final build; zero forbidden requests | 0 / PASS | test-owned-voice-2026-10-21T20-04-37-219Z.log; offline-checkout/artifacts/local/02d/built-http.json |
| `npm run test:transcript-view` | First run 35/36; one page load failed ERR_NO_BUFFER_SPACE before harness init. No application behavior assertion failed there. One unmodified rerun 36/36 passes | 1 then 0 / PASS on rerun | test-transcript-view-2026-10-21T20-01-08-569Z.log; transcript-view-first-failure/ and .json; test-transcript-view-2026-10-21T20-02-26-372Z.log |
| `npm run test:owned-text` | 417 built checks pass, zero forbidden requests | 0 / PASS | test-owned-text-2026-10-21T20-02-35-936Z.log |
| Visual inspection, desktop/390px Chromium | Safe details wrap with bounded scrolling; native fixture counts preserved | PASS, viewport only | offline-checkout/artifacts/local/08n/pdf-1440-safe-details.png and youtube-390-safe-details.png |
| Live provider/physical headset/phone/hosted trace | No worker authorization for these calls/deployment | NOT_RUN | PM protocol below |

One intermediate typecheck failed exit 2 because TypeScript retained narrowing of a test getter across reset/start; the assertion was changed to avoid that false static narrowing and subsequent typecheck passed. Earlier build kW5GwOC2vb1W0PNGN-40F passed adapter/owned-voice checks before the diagnostic scroll-height refinement; final UI checks use the build above. Incidental read-only searches encountered nonexistent guessed filenames/Windows glob errors; subsequent discovery resolved them, no application result is inferred from those commands. No dependency/environment/database changes or next task.

## Acceptance mapping and remaining limits

1. Hypotheses and distinguishing evidence: matrix above; no acoustic root-cause claim. Independent backpressure defect fixed with red-before/green-after.
2. Regressions: native exact mic sender and remote playback identity, duplicate delivery, targeted cancel/queued clear, FIFO/drop completion, delayed cross-role transcripts, no create/re-prime/restart, old pending attribution and all retained interruption/mute/play/Stop cases pass.
3. Diagnostic fallback: allowlist, sensitive-payload exclusion, bounds, unknown-vs-false capture, 4096 source ACKs, Stop/late events/reset/restart/disposal pass. Existing full unit and owned boundary tests retain source/policy/text requirements.
4. Required pinned offline commands pass, with the initial expected race failure, resolved test type error and one browser-resource failure disclosed above.

The label's broad `interrupted` flag and old pending-attribution/manual-action gate remain limitations, not explanations of new audible speech. Effective processing, actual input route, real quiet-stop behavior, acknowledgement length, deliberate question recovery and provider success are unverified in this offline task. Do not approve full Step08/09/12 or acoustic acceptance from these fixtures.

## One PM-owned physical observation

After reviewing/deploying this candidate with voice still enabled, PM coordinates **one** headphone session. Use an authored neutral source, for example: “The trail guide lists Cedar at 2 km, Maple at 4 km and Pine at 6 km. Cedar opens at 8 am. All trails close at 6 pm.” No resume or hiring material.

1. Reload the candidate, import that source, explicitly Start, enable microphone/playback and ask for a concise summary. Record headphone type and the user's known input selection if available; do not infer routing from headphone use.
2. Say “stop”, then remain quiet for **five seconds**. A brief stop acknowledgement is distinct from renewed explanation. Do not terminate the session merely because “stop” was spoken.
3. If no unexpected event occurs, ask the distinct factual question “Which trail is four kilometres?” Preserve ordinary deliberate interruption behavior.
4. At the **first unexpected event**, do not retry. Open **Voice setup details** and retain only the safe JSON plus a brief report of what was heard and approximately when relative to Stop/quiet interval/question. Copy text when possible; source/transcript screenshots or recordings are unnecessary. Stop session afterward; derived safe details remain available. Source/new-session replacement clears them.
5. Compare inbound speech-start/stop, item commit and new response ordinal/terminal reason with actual outbound enqueue/send/drop, session/priming/play/binding counts and capture booleans. A new response after commit with no sent create supports provider automatic generation but does not identify the sound source. Repeated old audio with no new response requires playback investigation. Counts above one without an explicit action require owner/subscription review. Treat trace truncation/map capacity as incomplete evidence. Do not infer exact heard-word timestamps from data-channel times.

The other neutral scenarios (summary→stop→pause→continue; summary→interruption with a different question) remain distinct response-behavior comparisons for PM sequencing. They are not authorization for worker live retries or multiple new device sessions. No threshold, language, noise-mode or prompt cycling is proposed.

Return to PM: **READY_FOR_REVIEW, partial diagnosis with one independently reproduced correction and a bounded physical diagnostic candidate.**
