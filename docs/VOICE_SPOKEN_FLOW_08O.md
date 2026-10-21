# Task 08O — READY_FOR_REVIEW, conditional prompt candidate

21 October 2026 Toronto. Worker scope: offline diagnosis, one voice-only candidate and comparison preparation. Neither reported symptom is established fixed. No provider execution, deployment, database change, dependency change or public-access change. Voice stays enabled on the PM's last verified host, 5d496b1. Original Steps 08/09 and physical acceptance remain open.

## Identity and delivery

Arrival: clean `main`, HEAD `6de4fb111419ec45b26ca156e855758bfbccf07a` (newer than the brief's b6624b5). Delivery is this HEAD plus dirty files; no worker commit. Local build `ducfQssE9QVLoPltybUbS`. Application change is only `src/shared/priming-provider-policy.ts`: v6 adds Stop/Continue/new-question behavior to the voice instruction. Text policy, controller, capture, threshold 0.6, silence 600ms, 2048 output cap and ownership/expiry remain unchanged.

Tests: `tests/unit/provider-voice-admission.test.ts`, `tests/unit/voice-spoken-flow.test.ts`. Comparison preparation: `scripts/prepare-voice-08o.ps1`, `scripts/prepare-voice-08o.mjs`, `scripts/compare-voice-08o.mjs`. This report and historical-prefix updates to PROJECT_STATE/TESTING complete the delivery. File SHA256, dirty patch, final identity and command ledger are in `artifacts/local/08o/`.

## Separate failure assessments

| Failure | Observed facts | Reproducible trigger | Causal evidence | Eliminated within inspected/tested scope | Remaining unknowns |
| --- | --- | --- | --- | --- | --- |
| Spoken Stop followed by beginning-again answer | User reports failed spoken Stop/repetition; screenshots show acknowledgements and repeated summaries. Trace fragment does not show the full sequence. v5 has no Stop/Continue instruction. | Inject summary → speech-start → terminal/clear → input commit → new response, then five seconds with no input/events. Also explicit Continue and a new bridge question. All preserve one session and emit zero post-ready commands. | Prompt omission is demonstrated; its causal role in actual repetition is UNPROVEN. A new response ordinal would establish distinct generation, while the same ordinal's output needs playback correlation. No reproduced controller restart defect. | Tested events cannot call Start, re-prime source, send response.create/cancel/clear, or cause a retired response to replace the current response. Delayed ASR is not a control channel. This does not eliminate unobserved live/provider/media behavior. | Did Stop overlap actual sound? Did provider cancel or finish? Which response was heard restarting? Was the prompt misunderstood? Was repetition regenerated or buffered playback? Does v6 help? |
| Interruption while user says nothing | User report; blank displayed turns followed by replies; latest headset route unconfirmed. Empty ASR does not measure audio silence. | Explicitly inject a speech event during a known synthetic zero-input premise and muted track. Controller observes it and emits no commands. Separately native Chromium file capture verifies an authored zero interval. | The replay proves how the client reacts to an unexpected provider event, NOT that VAD emits it on silence. No live zero-input provider reproduction. | No remote playback-to-mic wiring or automatic client generation found; prior 08N separation/queue tests retained and rerun. No evidence that hiding blank transcript turns would affect generation. | Effective phone route, capture processing, acoustic input, provider VAD, transport/media behavior, and whether a complete trace has gaps. Headphones are a separate physical comparison, not proof of silence. |

No acoustic setting changed. The 08N stale MANUAL clear guard is preserved; that independent defect is not reused as the spoken-only explanation.

## Instructions and history, from source to final ACK

1. `src/server/context/document.ts:10` BEHAVIOR supplies grounding, source/inference distinction, citations, untrusted-source handling and concise source-aware follow-ups. `contextVariants` supplies the same behavioral instructions alongside full text/structured sections. No conflicting demand to restart or always summarize was found.
2. `src/server/voice/provider.ts:12` credential bootstrap has only the loading instruction, text modality, no VAD/transcription, tools disabled and 2048 cap. No source is placed in this credential response.
3. `src/shared/priming-manifest.ts` `encodeManifest` joins BEHAVIOR, JSON-fragment reconstruction rules and the voice-only `answerInstructions`. Configure replaces bootstrap instructions with this complete string plus the loading suffix. Each ordered source fragment is a user-role input_text item containing JSON data, never a new system instruction.
4. After every source item ACK, finalize replaces the configure instruction string with the same grounding/reconstruction/voice instructions plus `Context loading complete.` It enables audio, server_vad/create_response/interrupt_response, 600ms/0.6 and input transcription. This is replacement, not an accumulating stack of loading instructions.
5. `src/shared/priming-admission.ts` regenerates the exact manifest from the policy/variant. `src/shared/priming-controller.ts:196` requires exact instruction equality and matching effective settings; source item fidelity/order and final ACK precede microphone acquisition. New v6 test rejects stale v5 admission before source reads and altered final ACK before media, including a late corrected ACK. Existing valid final ACK cases pass with v6.
6. `src/shared/voice-lifecycle.ts:249` routes events to priming only before protocolReady. Ordinary speech/response/transcript events thereafter go to transcript/response controllers. No source resend or instruction update is attached to these events. Replays compare the complete outbound list before/after and count prepare/connect/media/attach exactly once.

Source items and prior input/output history remain in the provider conversation across interruption; client code sends neither item deletion nor a new conversation. The provider may remove the unplayed portion of interrupted assistant output. Local transcript remains a separate projection and may retain generated text with interrupted/pending labels; it is not a word-for-word record of heard audio. Context-capacity truncation remains disabled and is distinct from interruption trimming. Stop session/source replacement starts a different lifecycle; spoken Stop does not invoke that control.

Official sources fetched 21 October: [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) documents automatic VAD interruption and server-managed WebRTC output buffering/trimming; [session.update](https://developers.openai.com/api/reference/resources/realtime/client-events) documents updates to supplied fields and the effective session ACK. These support using provider WebRTC semantics rather than guessed WebSocket truncate timestamps. They do not establish exact word alignment or diagnose the user's recording.

## Event paths and races

```mermaid
sequenceDiagram
    participant App
    participant Provider
    participant Speaker
    App->>Provider: configure (loading; VAD off)
    Provider-->>App: exact configuration ACK
    App->>Provider: ordered full-source items
    Provider-->>App: all item ACKs
    App->>Provider: finalize (complete; automatic turns on)
    Provider-->>App: exact final ACK
    App->>Provider: attach microphone; audio media
    Provider-->>App: speech_started (client observes only)
    Provider-->>App: old response terminal / output clear (order can vary)
    Provider-->>App: speech_stopped / committed input
    Provider-->>App: response.created with new identity
    Provider->>Speaker: remote media
    Provider-->>App: response.done (generation may end before playback)
    Provider-->>App: output_audio_buffer.stopped
```

```mermaid
sequenceDiagram
    participant UI
    participant Controller
    participant Provider
    UI->>Controller: manual Interrupt answer
    Controller->>Provider: response.cancel (targeted, if generating)
    Controller->>Provider: output_audio_buffer.clear (08N send-time guard)
    Provider-->>Controller: terminal + buffer end confirmation
    Note over Controller: no response.create, source reload or ASR keyword control
    UI->>Controller: Stop session
    Controller->>Provider: close transport; release microphone/playback
```

`src/shared/voice-response.ts:150` observes spoken VAD; `:172` accepts new response identities and retires old ones; `:198` tracks independent output state. A pending interruption for A can remain while B begins, delaying manual interruption/attribution until A confirms or the five-second timer expires. Existing 08N regression characterizes this; it emits no restart command and does not mute B. No new failing controller regression was found, so no speculative controller change was made.

Generation done is not buffer stopped. Late A terminal can confirm A without changing B's generation; late A output cannot replace B's active output. Duplicate/retired created events are ignored by the controller. A confirmed interruption means generation and buffer end were observed; it does not require a cancelled terminal and does not establish when sound stopped. `src/shared/transcript.ts:183` keeps delayed/blank transcription on the input item, independent of response creation. `src/app/voice-browser-adapters.ts:285` binds remote tracks to playback; local capture is separately attached as sender. No replay or source reconstruction is performed on ordinary response events.

## Candidate, not a fixed symptom

v6 preserves the concise-answer prefix and adds: when asked to stop, end the explanation with at most a brief acknowledgement then wait; never restart/resume without a fresh request; on explicit Continue, continue the remaining point rather than the introduction, without claiming exact word-level resume; answer a new question directly. Text policy remains v1/512. Credential loading instructions remain deliberately unchanged; the candidate enters both manifest instruction stages and is enforced by exact admission/final ACK.

Red evidence: `focused-2026-10-21T20-33-43-222Z.log`, 5/6 pass, exit1 on expected v6 versus v5. This is a candidate configuration regression, NOT a reproduced acoustic/controller defect. After change: same six cases pass at 20:34:01Z and 20:38:16Z. First command-ledger row inherited an incorrect 08N display label from the copied runner; actual arguments were the two 08O files with `--test-name-pattern=08O`. Later rows are corrected; original log/row retained. Intermediate typecheck exit2 was a new fixture's `page` instead of required `id/pageNumber`; corrected, subsequent typecheck passes. Exploratory rg commands using Windows wildcard path operands and one guessed absent 08E preparation script failed; no evidence relies on those results.

## Verification

Pinned `.tools/node-v24.22.0-win-x64/node.exe` and its npm11.19.1. Default shell Node26/npm12 were inspected only, never used for project verification. Existing 08N isolated-copy runner was adapted into `artifacts/local/08o/verify.mjs`: no .env, empty keys, unusable loopback DB, Node outbound denial and existing browser harness guards. No new dependency. Build precedes browser suites. Timed ledger is `commands.jsonl`; detailed logs and isolated harness reports retain local versus simulated context.

| Command/check | Observed | Exit/context |
| --- | --- | --- |
| `npm run lint` | PASS, latest 20:39:20–20:39:25Z | 0, isolated |
| `npm run typecheck` | PASS after fixture correction | 0, isolated |
| `npm test` (runner invokes equivalent `npm run test`) | 1609/1609 | 0, isolated; latest 20:38:24–20:38:30Z |
| `npm run build` | ducfQssE9QVLoPltybUbS | 0, 20:35:17–20:35:24Z |
| `npm run test:interruption` | 66/66 | 0, deterministic |
| `npm run test:lifecycle` | 63/63 | 0, deterministic |
| `npm run test:transcript` | 67/67 | 0, deterministic |
| `npm run test:voice-adapter` | 113 units + 571 built checks | 0, synthetic HTTP/SDP/peer/media |
| `npm run test:owned-voice` | 125 units + 392 built checks | 0, synthetic provider/DB |
| `npm run test:owned-text` | 417 built checks | 0, synthetic provider/DB |
| focused 08O replays + policy barrier | 6/6 | 0, fake clock/media/events; source is authored trail guide |
| offline PCM preparation / driver `--check` | PDF/WAV identity verified | combined invocation exit0; no live mode |
| native file capture `node artifacts/local/08o/capture-check.mjs` | speech peak1; exact-zero peak0 over64 samples at20–23s | 0, native Chromium fake microphone, no provider |
| live driver / provider Stop comprehension / physical route | NOT_RUN | worker prohibited provider execution |

Later changes after build affect tests/comparison scripts/docs only; application policy build is unchanged. Fixture outputs contain authored speech only, not user audio. Native capture is an input-source check, not provider VAD or phone evidence. No fabricated live success, spoken timing or source grounding score.

## Runnable PM comparison protocol

Discoveries: 08F already has Chromium `--use-file-for-fake-audio-capture`, passive CDP data-channel discovery and local audio checks. Its driver is tied to its closed allowance and old multi-response scenario and must NOT be run/reused unchanged. 08N adds the bounded safe recorder with enqueue/send/drop, local response/item ordinals, terminal reasons and buffer events. New driver reuses these approaches, normal app upload/preparation/credential/SDP/media path, and current recorder; no proof endpoints, session injection or protocol commands.

Offline commands from repository root (already run):

```powershell
powershell.exe -NoProfile -File scripts/prepare-voice-08o.ps1
.tools/node-v24.22.0-win-x64/node.exe scripts/prepare-voice-08o.mjs
.tools/node-v24.22.0-win-x64/node.exe scripts/compare-voice-08o.mjs --check
```

Prepared `artifacts/local/08o/inputs/trail.pdf` and `comparison.wav`; identity.json has hashes, clip lengths and exact zeros. The 70s native input starts summary at3s, Stop at12s, Continue at27s and new bridge question at47s. Exact-zero intervals20–27s and55–70s are asserted from PCM. The driver adds an explicit UI Mute around60s after attachment, with normal Stop at71s. First zero interval remains unmuted. Both policies use the identical hashed waveform and same output route/volume. Do not regenerate between arms.

PM preflight: verify current model pricing and reserve an estimated worst case including one unexpected fifth response at2048 output tokens, repeated source/history input,70s audio/transcription and failed setup. Use at most two sessions/one v5 and one v6, aggregate estimate <=$1; do not treat a client timer/estimate as a provider hard-dollar cap. If a defensible reserve cannot fit, BLOCK before running. No automatic retry; failure consumes the reservation. Existing authorization belongs to PM, not this worker. Create a NEW ledger (never an old closed ledger) with:

```json
{
  "task": "08O",
  "approvedByPM": false,
  "pricingCheckedAt": "PM must supply checked date and keep calculation alongside",
  "maxEstimatedUsd": 1,
  "maxAttempts": 2,
  "reservePerAttemptUsd": 0,
  "attempts": []
}
```

PM supplies a reviewed positive reserve <=0.5 and sets approvedByPM true only after that review. Record exact application HEAD/dirty hashes/build/URL per arm alongside ledger. Use baseline v5/08N and candidate v6 in separate local application builds; normal server configuration and provisioning remain PM-owned. Start the actual built app with normal owned PDF/voice prerequisites, no proof flags; keep host access unchanged. The driver does not load .env, start a server or deploy. Launch one arm, wait for completion, inspect evidence before deciding whether the second arm is warranted:

```powershell
.tools/node-v24.22.0-win-x64/node.exe scripts/compare-voice-08o.mjs --run http://localhost:3000/ artifacts/local/08o/pm-comparison-ledger.json v5
# Only after PM selects and starts the candidate build and reviews the first arm:
.tools/node-v24.22.0-win-x64/node.exe scripts/compare-voice-08o.mjs --run http://localhost:3000/ artifacts/local/08o/pm-comparison-ledger.json v6
```

The driver launches a fresh visible Chromium profile and file-backed native mic, uploads the neutral PDF, clicks normal Voice/Start/playback, samples only safe details, then stops/releases and attempts owned deletion of its newly uploaded source. One credential request per arm; fifth observed response, recorder saturation, observer failure, preparation mismatch or deadline stops the run;85s after credential starts an independent stop/forced context close. Ledger reservation is flushed before Start, with per-arm permanent locks and a concurrent-run lock. A crash leaves the lock for PM review, not automatic retry. Cleanup status is recorded; failed cleanup is a gap, never reset a shared DB.

Safe report contains exact prepared final-instruction SHA256/policy/manifest hash, source count, final acoustic settings, independently observed ACK instruction SHA256/equality and source-ACK counts via passive CDP, and the complete bounded app trace including actual sends versus enqueues/drops and numeric response ordinals. Raw source, credentials, SDP, provider events and audio are not saved. ACK capture missing or recorder `limited` means incomplete evidence, not a pass. The strict application barrier additionally checks effective settings before attaching the mic. Final driver live path remains NOT_RUN; syntax/lint/default preflight and native file input were verified. A selector/observer incompatibility must return a blocker to PM, not trigger repeated paid attempts.

Human observer: keep a separate small table of wall-clock observation, current displayed/printed response ordinal, heard phrase (authored content only), whether Stop actually overlapped audible explanation, whether silence followed the acknowledgement, whether Continue resumed remaining points, whether the new question was answered directly, and any unexpected sound. Mark uncertain identity explicitly. Buffer/data-channel observation times are NOT heard-word timestamps; do not derive audio offsets or exact word-level resume from them. If summary finished before12s, label the overlap check NOT_EXERCISED; do not automatically repeat. A different new question should answer west bridge/east boardwalk, without a new summary introduction.

Interpretation: new ordinal with committed input and no sent response.create supports provider-triggered new generation, not client replay or a specific acoustic cause. Same ordinal audible restart needs buffer/track/media investigation. New speech events in known zero input versus the explicit muted interval isolate input-related hypotheses more tightly; media encoding/processing and observer alignment still limit conclusions. No event in the offline replay proves the model understood Stop. Zero-input native-browser success does not answer iPhone headset routing. Preserve each arm even on failure and reconcile usage with provider billing separately. Do not deploy or declare either symptom fixed from this comparison preparation.

## Acceptance mapping and handoff

Instruction replacement/history trace: documented with source locations and official semantics. Event path/late state: inspected, existing race regressions rerun, five new deterministic scenarios pass. Candidate: one voice-only v6 with exact rejection/ACK tests, unchanged text/acoustics. Comparison: runnable authored input builder/PM-only bounded driver and explicit interpretation/observer protocol; live effectiveness pending. Required checks and dirty/build identity: retained with failures and hashes. PROJECT_STATE/TESTING preserve prior history. Return to PM now; no later task or completion decision taken.
