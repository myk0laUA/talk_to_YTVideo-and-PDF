# Task 02D — owned-source voice preparation and credential boundary

Use prompts/WORKER_PROMPT.md. One active implementation task under original Steps02/07; estimate90–150minutes. Inspect current HEAD. Implement locally and verify offline; return before live testing or browser voice wiring.

## Outcome / starting evidence

Provide the server boundary needed by a future WebRTC adapter to prepare a visitor-owned source and obtain a short-lived voice credential. Existing /api/realtime/client-secret is synthetic-proof-only and must stay that way. 07G's separate mini/voice admission is accepted for offline scope, build qOEyn0vhz9wjTkjYJVKCE;94focused tests freshly passed PM review. No real voice readiness is established. 10E proves local PDF/text functionality with retained capture limitations; hosted/phone voice remains untested.

## Scope

Inspect src/server/context/model-measurement.ts, model-policy.ts, src/server/proof/{visitor,admission,handlers,provider,config}.ts, src/server/text/{config,handlers,registry}.ts, src/server/sources/invalidation.ts and existing boundary tests. Reuse established ownership, origin, bounded-body and error handling. Add dedicated server-only voice modules and dedicated routes; do not broaden synthetic proof routes or couple voice activation to the text gate.

Implement a default-false owned-source voice configuration, a safe preparation response and a separately authorized credential request correlated to that preparation. A single bounded endpoint design is acceptable if it still supports preparation/admission before connection acquisition and preserves all checks below. Document the chosen browser contract for the next adapter task. Server chooses exact accepted07G policy and structuredB; clients provide identifiers, never arbitrary model/settings/source text or assertions of readiness. Export only necessary source projection and safe metadata; never owner hashes, raw models or environment objects.

Freshly authorize the anonymous visitor and owned, unexpired Source at preparation and immediately before provider acquisition. Revalidate source identity/content/expiry after asynchronous minting and suppress returned credentials if source/visitor changed or cancellation occurred. Bound preparation tickets/replay state, deadlines, body sizes, concurrent acquisition, visitor/network/global/lifetime issuance and cleanup. Reuse existing conservative issuance limits or tighter ones; do not describe process-local counts as an account spending cap. Source replacement/removal invalidates outstanding preparation; document restart/multi-instance limitations. Failed requests must not release reusable credentials or trigger retries.

Build an injectable provider client using current official Realtime client-secret schema, fixed mini policy and a short credential lifetime. Initial session must have input VAD/automatic responses disabled, no tools/truncation and bounded output, matching07G's safe initial settings. Do not put uploaded source contents in initial provider instructions before the existing full-source priming process. Bound and validate upstream response bodies and expiry; sanitize errors, cancel bodies and honor abort/deadlines. Never log/store permanent or ephemeral keys. Return an ephemeral credential only in the authorized no-store response, never URLs or browser storage. A client secret is reusable within its validity and client settings may be changed: document that it is not source-bound authorization, revocation, a hard session limit or a cost cap. Do not claim post-issuance browser behavior is server-enforced.

## Acceptance

1. Gate/key/signing/database prerequisites absent: safe503/no-store, no provider call. Existing proof and text gates do not enable the new path; ordinary application voice remains unavailable.
2. Foreign/missing/forged/expired visitor/source, replaced/removed source, malformed/oversized body, origin/metadata mismatch, altered policy/source and stale/replayed preparation are denied. No provider acquisition before fresh authorization; denied paths do not leak source existence/content to another visitor.
3. A valid PDF or YouTube source using synthetic storage prepares complete structuredB without truncation and receives one fake provider credential through the actual built route. Permanent keys, owner hashes and raw errors are absent from browser payloads/bundles. Both success and failure responses are no-store.
4. Cancellation, timeout, quota/concurrency exhaustion, provider failure/malformed response, expiry during mint and source replacement/removal during awaits cannot deliver a stale credential; resources/slots/timers are released once. Unabortable late upstream results are discarded. Any unavoidable minted-but-undelivered credential limitation is explicitly reported.
5. Existing text/voice admission and anonymous boundary suites pass. No live provider/database/config/deployment operation. Browser voice transport, real media, transcription-model change and UI wiring are excluded.

## Verification and skills

Use pinned Node24.22.0/npm11.19.1 in an .env-free isolated copy with empty keys, unusable loopback DB and external-network denial. Add focused unit and built-HTTP tests using injected provider/storage. Establish and document the new focused command; do not represent it as an existing script. Required existing commands: npm run lint, npm run typecheck, npm test, npm run build, then npm run test:smoke, npm run test:boundaries and npm run test:owned-text. Include07G's94checks in the full suite. Run other browser suites only if changes affect their paths.

Use OpenAI Docs (C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md) for current provider schema; task-relevant .agents/skills/playwright-cli/SKILL.md for built browser checks, following docs/SKILLS.md. No frontend redesign/React work is expected. Consult bundled version-matched Next docs for new route behavior.

Manual checks in the isolated production build: (1) select ordinary Voice mode and confirm Start stays unavailable; (2) use the dedicated isolated test harness to verify one owned success and one foreign-source denial, with provider call counts; (3) confirm no secret appears in safe response/bundle scans. These are fake-provider checks; real WebRTC, microphone/speaker, phone and hosted tests remain NOT_RUN. No human setup is needed.

## Evidence / stop

Return READY_FOR_REVIEW with base/dirty identity, buildID, changed-file hashes, exact commands/UTC/exits, request/response contract without credentials, ownership/race/resource matrix, safe screenshots/log paths and remaining limitations. Update PROJECT_STATE/TESTING and one concise02D report. Artifacts belong in ignored artifacts/local/02d. No paid call, .env edit, migration, deployment or public enablement.

Stop if current official schema cannot preserve the initial no-audio barrier, or if implementing this boundary requires changing WebRTC architecture or weakening ownership/admission. Do not add a browser adapter or another task. PM sequences adapter integration and bounded live verification after review.
