# Task 09C — user speech transcription in the real voice conversation

Use prompts/WORKER_PROMPT.md. Sole active worker task under original Step09, with narrow07 voice-policy changes. Estimate90–150minutes. Implement and verify offline first, then perform the bounded live check below only after required checks pass.

## Outcome / starting evidence

Display actual provider-transcribed user speech alongside existing assistant speech text in the owned-source voice flow. No invented user words, duplicate turns or confusion between generated text and audible playback.

08E correction2 is accepted for local native WebRTC with synthetic speech: retained build bfL8fNWLOziONuzc2GTon, real PDF/storage, all3source ACKs/final settings, two accurate answers/numeric usage/active Stop/cleanup. PM matched3doc hashes and independently reviewed the stopped transcript against fixture facts. Input transcription remains null, yielding empty user placeholders; physical audio/phone and hosted gates remain open. Inspect current HEAD and read VOICE_LIVE_08E.md correction2 plus existing transcript design/tests.

## Scope

Inspect src/shared/{priming-provider-policy,priming-manifest,priming-controller,transcript,voice-lifecycle}.ts, src/server/voice/provider.ts, src/app/{voice-session,transcript-view}.tsx and corresponding tests. Reuse existing input_audio_transcription event handling and transcript ordering. No second transcript store or new persistence.

Check current official Realtime input-transcription model/schema/pricing. Prefer the existing proof route's gpt-4o-mini-transcribe if currently supported and suitable; choose one exact documented model, document why, and bind it in an explicit new voice policy revision. Do not change the realtime conversation model or text policy. Initial preparation/mint stage remains VAD/transcription off; enable the chosen transcription only in final voice settings after complete source ACKs. Validate the effective transcription model/settings in final ACK; missing/wrong values cannot enable media. Keep source-before-media, no tools/truncation,512output and ownership/credential controls unchanged. Update strict manifests/admission tests to the intentional new revision without loosening effective checks.

Map real delta/completed/failed transcription events by provider item/content identity, using existing transcript store semantics for duplicates, out-of-order arrivals, partial text, cancellation and late events. Transcription is an asynchronous speech estimate, not exact proof of what the realtime model heard. A transcription failure should show an honest user-turn state; it must not fabricate text from fixture prompts or assistant responses. Retain received text on Stop; source/mode changes and new sessions must retain existing clearing rules. Remove the blanket unavailable disclosure only where the new capability is configured. No UI redesign.

## Acceptance / offline verification

1. Initial transcription stays null; final voice requires exact configured transcription and all source ACKs before media. Text mode remains microphone/transcription-free. Unsupported/old revision, missing/mismatched effective settings fail closed.
2. Existing transcript adapter produces correctly ordered user/assistant turns for real event shapes; test duplicates, final-before-delta, transcription failure, delayed final, interrupted responses, Stop/restart/source changes and stale-session events. No source priming items leak as user conversation turns.
3. Actual built application with injected provider/media shows both speakers, explicit partial/failure states and retained text after Stop. Default gates remain off; no fixture text/keys enter production bundles.

Use Node24.22.0/npm11.19.1 and the established secret-free network-blocked copy for all ordinary tests. Add focused regressions; run npm run test:transcript, npm run test:priming, npm run lint, npm run typecheck, npm test, npm run build, then npm run test:voice-adapter, npm run test:owned-voice, npm run test:owned-text, npm run test:transcript-view, npm run test:mode-switch and npm run test:boundaries. Add recovery tests if lifecycle/departure logic changes. Preserve gate-off assertions. Inspect desktop/390px transcript/Stop/error screenshots. No physical-phone proof from emulation.

## Bounded live check after offline pass

Standing user test-credit authorization applies: new US$1 estimated incremental ceiling, max2credential/session attempts and4response starts TOTAL,120seconds per attempt. Include transcription cost in preflight; if numeric usage does not include it, state that and use documented conservative duration-based accounting plus uncertainty. No purchase/reload/billing change. Preserve all exhausted08E ledgers; create a separate09C ledger/locks. Start with one session/two predetermined questions; second only after a diagnosed narrow fix or observer gap corrected offline, never preferred wording. No third attempt.

Use a fresh profile/visitor, actual local built app, normal synthetic PDF upload/real parser/PostgreSQL and existing secrets privately. Only temporary process-local loopback/PDF/voice settings; no .env edits, SQL/migration or deployment. Reuse the corrected controlled-audio fixture from08E correction2 through native file-backed microphone; preserve original fixtures. No provider responses/native APIs replaced or protocol/source seeding. Never save credentials/raw headers/HAR/SDP/audio deltas.

Through normal UI: inspect complete preview, Start once, verify full source/final transcription ACK before media; ask the two known questions and inspect actual user transcriptions and accurate assistant answers. Check first response usage before permitting second. Record word accuracy against authored speech, event-to-turn mapping and any late final. Do not compare exact punctuation as semantic correctness. Allow audio buffer completion if within deadline, then explicit Stop retaining both speakers/full preview; normal test-owned removal/read404, shutdown and fresh default-disabled UI/routes/private-file/resource audit. Stop on first failed contract or allocation threshold. A synthetic pass still does not prove physical mic, human audibility, iPhone or interruption usability.

One narrow compatibility correction is allowed with regression/build before the optional second attempt. Larger issue or another failed attempt returns to PM. No VAD tuning, caption work, hosted deployment or extra feature. The earlier200ms pause sensitivity remains an explicit real-human usability gate; do not claim the corrected synthetic WAV resolves it.

## Skills / evidence / stop

Apply OpenAI Docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for current transcription/pricing facts; task-relevant .agents/skills/vercel-react-best-practices/SKILL.md and playwright-cli/SKILL.md for UI/event ownership and browser verification, following docs/SKILLS.md. No design overhaul.

Return READY_FOR_REVIEW with base/dirty/file hashes/build, exact commands/UTC/exits, chosen policy/model and official evidence, offline positive/negative results, safe both-speaker screenshots, actual live source/response/transcription mapping and word judgments, numeric usage/cost estimates and missing billing fields, ledger/attempt counts, Stop/removal/default/resource cleanup and all gaps. Logs and synthetic text stay ignored under artifacts/local/09c. Update PROJECT_STATE/TESTING and one concise09C report. No full-step/public/phone completion claim. No next task.
