# Task 08D — application WebRTC voice adapter, offline verification

Use prompts/WORKER_PROMPT.md. Sole active worker task under original Steps02/07/08. Estimate2–3hours; stop at an inspectable offline implementation. No live calls/deployment/config edits.

## Outcome and starting evidence

Wire the existing application voice controls and accepted lifecycle to the dedicated02D preparation/credential boundary and a real browser WebRTC adapter. Verify the complete path with isolated provider/media fixtures; default gates remain off. This is integration, not a new conversation implementation.

02D is accepted offline: base52ebd6e, build3CZnJ4A2b8LMobw-ksQIe,14hashes matched, PM88units and366built assertions passed. 07G supplies the exact provider-enforced voice policy and full-source ACK barrier. Existing08A/B/C controls/lifecycle are scripted; no application WebRTC factory exists. Read OWNED_VOICE_BOUNDARY_02D.md for exact routes, expiry units, single-use ticket and limitations. Inspect current HEAD before editing.

## Scope and decisions

Inspect src/app/{voice-session,conversation-area,source-workspace,page}, src/shared/{voice-lifecycle,voice-response,priming-controller,priming-manifest,transcript}, src/server/voice and src/app/proof/voice/voice-controller.ts. Reuse proof transport lessons, not its synthetic source/issuance path. Keep one source/one active mode and existing text fallback.

Implement stable browser adapters/factory using native RTCPeerConnection, bounded ordered data-channel events and an owned audio element. Use current official Realtime WebRTC SDP endpoint/schema, not GPT-Live examples. Connection negotiation must not require live microphone audio before accepted source priming: establish the audio transceiver without a microphone, then attach/enable tracks only after the final effective source/settings ACK and settled sends. Handle negotiated message size, backpressure, channel close/errors, malformed/oversized events and deadline/abort. Bound response/event buffers; no unbounded queue or retry loop.

Preparation must use the02D returned projection and credential request, with fresh request IDs and validation of policy/source/expiry/correlation. Existing lifecycle currently creates local run IDs while02D creates a server run ID: explicitly reconcile them without changing source contents, weakening ACK validation or treating browser data as server provenance. A small typed lifecycle interface adjustment is allowed, with regression coverage. Keep credential only in memory for SDP exchange; erase retained references afterward. No secrets in storage/URLs/logs/HAR/screenshots. Validate SDP response size/type and expiry, avoid redirects/retries, release late resources.

Expose only a safe server availability boolean to page/SourceWorkspace; the independent default-false voice gate controls the new factory. No eager provider/media calls on render, mount, source selection or mode switching. Ordinary public voice stays unavailable until PM configures/deploys it. Test opt-in operation only in an isolated injected environment.

Stop, source replacement/removal, mode change, expiry, departure and stale async completion must release peer/channel/audio/tracks/listeners/timers once. Use existing BrowserSession ownership/recovery behavior. A stopped unclaimed02D ticket currently blocks preparation for up to30seconds: a minimal authenticated, owner-bound cancellation operation is permitted if necessary for reliable explicit Stop/restart. It must not refund issuance limits or allow cross-owner cancellation; never call it credential revocation. Test lost/late cancellation and retain TTL fallback.

Use existing interruption/mute/playback/transcript controllers. Preserve assistant audio transcript events and received text on Stop. Input transcription remains off under07G; do not invent user transcript text or claim both-speaker completion. Transcription policy/model verification is a separate remaining gate. Keep permission-denied text mode as an explicit user choice, no automatic start. Physical playback cannot be proven by fake media.

## Acceptance

1. With gate off, Start remains unavailable and there are0provider/media calls. With isolated gate on, actual application controls use02D routes for an owned synthetic PDF/YouTube source, then negotiate one fake peer/data channel and prime every source section before microphone acquisition/attachment.
2. Wrong/expired/stale preparation, cross-source/mode/model settings, invalid credential/SDP, partial/mismatched ACK and provider/context errors fail closed. No permanent key reaches browser; only transient authorized ephemeral data is used for negotiation.
3. Start/Stop/restart, Stop during each await, denied microphone, late getUserMedia, playback rejection/retry, mute/unmute, interruption/follow-up, disconnect and source/mode/departure changes preserve lifecycle semantics. No duplicate peer, stale audio, leaked tracks/timers/listeners or automatic retry. Server tickets and attempts remain bounded.
4. Existing text flow still works and mode switching leaves only one active controller. Transcript retention and source preview survive Stop. No fabricated user speech transcription; disclose that gap.
5. Production bundles exclude all fixture/test controls; normal defaults stay disabled. All verification is injected/offline, not real provider/phone evidence.

## Tests, skills and manual checks

Use pinned Node24.22.0/npm11.19.1; .env-free isolated copy, empty real keys, unusable loopback DB and outbound-provider denial. Add meaningful adapter and built application tests, and document the new focused command. Run npm run lint, npm run typecheck, npm test, npm run build, then npm run test:smoke, npm run test:voice-session, npm run test:mode-switch, npm run test:recovery, npm run test:owned-voice, npm run test:owned-text and npm run test:boundaries. Any expected old disabled-UI assertion must become a genuine gate-off test; do not delete the boundary coverage to accommodate activation.

Apply OpenAI Docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for current API facts, .agents/skills/vercel-react-best-practices/SKILL.md for stable React ownership, and .agents/skills/playwright-cli/SKILL.md for browser checks under docs/SKILLS.md. Read version-matched bundled Next docs for framework changes. No redesign/design skill needed.

Manual isolated browser checks: (1) gate off, select Voice and see unavailable Start; (2) gate on with fake service/media, upload/select the owned synthetic source and Start, verify setup-to-ready ordering; (3) mute, interrupt, Stop, restart and switch to text; (4) deny media and verify clear failure plus explicit text option. Capture390px and desktop states and cleanup counters. Physical device/audio and real WebRTC are NOT_RUN; no human setup needed yet.

## Evidence and stop

Return READY_FOR_REVIEW with base/dirty hashes, build, commands/UTC/exits, endpoint/run-ID mapping, full-source/media-order checks, race/resource counters, safe screenshots and explicit transcription/live/device gaps. Update PROJECT_STATE/TESTING and one08D report; artifacts under ignored artifacts/local/08d. Never record credentials or microphone audio.

Stop if documented negotiation cannot preserve the source-before-audio barrier, if shared architecture needs a substantial redesign, or if real service access is required. No key changes, API spending, deployment, captions work, transcription model change or further task. PM reviews before bounded live validation.
