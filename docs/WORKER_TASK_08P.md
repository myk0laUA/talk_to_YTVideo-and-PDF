# Task 08P — larger default for owned voice

Sole active implementation task, Steps 07/08/13. Follow AGENTS.md, WORKER_PROMPT and canonical handoffs. User approved this next step and prioritizes finishing promptly with UI polish still outstanding. Target 45–60 minutes; report a concrete blocker rather than expanding scope. No model-comparison or prompt experiment.

## Outcome and starting evidence

Use `gpt-realtime-2.1` for every new owned PDF/YouTube WebRTC voice session, fixed for its lifetime, with no automatic Mini fallback. HEAD `1d30684` plus accepted dirty03M changes; last reviewed build `yO5mykB8MaI-1g0D7cSZb`. Inspect current status before edits. User local PDF/YouTube text conversations, follow-ups, Stop/remove/new-source flows passed by report. Voice still selects Mini and missed information on the supplied breakfast video. That does not prove short captions are defective; no regrouping work is assigned.

## Scope

1. Change the voice policy model and issue a new distinct voice policy revision. Carry the exact identity through preparation/provenance, ephemeral issuance, browser session ACK validation and response authorization. Reject old Mini/revision and mismatched policies; never silently downgrade. Keep the working larger text policy unchanged.
2. Preserve existing WebRTC transport, voice, transcription, VAD/interrupt settings, concise spoken instructions, output cap2048, full-source representation, readiness barriers, controls and genuine no-microphone text fallback. Do not change prompts or acoustic tuning. Preserve anonymous ownership/expiry, source replacement checks and server-only keys. Same model name in text/voice must not erase mode/revision separation.
3. Inspect existing callers in `src/shared/priming-provider-policy.ts`, `src/server/context/model-policy.ts`, `src/server/voice/`, and voice browser/priming code before editing. Adapt negative tests that currently use the larger model as an invalid voice identity; use a truly wrong model and retain wrong-mode/revision checks. Do not weaken ACK assertions to get passes.
4. Update README/environment guidance and handoffs to say both owned modes default larger, with voice's actual settings and known accuracy limitations. Preserve historical results. Public YouTube stays disabled; no deployment configuration changes. No dependency upgrade, UI redesign, caption decoding or cleanup sweep in this task.

## Verification and commands

Use pinned Node24.22.0/npm11.19.1. Read the OpenAI documentation skill if API capability assumptions need verification; inspect local implementation first. Use project React skill only if editing React code, Playwright skill for browser checks; no UI design work is assigned. Consult installed Next docs only for framework changes.

Run focused voice policy/admission/registry/priming tests demonstrating both source kinds use larger at the provider boundary, fixed identity on follow-up, mismatch rejection, no fallback on provider failure, foreign/expired/replaced-source denial and Stop/resource cleanup. Verify text/voice modes remain distinct despite sharing a model name. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:owned-voice`, and `npm run test:owned-text` on that build. Retain meaningful existing controls/recovery tests. Use isolated synthetic credentials/storage/provider and network denial as in03M; no real DB operations or model calls. Do not overwrite previous evidence.

## Manual check after PM review

Worker records these as NOT_RUN unless separately performed by the user; fake audio/viewport tests are not physical evidence. PM/user next restarts local app, imports one source, starts Voice, asks summary and follow-up, interrupts once, checks Mute/Stop and switches to text. Capture actual model ACK safely if existing instrumentation permits; do not record keys/audio. A bounded user test suffices; no repeated semantic grading loop. Do not claim migrating the model fixes acoustic interruption behavior.

## Return and stop

Return `docs/DEFAULT_VOICE_MODEL_08P.md`, PROJECT_STATE/TESTING updates, changed-file hashes, actual commands/exits, fresh build identity, provider-boundary assertions and remaining live/device gaps. Artifacts in `artifacts/local/08p/`. Stop READY_FOR_REVIEW. No automated paid calls/new ledger, deploy, hosted activation or next task. PM reviews, then sequences one focused UI/mobile polish task and final release/security/storage checks. Existing answer omissions remain recorded limitations.
