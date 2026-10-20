# Task 07G — explicit voice admission policy, offline only

Use prompts/WORKER_PROMPT.md. Sole active worker implementation task, under original Steps 02/07/08. Estimate 60–120 minutes; return at the boundary below. Inspect current HEAD before work.

## Outcome and starting evidence

Remove the specific policy prerequisite that prevents a real voice adapter from using full source context: implement a separate, explicit provider-enforced voice admission path and verify it with isolated transports. Do not activate voice or issue credentials in this task.

10E local PDF/application/live text functional evidence is accepted with incomplete raw-response capture explicitly retained. Build G9m5MN0-jgjCbrVDV-c7v; application code unchanged from accepted 10D. Text policy uses exact gpt-realtime-2.1-mini, structured B, disabled truncation and bounded output. Voice still rejects provider-enforced admission in src/shared/voice-lifecycle.ts; existing measured-fit policies lack verified tokenizer/framing bindings. Synthetic lifecycle success is not a real WebRTC proof. Public deployment remains older/PDF-only. Read PROJECT_STATE and the 07E/10D reports.

## Scope and implementation notes

Inspect src/shared/priming-provider-policy.ts, priming-admission.ts, priming-manifest.ts, priming-controller.ts, voice-lifecycle.ts and src/server/context/{model-policy,model-measurement,service}.ts with their tests. Reuse the existing lifecycle/priming architecture.

Establish a distinct exact-model/version/mode voice policy; do not make the text policy implicitly authorize audio. Check current official OpenAI documentation for mini voice/WebRTC support and effective session fields before fixing the policy. Keep a bounded 512 output-token limit if supported; report a concrete incompatibility rather than silently changing model or cap. Do not invent token measurements, framing bounds or pre-admitted capacity. Provider context rejection may occur at generation, after source ACKs; preserve that distinction.

Preserve complete source serialization and identity checks, initial settings/item/final-settings ACK barriers, no truncation/tools, and source ownership/expiry rechecks in server preparation. Audio input/automatic response generation must stay inactive until full source readiness. Explicitly test effective audio settings rather than treating a text ACK as voice readiness. Choose only documented compatible fields; do not introduce unsupported reasoning settings merely because text used them.

Allow only the matching new voice basis through the existing voice lifecycle. Keep measured and synthetic paths distinguishable. A structural policy never grants visitor authority or a spending guarantee. Preserve text behavior and disposal on cancellation, provider/context error and stale completion. Document the remaining real adapter/credential/WebRTC and phone gates precisely.

Exclusions: production transport factories or credential routes, public feature gates, live calls, key/config edits, Render/deployment, database mutation, caption work, UI redesign, model migration, dependencies, retrieval or summarization. Existing public voice remains unavailable. This assignment explicitly permits the narrow policy extension previously excluded by 07E; it does not authorize uploaded sources through existing synthetic proof routes.

## Acceptance and tests

1. Distinct voice policy passes only exact matching voice manifests. Text policy cannot authorize voice, voice policy cannot authorize text, unsupported models/revisions/altered settings fail closed.
2. Full PDF and YouTube synthetic source projections retain all content and boundaries. Altered source, manifest or policy is rejected; ownership/expiry failures never yield usable preparation.
3. No audio send/automatic response before all required ACKs. Missing/mismatched/late ACK, cancellation, context-limit rejection and provider failure dispose once and preserve accurate state. Measured validation never labels this basis measured-fit.
4. Existing text and synthetic voice regressions pass; default application remains unavailable for voice. No live provider, real database or secret-dependent test is used.

Use Node24.22.0/npm11.19.1 in a secret-free isolated copy with empty keys, unusable loopback database and outbound-provider denial, following established test practice. Run npm run test:budget, npm run test:context, npm run test:priming, npm run test:lifecycle, npm run test:interruption, npm run test:text-lifecycle, then npm run lint, npm run typecheck, npm test and npm run build. After build run npm run test:smoke and npm run test:voice-session. Run npm run test:owned-text if shared admission/controller/manifest changes affect text (expected). Record exact commands, UTC and exit status; do not rerun a check without a change or unresolved failure.

## Skills and manual checks

Use OpenAI Docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for API facts. Use .agents/skills/playwright-cli/SKILL.md only for the required isolated browser checks; React guidance only if a React file genuinely needs changing. Follow docs/SKILLS.md; no design skill or redesign needed.

1. In the isolated built application, verify ordinary voice Start is unavailable without an assigned production adapter.
2. In isolated browser fixtures, verify the accepted voice setup/cancel/Stop controls still behave as before. Clearly label fake media/provider results.
3. Physical microphone, speaker, interruption, live WebRTC and phone checks remain NOT_RUN; no human action is required for this offline task.

## Evidence and stop conditions

Return READY_FOR_REVIEW with changed-file hashes, base/dirty identity, build ID, commands/exits, relevant official links and checked date, policy/ACK mapping, positive and negative test results, cleanup and limits. Update PROJECT_STATE/TESTING and one short 07G report. Keep logs/screenshots under ignored artifacts/local/07g. No transcript/secret dumps.

Stop and report if current documented voice support cannot satisfy the policy, if preserving ACK/audio gating requires a transport redesign, or if any real credential/service/deployment is necessary. Do not bypass fail-closed checks or expand into the next voice integration task. PM alone accepts and sequences that task.
