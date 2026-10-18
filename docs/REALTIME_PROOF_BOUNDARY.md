# Task 02a server boundary

**02b local worker addition:** the server-gated voice page is `/proof/voice`; it reuses these endpoints and cookie. The mint session now explicitly configures audio output, `marin`, `gpt-4o-mini-transcribe` input transcription and server VAD. Configured Realtime model/source/TTL/admission remain unchanged. See [02b handoff](VOICE_PROOF_02B.md) for cancellation, 60-second client limit, mocked evidence and NOT_RUN live checks. PM accepted this addition for its local/mock scope; Step 02 remains IN_PROGRESS.

PM accepted 02a at `eae9444e520707a427602b88b535feb2b2135686` and 02b at `716e120aff0823952fd0255f2a86a9877e5c6db6` for local/mocked verification: 93 unit tests, six disabled smoke checks and ten voice browser checks pass. The gated WebRTC client exists; live spoken-answer/Stop, real database authorization and deployed proof checks remain NOT_RUN. No live database or OpenAI request is authorized for the worker by this task. The public shell remains disabled. Next single brief: `WORKER_TASK_02C.md`, microphone-free text transport; its proposed mode extension is not implemented yet.

## Configuration

All configuration is server-only. `.env.example` contains safe defaults; do not set any `NEXT_PUBLIC_` variant. Configuration is read per request, and disabled/incomplete configuration returns a generic 503 before database/provider access.

| Name | Default / safe example | Purpose |
|---|---|---|
| `PROOF_ENABLED` | `false` | Explicit opt-in for both proof endpoints |
| `REALTIME_ISSUANCE_ENABLED` | `false` | Separate opt-in for outbound credential minting |
| `APP_ORIGIN` | `http://localhost:3000` for development; `https://talk-to-document-4pre.onrender.com` for deployment | Exact allowed Origin, no trailing slash/path; HTTPS required in production |
| `VISITOR_COOKIE_SECRET` | Empty | Securely generated 32 random bytes encoded as 64 hex characters, required when proof is enabled; never use a sample/test secret |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime` (example, no account-access claim) | Explicit configurable model required for issuance; no automatic model selection |
| `OPENAI_API_KEY` | Empty | Existing ordinary server key; required only for issuance, never requested or used in this worker task |
| `DATABASE_URL` | Existing private configuration | Existing lazy Prisma client, required for proof storage; not needed to build or serve the disabled shell |

PM configures secrets through the normal secure environment mechanism. Keep the cookie secret stable across restarts; rotation invalidates cookies and makes prior rows inaccessible. No signing secret was generated or saved by this worker. Missing key/model or issuance disabled still permits proof creation if proof configuration/database are present. Missing proof configuration disables both routes.

## HTTP and cookie contracts

`POST /api/proof-source`, JSON `{}`: creates or reuses the visitor's one fixed synthetic source. Returns only `{id,title,text,expiresAt}` (ISO timestamp), plus Set-Cookie. No text, owner identity, model or provider options are accepted. This is a proof-specific route, not ingestion or the operator probe. It exposes no probe manifests/commands. The existing PDF enum is used internally with an explicit synthetic provider marker and warning; no PDF was imported.

`POST /api/realtime/client-secret`, JSON `{sourceId: "UUID"}`: requires a valid visitor cookie and that visitor's unexpired READY synthetic source. Returns only `{clientSecret,expiresAt}` (Unix seconds). The future WebRTC client must keep it in memory and never log or persist it. The earlier plan's `/api/realtime/token` was a proposed name; this is the implemented route.

Both routes require exact configured `Origin` and, if present, `Sec-Fetch-Site: same-origin`. No CORS grant is returned. JSON bodies are capped at 256 bytes while streaming, with a two-second read deadline, and unexpected fields are rejected. These checks block browser CSRF; Origin is not identity for a non-browser caller. Requests may not supply owner hashes. A valid cookie proves bearer possession, not a human identity.

Cookie: `__Host-td-visitor` under HTTPS, `td-visitor` only for local HTTP development. It carries 32 random bytes, an absolute expiry, and domain-separated HMAC-SHA256. It is HttpOnly, SameSite=Strict, Path=/, host-only (no Domain), Secure on HTTPS; Max-Age and Expires are at most one hour. Signature and absolute expiry are verified on every request, duplicate/malformed cookies reject, and reusing a visitor does not renew expiry. The marker saved on Source is a domain-separated SHA256 of the high-entropy bearer; neither marker nor bearer appears in JSON. Proof establishment replaces missing/invalid/expired cookies with a new visitor; credential issuance rejects them with 401.

All handled POST outcomes use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Statuses: 400 invalid input/cancelled request; 401 missing/invalid visitor; 403 origin/fetch-metadata rejection; 404 missing, other-owner, expired, not-ready or non-proof source; 429 admission limit; 503 disabled/configuration/database/provider failure. Error bodies contain only a generic `error`. Framework unsupported-method responses contain no sensitive results (GET returns 405).

## Storage, races and admission

The service derives a stable UUID-shaped ID from the owner marker and uses the existing primary-key upsert with an empty update. This yields one record per visitor, including concurrent attempts or process restart; reuse never extends expiry or changes content. The unique primary key prevents duplicate rows even if Prisma resolves a race with an error. The service checks ownership, proof marker/content, readiness and expiry after database work and immediately before provider access. Expiry/cancellation after issuance suppresses the returned credential, but cannot undo a provider request already admitted. No schema or migration change is needed. Tests mock the store; real Prisma upsert/concurrency behavior remains a PM check.

| Admission | Visitor / hour | Network bucket / hour | Global / hour | Process-lifetime attempts | Concurrent operations |
|---|---|---|---|---|---|
| Proof create/reuse | 6 | 20 | 20 | 100 | 2 globally, 1 per visitor |
| Credential issuance | 3 | 10 | 20 | 50 | 2 globally, 1 per visitor |

The hour is a process-local fixed window; counters reset at the first acquisition after its expiry. Attempts that reach admission consume quota even on source/provider failure. Active slots release in `finally`, independently of window rollover. Maps are bounded by the global attempt limit within each window. Limit exhaustion is fail-closed; there is no retry or automatic reset endpoint. Two route bundles share the singleton on `globalThis` within one Node process.

**IP trust rule:** no forwarded-IP header is trusted. Because App Router has no verified peer-IP/proxy contract here, every caller uses one shared network bucket. Thus each IP is conservatively bounded by the aggregate limit, with reduced availability for unrelated users. Changing X-Forwarded-For, X-Real-IP or Host cannot obtain a fresh bucket. PM must establish a trusted proxy contract before adding per-IP differentiation. There is no claim of accurate client-IP identification.

Counters/concurrency reset on restart/deploy, are not shared across Node processes/instances, and cookie clearing creates a new visitor (still subject to aggregate limits). Do not scale this proof without coordinated admission. Database expiry is enforced on access; there is no deletion job, so expired proof rows remain. Creation is bounded per process, not over all future restarts. Existing database connection settings remain unchanged; slow database operations can occupy admission slots until the driver completes. No live database mutation was performed to test this.

## Provider contract and limits

Backend-only injectable fetch POST to `https://api.openai.com/v1/realtime/client_secrets`; Bearer ordinary key plus `OpenAI-Safety-Identifier`, derived separately from the visitor marker. Request body uses `expires_after: {anchor:"created_at",seconds:60}` and `session: {type:"realtime",model,...}`. Session instructions include only the fixed synthetic text and set `max_output_tokens:256`. No beta header or older `/realtime/sessions` shape is used. No SDK/dependency was added.

Eight-second deadline covers headers and body parsing, aborts fetch, and returns a sanitized failure; no automatic retries, redirects or upstream-error logging. The adapter validates top-level `value` and `expires_at`, rejects expired or unexpectedly long-lived credentials (65-second ceiling allows five seconds of clock skew), and discards the session object and all other fields. Model availability, real response behavior, clock skew and successful connection remain unverified.

TTL limits new connection admission; it does not end an active session. A credential can create multiple sessions before expiry and clients can override attached session settings. The synthetic prompt, output setting, issuance limits and TTL are **not a hard spending cap**, single-use guarantee or cryptographic source binding. The user's stated $50 ceiling (currency unspecified) still requires PM funding/allocation and provider-side operational controls before live use.

Official OpenAI sources searched and opened on **18 October 2026**:

- [Create client secret](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create): request/response, configurable model, TTL range and limitations.
- [WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime): backend-created ephemeral credential flow; requested legacy guide URL redirected here.
- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices): server-side `OpenAI-Safety-Identifier` on client-secret creation.

Version-matched Next.js 16.4.2 guides read locally: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/03-file-conventions/route.md`, `01-app/03-api-reference/04-functions/cookies.md`. Handlers use Web Request/Response and Set-Cookie headers as supported by those guides. Server runtime modules import `server-only`; configuration/admission modules are pure policy. `src/shared/proof.ts` contains only public DTO types.

## Verification and remaining PM checks

`npm test` now uses Node's `--conditions=react-server` to load actual server-only modules in tests. This does not remove their client-bundle guard. `tests/unit/proof.test.ts` exercises real Request/Response/cookie/crypto behavior with explicit in-memory database and provider mocks; adapter tests inject fetch and never contact OpenAI. `npm run test:smoke` starts the production build with both feature flags forced false, checks the real route wiring and shell in desktop/mobile Chromium viewports, and never creates a source. No phone/audio claim follows from viewport emulation.

PM later, all **NOT_RUN** for this task:

1. After code review, configure proof flag/origin/cookie secret privately; keep issuance disabled. Use two isolated browser sessions and the chosen real PostgreSQL database. Verify same-visitor reuse, different IDs, no expiry renewal and concurrent creation behavior.
2. Confirm cross-visitor, expired/not-ready source and invalid-Origin requests fail. Inspect only status/field names/expiry/cache headers; never record cookies or credential values.
3. After funding/key and a bounded PM test allocation exist, configure the model/key and explicitly enable issuance. Check one owned-source mint and actual expiry/no-store without storing the credential. Real WebRTC, mic, Stop and physical spoken-answer proof belong to the next worker task.
4. Disable issuance and proof after the verification. Record deployment/build, UTC times, outcomes and safe evidence in the tracker. No account purchase, top-up, deployment or live call has been performed here.
