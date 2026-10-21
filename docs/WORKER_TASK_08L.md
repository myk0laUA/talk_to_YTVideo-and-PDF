# Task 08L — reduce unintended iPhone voice interruption

Use prompts/WORKER_PROMPT.md and mandatory project documents. Sole active worker task, parent Step 08 with physical-device verification under Step 12. Implementation stays in the worker chat. Timebox initial investigation/correction to 60–90 minutes; report limitations rather than widening scope.

## Starting evidence

PM starting HEAD b70f0425ada95eabc9de7b8bcb2f980d09e0b2c5 on main; deployed application cd48889, Render dep-dbcfq8uea8bs73fdj49g. Chrome summary/follow-up accepted by user report after 08K. User now reports physical iPhone playback interrupted unintentionally when holding the phone close. Screenshot shows provider cancellation after detecting speech and short user transcript fragments. This supports speech-trigger cancellation, not proof of speaker echo, breathing, handling noise or a specific VAD threshold defect. Browser/version, volume and acoustic conditions are not recorded. Do not reopen the proven 512-token cap as this incident's presumed cause.

Current capture in src/app/voice-browser-adapters.ts requests audio:true. Shared voice policy in src/shared/priming-provider-policy.ts is v4, maxOutputTokens2048, silenceDurationMs600. src/shared/priming-manifest.ts configures server_vad with interrupt_response:true. Inspect provider issuance and both ACK validators before changing this contract.

## Outcome and scope

Implement a small, justified input-processing or speech-detection correction to reduce unintended interruption while retaining deliberate speech barge-in. Inspect existing browser echo/noise handling, effective capture settings and provider VAD/noise-reduction configuration. Consult current official documentation before selecting supported settings; distinguish speech onset sensitivity from the existing speech-end silence duration. Do not simply lengthen silence duration to claim an onset fix.

Use best-effort supported browser constraints where appropriate; do not make optional processing an exact mandatory device requirement or silently retry microphone acquisition. If changing provider settings, version the shared policy and enforce agreement at issuance and initial/final ACKs. Preserve 08J timing, full-source grounding, finite 2048 output cap and concise instructions. Do not disable automatic interruption globally, mute microphone throughout assistant output, add automatic retries, or treat all short transcripts as noise. These would mask the defect or remove required interaction.

Use existing safe diagnostics if sufficient. Any new evidence must be bounded and allowlisted, without audio recordings, private source text, device identifiers, credentials or raw provider events. Settings requested are not proof that an iPhone applied them. If no supported correction can be justified, return a precise diagnosis gap and minimal physical comparison protocol rather than speculative tuning.

## Applicable skills

- openai-docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for current official Realtime VAD/noise-reduction contracts.
- .agents/skills/playwright-cli/SKILL.md for relevant automated browser verification, within the active browser-tool rules.
- .agents/skills/vercel-react-best-practices/SKILL.md only if React state/lifecycle code changes. No visual redesign or general audit.

## Acceptance and testing

1. Document evidence, competing explanations and the precise rationale for each changed setting. Establish regressions that fail on the original implementation for the changed contract; simulated speech events do not prove acoustic improvement.
2. Capture succeeds when optional processing support is absent. Permission denial, stale/late media, source expiry and Stop still clean up; microphone remains behind existing ACK barriers.
3. Deliberate speech interruption and manual Interrupt cancel the current answer correctly. Mute, follow-up, speaker playback and Stop retain existing semantics. Terminal cancellation remains distinct from incomplete/max_output_tokens and transport failure.
4. If provider policy changes, stale/wrong/missing required settings fail closed at all applicable validation points; source content and text policy remain unchanged.
5. Use Node24.22.0/npm11.19.1 and the existing .env-free/network-denied verification harness. Run npm run lint, npm run typecheck, npm test, npm run build. Run npm run test:priming, npm run test:interruption, npm run test:lifecycle, npm run test:voice-adapter and npm run test:owned-voice; build before built-browser checks. Run npm run test:owned-text if shared policy/manifest changes. Record actual commands and exits; reuse suitable existing tests instead of broad new scaffolding.

## Physical acceptance after PM review/deployment — NOT_RUN by worker

1. Reload the deployed app on the affected iPhone, import an authored non-sensitive PDF, enable mic and playback. Record browser/iOS version, built-in speaker versus headset and approximate volume.
2. Ask for a concise summary. Listen silently at ordinary distance, then in the previously problematic close-held position. Record whether a false speech-trigger cancellation occurs; stop on the first unexpected failure and capture safe completion details.
3. During a fresh answer, deliberately say a clear follow-up. Confirm it interrupts and receives a complete relevant response. Check manual Interrupt, mute/unmute and Stop with no lingering mic activity.
4. If false interruptions remain, use one controlled speaker/headset comparison to help distinguish acoustic feedback from other input; report observations without claiming a root cause from correlation alone. Recheck Chrome summary/follow-up after any shared change.

PM coordinates this bounded physical test after deployment. Offline mocks or synthetic audio must not be marked as physical iPhone acceptance.

## Evidence and stop conditions

Return READY_FOR_REVIEW with changed files/SHA256, starting HEAD and final build identity, exact commands/exits/counts, safe artifacts/local/08l evidence, requested versus observed settings where available, documentation links, regressions and limitations. Update PROJECT_STATE.md and TESTING.md preserving history. Mark physical outcome pending even if offline tests pass.

No paid/provider call in this worker assignment, no deployment or environment changes, no DB/schema change, no new dependencies or unrelated UI/session-renewal work. Preserve all earlier spend ledgers. Voice stays enabled per standing user instruction; hosting remains free. PM owns review, deployment and completion decision. Stop after this one task.
