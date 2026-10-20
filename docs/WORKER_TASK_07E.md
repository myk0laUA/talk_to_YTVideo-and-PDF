# Task 07E — explicit provider-enforced full-source admission for text

Use with `prompts/WORKER_PROMPT.md` in the separate worker chat. Only active implementation task, original Step07. PM owns acceptance, deployment and live checks. Estimate2–3hours; report a precise blocker rather than broadening scope.

## Outcome and starting evidence

Inspect actual HEAD and preserve PM updates.07D accepted in `0b0ae76`. PM then ran one real `gpt-realtime-2.1-mini` text WebSocket probe at2026-10-20T19:04:26.669Z–19:04:28.535Z, exit0/PASS: effective settings and two complete item ACKs, one correct response,64input/20output tokens, no audio/image. Sanitized evidence `artifacts/local/07d/pm-live-mini.json`; command identity `pm-live-command.json`. This is one tiny synthetic sample, not full-source, overflow, WebRTC or phone evidence.

Implement an explicit provider-enforced text admission path through existing source preparation/priming. No invented verified tokenizer or local token upper bound. The resulting modules must be ready for a subsequent separately assigned owned-source endpoint/transport integration; this task adds no public endpoint or factory.

## PM policy decision and scope

PM authorizes a distinct `provider_enforced` basis for exact `gpt-realtime-2.1-mini`, text mode only. In this basis local checks enforce resource limits and complete source fidelity, not a promise that the context fits. Effective disabled truncation and complete item acknowledgment establish protocol readiness only. Actual capacity is checked by the provider when generating each response; context rejection must end the attempt with a clear recoverable error and preserved source/preview. Never silently remove source/history, summarize, retry or switch models. A prior successful response does not prove future history fits.

Inspect/reuse `src/server/context/{service,document,model-policy,model-measurement}.ts`, `src/shared/priming-{manifest,admission,controller}.ts`, `src/shared/text-lifecycle.ts` and related tests. Design a discriminated union or equivalent explicit contract rather than inserting fake numeric budgets. Keep existing verified-budget and synthetic-test paths distinguishable. Preserve fail-closed behavior for unsupported model/mode/policy and existing07C diagnostics. Voice must reject this new basis until separately assigned.

Server preparation must retrieve the visitor-owned, unexpired source, build the full existing A/B representation losslessly, enforce existing byte/item/event bounds, and revalidate ownership/expiry/replacement after asynchronous work. Bind the prepared result to model, policy revision, mode, source/representation and run; reject stale or mutated projections. Client structural validation is not authorization: no browser flag or budget assertion can authorize a source or mint credentials.

Session configuration must request text only, no VAD/tools/audio/transcription, disabled truncation, explicit finite output cap (PM initial product policy512tokens), and minimal reasoning where supported by the selected model. Require effective settings and full source item ACKs before accepting questions. Preserve once-only transport ownership, cancellation/deadline/late-event behavior and final ACK barrier. Keep `productionReady` false until actual integration is reviewed. Document how subsequent issuance/transport work must enforce these settings; do not claim a client setting is a hard account spending cap.

Text lifecycle must correctly handle provider context errors both as standalone errors and failed response status where relevant to documented events. Discard unusable capacity assumptions, preserve existing transcript semantics and require explicit user recovery. Do not automatically truncate history or repeat a paid request.

## Acceptance and tests

1. Both PDF and YouTube fixture text reconstructs exactly through preparation/manifest. Both A/B variants may be prepared; no untested automatic quality selection. All ownership/expiry/replacement/cancellation tests remain valid.
2. Explicit provider-enforced text input can prime through completed settings/items/finalization ACKs; measured-fit validation never accepts this basis as measured. Unknown model, voice mode, unsupported revisions, altered source/manifest/settings and synthetic assertions fail closed.
3. Missing/partial/out-of-order ACK, output-cap/truncation mismatch, timeout, cancellation and late callbacks cannot admit questions or revive a run.
4. Scripted context overflow on first and later response stops safely, retains full preview and existing conversation, and causes zero automatic retry/truncation. No capacity claim from item ACKs or the07D sample.
5. Default production remains unavailable; no real key/database/provider access in worker tests. No permanent secrets or server internals enter browser bundles.

Use pinned Node24.22.0/npm11.19.1 in a secret-free test environment and preserve lockfile. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:context`, `npm run test:priming`, `npm run build`, `npm run test:smoke`. Check current package scripts and run affected text lifecycle/browser and mode-switch suites because their shared input contracts may change. Add meaningful focused provider-admission cases, not implementation-mirroring checks. Use unusable loopback DATABASE_URL and empty keys; never inherit real `.env` for tests.

## Manual checks and evidence

1. Worker demonstrates scripted full-source text priming and rejection/recovery matrix locally; label every provider response simulated.
2. PM reviews source completeness, server authorization boundary, changed admission semantics and current official disabled-truncation/error contracts.
3. Subsequent live full-source/overflow/phone tests remain NOT_RUN here. This task cannot complete original Step07.

Return READY_FOR_REVIEW with base/dirty/build/runtime identity, changed hashes, exact commands/UTC/exits and failures, safe matrix, source reconstruction evidence, browser/server boundary audit and remaining integration obligations. Save logs under ignored `artifacts/local/07e/`; update PROJECT_STATE, TESTING and one concise runbook.

Apply OpenAI Docs (`C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md`) for exact current protocol contracts. Apply `.agents/skills/vercel-react-best-practices/SKILL.md` only for React changes and `.agents/skills/playwright-cli/SKILL.md` for browser testing. Follow docs/SKILLS.md; no UI redesign.

Stop if this requires public issuance, transport factories, model migration, paid calls, WebRTC voice activation, retrieval/summarization, schema changes or a new service. No deployment, flag/secret edits or Supadata work. Those require a subsequent bounded task, not an improvised bypass.
