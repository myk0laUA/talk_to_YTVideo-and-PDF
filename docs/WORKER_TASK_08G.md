# Task 08G — diagnose and correct Chrome voice setup failure

Use prompts/WORKER_PROMPT.md. Sole active worker task, parent Step08 with Step02/07 dependencies. Estimate60–90minutes for diagnosis and a narrow correction; stop at a concrete blocker. Application implementation stays in worker chat. Read START_HERE, IMPLEMENTATION_PLAN, PROJECT_STATE, TESTING and SKILLS first.

## Starting evidence

Local baseline150b2d5573ea7a52d061ca8b4e32feb9e7fc048a (subsequent PM docs-only commit may be HEAD); deployed application a416652f0177f58460de6f6fc4552e4fc202851b. Prior native Chromium synthetic-input local voice passed on YhkhD73NHaU1gpomogsBg. Actual hosted PDF/text two responses/Stop/restart ownership passed. Hosted voice was enabled but never functionally verified by PM.

User screenshot21October: one-page PDF ready, generic **Voice setup or connection failed**, microphone **Not in use**, retry enabled. User confirms Chrome and no microphone prompt. Device/OS/browser version unknown; do not call this an iPhone failure. No raw network evidence or exact failing stage yet. src/app/voice-session.tsx has distinct microphone/connection errors, but generic text covers other failures; absence of a prompt is not proof of a specific root cause. Do not use or request the user's private PDF; use authored fixtures. PM is disabling only public voice pending review; text/PDF remain enabled. Worker must not change Render configuration or deploy.

## Outcome and scope

Identify the exact failing setup stage and correct only the evidenced cause. Inspect actual application paths: src/app/voice-browser-adapters.ts, src/shared/voice-lifecycle.ts, src/shared/priming-controller.ts, src/server/voice/{handlers,registry,provider,config,runtime}. Preserve owned-source reauthorization, single-use preparation, full-source ACK-before-microphone, v3/600ms policy, fixed model, default-off gates, existing text behavior and all cleanup paths. Do not loosen policy/response validation, expiry or timeouts merely to make a test pass.

First inventory existing sanitized evidence. Trace preparation HTTP/validation, credential issuance/validation, SDP, native peer/data-channel readiness, source item ACKs, effective settings and media request. Capture status, safe stage/category, timing, browser/runtime, source fixture class and build identity only. Never log API keys, ephemeral credentials, cookies, owner hashes, SDP bodies, user documents or raw provider bodies. If diagnosis requires new instrumentation, add a bounded safe diagnostic seam with no public secret/debug endpoint; add a regression proving prohibited fields cannot leak. Prefer an existing seam if sufficient. Improve generic failure copy only if supported by known safe categories.

## Skills

Read relevant .agents/skills/vercel-react-best-practices/SKILL.md for lifecycle/cleanup changes; .agents/skills/playwright-cli/SKILL.md for observable browser verification. Use current official OpenAI Docs only if provider contract inspection requires it. Consult installed version-matched Next guides for a framework change. No design overhaul or new architecture.

## Acceptance and tests

1. Give a reproduced failure with the first failing stage and evidence, or explicitly report NOT_REPRODUCED with the missing observation. Do not manufacture a diagnosis from the screenshot.
2. A code fix needs a regression that fails before and passes after; cover malformed/late/stale/timeout paths relevant to the cause, preserving no-microphone-before-ACK and release after failure/Stop.
3. Verify source/credential ownership, exact effective policy and working text remain intact. No automatic retry or hidden background session.
4. If using a live local check, demonstrate actual native setup through source/settings ACKs, normal microphone acquisition and one grounded response/normal playback/Stop where the available test environment permits. Synthetic input is not physical audio. Hosted and physical checks remain PM/human owned.

Use pinned Node24.22.0/npm11.19.1. Relevant exact existing commands: npm run test:voice-adapter; npm run test:owned-voice; npm run test:priming; npm run test:lifecycle; npm run test:owned-text; npm run lint; npm run typecheck; npm test; npm run build. Run affected focused tests first, then lint/typecheck/unit/build if application code changes. Built integration scripts must use the resulting build and existing .env-free/network-denied harness; never accidentally enable live keys in ordinary tests. Reuse unchanged build when no application changes; don't repeat unrelated suites for documentation alone.

## Live limits and stopping point

Offline evidence first. New separate local diagnostic allocation under standing authorization: estimated US$0.50 total, maximum TWO credential/session attempts and TWO response starts total,120seconds per session. Start with one attempt/one short authored question; second only after a concrete offline-verified correction or observation gap. Recheck current pricing/conservative fit before acquisition. Exclusive separate artifacts/local/08g ledger, no reuse/reset of prior allocations. No paid TTS or private microphone recording, shared database bulk cleanup, permanent .env edits, hosting/billing/provider changes, push or deployment. Existing API key may be used privately for assigned local verification. Worker has no authorization to reactivate public voice. If only the host reproduces, return safe instrumentation/reproduction procedure to PM for one controlled deployment instead of guessing or repeatedly spending.

## Manual follow-up and required evidence

After PM review/deployment only: refresh hosted page, upload authored small PDF, choose Voice and Start; report exact last stage, whether Chrome asks for mic, whether permission succeeds, audible answer, interruption/follow-up and Stop. Device/OS/Chrome version and local-versus-hosted context required. Do not instruct the user to keep retrying the current failing build.

Return changed files/hashes, HEAD/dirty identity, fixture identity, browser/runtime and build ID, exact commands/exits, failing and corrected evidence, diagnostic stage/status/timings, attempt/response counts/cost limits and actual-usage gaps, cleanup/default/private-file preservation, and every NOT_RUN gate. Keep screenshots/sanitized logs under ignored artifacts/local/08g. Report READY_FOR_REVIEW (partial if necessary); PM decides completion and next task.
