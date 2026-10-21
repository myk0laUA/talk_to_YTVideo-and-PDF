# Task 08H — isolate hosted voice preparation timeout

Use prompts/WORKER_PROMPT.md. Sole active worker assignment, parent Step08 with Step02/07 dependencies. Estimate60–90minutes; return a bounded finding or diagnostic improvement if the hosted cause cannot be reproduced. Implementation stays in the separate worker chat.

## Starting evidence

Read required repository instructions and latest PROJECT_STATE first. Starting PM HEAD7fb83b6 plus this documentation handoff; deployed application ddaeb8d6aa855070ede3ed2adec6c37ef367d084. Diagnostic build BKAaUrr5lV6vuNI-D3rud passed offline. Prior local native voice success does not prove deployed voice.

User Chrome screenshot21October shows exactly one row: `preparation_http: timeout, 25002 ms`. No microphone prompt; device/OS/version unknown. No preparation response arrived before the browser deadline. This does not prove an invalid key, cold start or database fault. Preparation precedes credential issuance and microphone acquisition and does not call OpenAI. PM contains public voice; PDF/text remain enabled. Do not use/request the user's private PDF or repeat paid voice attempts.

## Scope

Trace src/app/api/voice-preparations/route.ts, src/server/voice/{runtime,handlers,registry,config}.ts, src/server/context/model-measurement.ts and authorization/repository/context dependencies. Inspect the pre-registry path: registry preparation deadline5000ms, browser preparation deadline25000ms. Explain coverage including module initialization, body/auth/DB awaits, synchronous work and cancellation. Separate hosting/network hypotheses from code evidence.

Reproduce relevant stalls offline with authored fixtures and controlled dependencies. Implement only an evidenced fix. Otherwise add minimal bounded server-side timing/category instrumentation distinguishing entry, authorization, repository/context work and exit for a future PM-hosted observation. Instrumentation is not a root-cause fix. Closed vocabulary and numeric durations/status only: no cookies, owner/source identifiers, documents, bodies, keys, SDP or raw exceptions. No public debug endpoint; bound output under repeated failures.

Do not blindly raise timeouts, add retries, weaken ownership/expiry/admission/full-source ACK barriers, change provider/model/policy, activate hosting or redesign UI. Preserve working text/PDF and default-off synthetic routes.

## Skills

Use .agents/skills/vercel-react-best-practices/SKILL.md if changing React/Next lifecycle behavior; consult installed version-matched Next documentation for framework changes. Use .agents/skills/playwright-cli/SKILL.md if browser verification is needed. No visual audit or unrelated provider research.

## Acceptance and testing

1. Map the first failing boundary with evidence. Distinguish hosted observation, simulated stalls and local success. If unresolved, return NOT_REPRODUCED with a precise PM-only observation plan.
2. Any fix needs a failing-before/passing-after regression. Cover stalled work before/inside registry, abort/Stop, late completion and resource release as relevant; no credential mint or microphone on preparation failure.
3. Diagnostics tests demonstrate permitted bounded fields only, including exceptions containing sentinel secrets/private text. Preserve no-store, ownership/expiry and text behavior.
4. Use Node24.22.0/npm11.19.1. Existing commands: npm run test:owned-voice; npm run test:voice-adapter; npm run test:lifecycle; npm run test:owned-text. Run affected checks first; then npm run lint; npm run typecheck; npm test; npm run build for application edits. Build before built integration scripts. Use established .env-free/network-denied harness. Add a focused test command only if existing coverage cannot exercise the fault; document it exactly.
5. No paid calls, public configuration changes, shared DB resets/cleanup, secret changes, push or deployment. Do not recycle prior live allowances.

## Manual follow-up — PM owned, NOT_RUN by worker

After review PM deploys accepted code and arranges one controlled authored-source preparation observation, correlating safe browser/server timing. Public voice activation remains PM-owned. User should not retry before that handoff. Physical microphone/audio verification remains separate.

## Required evidence and stopping point

Return READY_FOR_REVIEW (partial if appropriate), changed files/hashes, runtime/build identity, commands/exits/UTC, expected versus actual results, artifacts/local/08h evidence, correction and remaining hypotheses. Preserve prior ledgers/artifacts/private .env. Update PROJECT_STATE and TESTING honestly. Stop at one narrow correction or sufficient safe diagnostics; do not expand into credential/WebRTC/audio work or claim hosted voice complete.
