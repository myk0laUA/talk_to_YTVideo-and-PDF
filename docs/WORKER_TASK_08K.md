# Task 08K — diagnose and correct truncated voice answers

Use prompts/WORKER_PROMPT.md; sole active worker task, parent Step08/09/07. Read mandatory project docs. Estimate60–90minutes, stop at a bounded evidence-backed correction. Implementation stays in worker chat.

## Starting evidence

Hosted c1eaa38, PM HEAD7531dce plus this handoff. User now reports audible partial replies. Screenshot shows active ready session, playback enabled, microphone muted at capture, two assistant answers both marked incomplete and cut mid-thought. No closed-connection state in this screenshot. Earlier mic-disabled/playback-disabled/401/clock failures are separate. Source/context reception and user speech/assistant text occurred; full response completion and sustained conversation are unaccepted.

Code sets PROVIDER_VOICE_POLICY.maxOutputTokens=512 in src/shared/priming-provider-policy.ts, applied in src/server/voice/provider.ts and source priming. src/shared/voice-response.ts classifies response.done incomplete without showing its exact reason. Output ceiling is a concrete hypothesis, not a proven cause. Do not infer interruption, expiry or transport failure from incomplete alone.

## Scope

Inspect response.done/status_details, response/output audio completion, transcript reconciliation and configured output bounds. Consult current official OpenAI Realtime documentation for audio/text output accounting, incomplete reasons and supported bounds using the openai-docs skill. Identify whether the cap is truncating normal spoken answers; distinguish max-output limit, cancellation/VAD interruption, context capacity and protocol/transport failure.

Use a closed allowlisted reason/numeric-usage projection if needed; never retain raw events/provider errors, private PDF content, credentials, cookies or recordings. Unknown reasons stay unknown. Reproduce using authored source and realistic request such as a concise document summary plus a follow-up. If confirmed, choose a justified finite voice-specific output ceiling and concise-answer instructions if needed. Version any changed exact policy and update server issuance/initial-final ACKs consistently. Preserve text policy unless independently necessary; no unlimited output, retries/automatic continuation, altered ownership/expiry, removed context or weaker validation. Do not merely hide incomplete status.

## Acceptance/tests

1. Capture safe terminal reason and numeric usage for an incomplete answer, or explicitly NOT_REPRODUCED. Establish red-before/green-after regression for any actual code change.
2. Verify output-limit handling differs from interruption/cancellation; complete responses finish transcript/playback normally, genuine incomplete responses retain partial text and clear feedback. Preserve follow-up, Stop/mute/cleanup and ACK-before-mic.
3. Updated finite policy must agree at issuance, preparation and both effective provider ACKs. Stale/wrong policy rejects. Text/PDF and08J clock handling remain intact.
4. Run pinned Node24.22.0/npm11.19.1 in established .env-free/network-denied harness: affected test:priming, test:voice-adapter, test:owned-voice, test:interruption, test:transcript and test:owned-text as appropriate; lint/typecheck/test/build for app edits, build before built tests. Record exact commands/counts/exits/build.

## Optional bounded real local verification

Offline investigation first. Under standing API-spend authorization, new separate08K allocation: maximum1local session,2response starts,120seconds and US$0.50 estimated total including ASR. Before acquisition, verify current pricing and conservative worst-case fit for proposed cap; if it cannot fit, return a budget blocker without spending. No paid TTS. Use authored PDF/synthetic audio, existing local service harness and private key handling. Stop on first failed contract; do not reset prior budgets or retry under this allocation. Record numeric usage/cost estimate/actual bill unknown and exact stage. Prove completed summary plus follow-up only if both actually succeed; synthetic playback does not prove physical audio. If environment/provider is blocked return offline evidence and safe PM observation plan.

No deployment, public flag changes, shared DB reset/bulk cleanup, .env edits or private user document use. Public voice stays enabled per user; PM owns hosted configuration and subsequent verification.

## Evidence/stop

Apply relevant local React/Playwright skills only as needed. Return READY_FOR_REVIEW with reason evidence, design/budget rationale, files/hashes, UTC/commands/exits/build, safe artifacts/local/08k logs, failures/limitations, resource cleanup and ledger. Update PROJECT_STATE/TESTING without replacing history. Stop after this response-completion task; no unrelated UI/expiry-renewal work. PM reviews/deploys, then user tests one short summary/follow-up with playback enabled.
