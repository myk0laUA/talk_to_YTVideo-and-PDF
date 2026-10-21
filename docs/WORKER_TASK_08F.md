# Task 08F — natural pauses and live interruption/follow-up

Use prompts/WORKER_PROMPT.md. Sole active worker task under original Step08. Estimate90–150minutes. Offline regression/implementation first; then the bounded live check below. No deployment or public configuration changes.

## Outcome and starting evidence

Make normal short pauses within a question survive without premature answer generation, and verify an explicit interruption followed by a new question on the real local voice path. Preserve accepted both-speaker transcription and text fallback.

09C accepted locally with synthetic microphone/native WebRTC: build EBv0wdPqgWwrUXxwS9SvQ,11hashes matched, PM173focused admission/transcript tests passed; real two-question ASR/answers/order/buffer completion/active Stop verified. Earlier08E original WAV contained340–350ms internal pauses; observed200ms provider silence default split the question and cancelled an answer. Compressing the WAV proved transport, not real-person pause tolerance. This is the next concrete usability gap. Human audibility/phone and hosted gates remain open.

## Scope / decisions

Inspect src/shared/{priming-provider-policy,priming-manifest,priming-controller,voice-response,voice-lifecycle,transcript}.ts and existing voice/browser tests. Read current official server-VAD and WebRTC interruption docs. Use an explicit reviewed voice-policy revision with a conservative silence duration (start with600ms if current schema supports it), while retaining server_vad, automatic response/interruption, existing idle behavior and exact transcription model. Bind and verify the effective final value; initial VAD/transcription remain off. Avoid changing unrelated threshold/prefix/model/prompt fields. Do not claim600ms universally optimal; record measured behavior/latency and remaining human validation.

Reproduce the known pause split with the original uncompressed main question, or a clearly documented fixture preserving its voiced samples and340–350ms gap. Do not compress the gap to make acceptance pass. Exclude extra trailing spoken prompts that are not part of the question. Offline tests must show initial/final ACK policy, mismatch denial, no media before readiness, and existing interruption event ordering/late responses/cancelled transcript/mute cleanup. A small existing-controller correction is permitted only for a reproduced live or offline defect. No new voice architecture, push-to-talk mode, UI redesign or retrieval.

## Acceptance and offline checks

1. Explicit final pause policy is acknowledged before microphone; wrong/missing effective value, stale policy and altered manifest fail closed. Text-only and initial voice policies remain unchanged.
2. A natural-pause question is one transcribed user turn and one response, containing all intended words/facts rather than an early partial answer. Report end-of-utterance to first response/audio-event timing without equating packets to audibility.
3. Explicit ordinary UI Interrupt during an active assistant response stops its generation/playback as represented by provider/controller events, preserves honest partial text, and permits a fresh grounded spoken follow-up. No duplicate session, stale audio restart, premature second response or microphone leak. Distinguish cancellation of generation from clearing a completed but still-playing audio buffer; capture which occurred.
4. Both-speaker order/Stop retention/source preview, explicit mute/unmute and normal owned removal/default restoration remain correct. No fabricated transcription or audible-success claim.

Use Node24.22.0/npm11.19.1 in the established .env-free, empty-real-key, unusable-loopback-DB, outbound-denied copy. Add a focused regression, then npm run test:priming, npm run test:interruption, npm run test:transcript, npm run lint, npm run typecheck, npm test, npm run build, npm run test:voice-adapter, npm run test:voice-session, npm run test:owned-voice, npm run test:owned-text, npm run test:mode-switch and npm run test:boundaries. Run test:recovery if cleanup/departure changes. Keep fixture/event simulation separate from real-service evidence. Inspect interrupted/retained transcript screenshots at desktop/390px; no design overhaul.

## Live allocation / procedure

Standing user test-credit authorization applies. New US$1 estimated incremental ceiling including ASR, max2credential/session attempts and6response starts TOTAL, max180seconds from credential request per attempt. Preflight current pricing/duration/context bounds before acquisition. One initial session with at most3responses: natural-pause question, a question whose answer is deliberately interrupted, then a short grounded follow-up. A second session is allowed only for a concrete narrow fix or observer gap corrected offline. No blind retry/third attempt or purchase/billing change. Separate exclusive08F ledger/attempt locks; all09C/08E ledgers remain consumed and unchanged.

Use fresh local native Chromium profile/visitor, actual PDF/parser/PostgreSQL/owned routes/OpenAI and existing secrets privately. Only temporary process-local loopback/PDF/voice settings. Use offline-generated controlled speech through native file-backed microphone; no native API replacements, provider response interception, protocol injection or seeded source. Prepare timing and interrupt triggers offline so the live driver does not invent additional turns. Retain original WAV and fixture hashes. Use ordinary UI controls, passive safe events/stats/numeric usage; never save credentials/raw headers/HAR/SDP/audio deltas or private audio.

Wait for readiness/full source/final settings; enable playback normally; allow natural-pause question and inspect complete user transcription/answer/usage before proceeding. Trigger Interrupt during observed active generation/output; require evidence of cancellation/cleared buffer and silence state before follow-up. Stop at first failed contract, unexpected response or allowance threshold. Collect usage after each completed/cancelled response; unavailable usage remains explicit and prevents extra generation. No additional paid turn for preferred wording. Synthetic behavior proves neither human listening nor physical barge-in.

Explicit Stop retains received conversation/full preview; normal delete only that test source/read404. Shutdown profile/server, verify fresh original default unavailable UI/503-no-store routes/zero native resources, unchanged private files and released ports/processes. Cleanup always runs. No .env/SQL/migration/caption/billing/deployment operation. Larger changes return to PM; any second attempt requires the narrow correction and offline checks first.

## Skills / required return

Use OpenAI Docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for current VAD/interruption/pricing facts and .agents/skills/playwright-cli/SKILL.md for browser testing under docs/SKILLS.md. React guidance only if a relevant component changes.

Return READY_FOR_REVIEW with base/dirty/hash/build identity, exact commands/UTC/exits, explicit VAD policy/official basis, waveform timing/hash, transcript factual/word review, response and buffer interruption timeline, follow-up association, latency metrics/limits, numeric usage/cost uncertainty and ledger counts, cleanup/default restoration, safe screenshots/artifacts and all NOT_RUN gates. Update PROJECT_STATE/TESTING and one08F report; artifacts in ignored artifacts/local/08f. Physical phone/human audibility/real-person pause tolerance, hosted/YouTube/full evaluation remain open. No next task or public activation.
