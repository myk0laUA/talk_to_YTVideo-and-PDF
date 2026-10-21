# Task 08M — bounded automatic-interruption tuning

Sole active worker task, parent Step08/12. Follow prompts/WORKER_PROMPT.md and required project documents. PM owns deployment and completion; keep implementation in the worker chat. Target 60–90 minutes for a reviewable candidate, not a promise of physical acceptance.

## Starting evidence and outcome

Starting HEAD ee5b5d4 (resolve full SHA on arrival); deployed application2d68242, Render dep-dbcgd83rjlhs73bcmgug.08L requests ideal browser echo cancellation/noise suppression. User tested on iPhone and reports it works but remains sensitive; screenshots still show speech-trigger cancellation and short unexpected-language transcript fragments. Acoustic cause and effective device processing remain unknown. Do not call08L an acoustic fix or assume the user intended every cancellation.

Deliver one conservative, documented provider speech-activation candidate for PM/device comparison. Preserve automatic spoken interruption as the default: the assessment review script asks to interrupt and follow up naturally. Do not replace the architecture with push-to-talk or button-only interruption.

## Scope and implementation

Inspect src/shared/priming-provider-policy.ts, priming-manifest.ts, priming-controller.ts, src/server/voice/provider.ts and their admission tests. Current policy v4 uses2048 output tokens and600ms end-of-speech silence; server_vad activation threshold is omitted. Read current official OpenAI documentation using C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md before selecting a supported explicit threshold. Use a modest conservative increase over the documented default, documenting the quiet-speech tradeoff. Treat it as a test candidate, not an empirically optimal value. Do not change multiple acoustic variables simultaneously: retain browser preferences, transcription language/model, provider noise-reduction defaults and600ms silence duration for this comparison. No arbitrary threshold search loop.

Version the shared voice policy. Apply and validate the selected threshold consistently through credential/session configuration and both applicable ACK phases; initial/source loading must keep response creation and microphone capture blocked. Preserve source ownership/expiry,08J monotonic timing, full-source acknowledgements, automatic follow-up, finite2048 cap and text policy. Do not weaken validation to tolerate mismatched settings. No automatic reconnect/retry, recording, raw event retention, new controls or unrelated UI changes.

## Acceptance and tests

1. Explain evidence versus hypothesis, exact baseline/candidate and documentation support. Candidate must remain adjustable in one shared policy without conflicting literals.
2. Regressions prove effective final settings agree, stale/missing/wrong threshold fails closed where required, initial priming cannot generate responses or capture mic, and text settings remain unchanged. Handle the documented distinction between initial disabled VAD and final enabled VAD correctly.
3. Existing deliberate interruption, manual Interrupt, mute/unmute, follow-up, Stop, late events and expiry tests pass. Do not claim synthetic speech-start events prove physical sensitivity.
4. Pinned Node24.22.0/npm11.19.1; use existing .env-free/network-denied harness. Run npm run lint, npm run typecheck, npm test, npm run build; then relevant npm run test:priming, npm run test:interruption, npm run test:lifecycle, npm run test:voice-adapter, npm run test:owned-voice and npm run test:owned-text. Build before built-browser checks. No new dependency/framework migration.

## PM physical check after review/deployment

NOT_RUN in worker scope. Same iPhone/browser, source, speaker volume and position: request a concise summary and listen silently at normal and close-held distance. Then deliberately interrupt an answer at ordinary speaking volume and ask a follow-up; verify complete reply and Stop. Record false cancellations and missed deliberate speech separately. If false activation remains, one headset comparison can help isolate speaker feedback. Verify Chrome summary/follow-up. Stop after first unexpected failure; capture safe completion details only. The candidate is not accepted as an improvement until physical comparison supports it; return/revert to previous policy if deliberate speech becomes unreliable.

## Evidence, skills and stopping point

Return READY_FOR_REVIEW with exact files/SHA256, starting/final code identity and build, commands/exits/counts, retained failures, policy rationale and safe artifacts/local/08m evidence. Update PROJECT_STATE/TESTING preserving history. Use .agents/skills/playwright-cli/SKILL.md for relevant browser verification and vercel-react-best-practices only if React code changes. No general design audit.

No worker deployment, paid/provider calls, environment edits, shared DB changes or next task. Previous spend ledgers remain closed. Voice stays enabled and hosting remains free. If official contract or ACK behavior cannot support a safe candidate, report the exact blocker rather than bypass validation. One candidate only; PM coordinates the actual-device check and decides next steps.
