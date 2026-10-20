# Task 07D — prepare the first live Realtime compatibility probe

Use with `prompts/WORKER_PROMPT.md` in the separate worker chat. This is the only active worker task, under original Steps02/07. Estimate 60–90 minutes. PM owns model selection, live execution, spending and acceptance.

## Starting evidence and outcome

Inspect current HEAD; starting application is accepted12A `8af058e`, latest committed documentation `ff5a259`, with PM credential-readiness documentation changes in the working tree. Preserve those changes. Local `.env` contains a replacement key, ignored/untracked. PM performed one GET `https://api.openai.com/v1/models`, HTTP200 at2026-10-20T18:45:06.3888006Z. Returned IDs include `gpt-realtime-2.1` and `gpt-realtime-2.1-mini`. This proves authentication/model listing only, not session access, schema compatibility or generation. Dashboard previously showed $15 credit; Supadata remains unavailable.

Produce an isolated, opt-in live probe and a concrete PM runbook that can resolve the exact compatibility/accounting gap. Do not repeat07C's unsupported-tokenizer investigation indefinitely or bypass its fail-closed production policy. Do not run the live probe in this task.

## Scope

Inspect `src/server/context/model-policy.ts`, `model-measurement.ts`, existing proof configuration and transports, `src/shared/priming-manifest.ts`, `priming-admission.ts`, `priming-controller.ts`, and existing tests/scripts. Reuse current protocol contracts where possible.

Use current official OpenAI documentation to compare the planned `gpt-realtime-2.1` with its mini variant for WebRTC voice and microphone-free text, context/output limits, event schema, token usage reporting and pricing. Recommend one exact identifier and explain required changes; PM will choose it. Model-list visibility is not runtime compatibility evidence.

Build a developer-only probe, excluded from public routes and client bundles, using fixed public/synthetic short text only. It must require an explicit live switch and exact model, cap output/session duration/request count, forbid automatic retries, disable automatic responses/VAD, close on error/timeout and sanitize output. No raw credentials, full requests, source text or audio in logs. Avoid loading any database or connecting to Render. Read the key only during explicitly authorized live execution, never in offline tests.

The prepared live sequence should establish session creation/update/item acknowledgments and, separately, one explicitly triggered short text response with usage and context evidence. If text success cannot establish WebRTC voice or framing bounds, label those gaps rather than claiming it does. Evaluate whether documented provider-side admission/error handling offers a viable alternative to an unavailable exact local tokenizer; propose the smallest policy change for PM review, without changing production admission in this task. An empirical sample is not a universal token upper bound.

## Acceptance and testing

1. Offline mode works without keys and cannot contact external services. Live mode requires explicit opt-in; missing model/key or invalid limits fail before network.
2. Scripted transport tests cover success, error, unexpected events, timeout, cancellation, late events, bounded request count, cleanup and secret redaction. Verify no automatic response or retry can exceed the declared sequence.
3. A sanitized report distinguishes mocked versus live, records model, timestamps, counts, outcome, usage if returned and unresolved evidence. Real live results remain NOT_RUN.
4. Run pinned Node24.22.0/npm11.19.1: `npm run lint`, `npm run typecheck`, `npm test`, plus a focused probe test command established by this task. Run `npm run build` and `npm run test:smoke` only if application/shared runtime code changes; otherwise document why no new app build is required. Never run tests against `.env`'s real database or key.
5. Runbook gives the exact proposed live command, maximum requests/output/duration, cost estimate derived from opened official pricing, expected safe results, stop conditions and manual usage review. Budget is a proposed allocation, not authorization to spend.

## Skills, evidence and stop conditions

Use OpenAI Docs at `C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md`. Follow `docs/SKILLS.md`; UI/design skills are unnecessary. No new model SDK/dependency unless existing facilities cannot implement the bounded probe; explain any necessity before expanding scope.

Return READY_FOR_REVIEW with changed files/hashes, starting and final identities, exact commands/UTC/exits, official URLs actually opened, scripted test artifacts under ignored `artifacts/local/07d/`, and the proposed live command/cost. Update PROJECT_STATE and TESTING; create one probe runbook. No secret values or environment dumps.

Stop after90 minutes with the exact unresolved contract if necessary. No paid calls, minting, browser microphone, public activation, deployment, database mutation, Supadata work, production factories, flag changes or claimed Step02/07 completion. PM reviews and executes the separately authorized live check before assigning integration.
