# 07E — provider-enforced full-source text preparation

Proposed **READY_FOR_REVIEW**, implementation/local simulated scope only. PM decides acceptance. Original Step07 remains unfinished. No public endpoint, issuance adapter, transport factory, production flag, live request, database migration or deployment was added.

## Contract and readiness

`AdmissionInput` explicitly separates the existing measured input (including existing test-only synthetic measurements) from `ProviderPrimingInput`. The latter has `basis: provider_enforced`, the exact `gpt-realtime-2.1-mini` text policy revision `provider-text-full-source-2026-10-20-v1`, a full source variant and its exact manifest. It contains no token count, tokenizer binding or input-capacity number. `validateAdmission` always rejects this basis as measured fit. Legacy07C model diagnostics remain unchanged and unresolved; the mini policy does not resolve their tokenizer/framing gaps.

`createProviderTextPreparation` is server-only and requires a server-established visitor. It reuses the existing owned/unexpired source read and lossless A/B representation, yields through cancellation-aware preparation, builds bounded events, then re-reads/revalidates source ownership, expiry and complete B representation. A/B selection is explicit; there is no automatic quality choice. Preparation takes three source reads and performs no source/cache writes. Resource limits remain16,384bytes/event (negotiable down to2048),4096items and8,000,000wire bytes; these are resource bounds, never token upper bounds.

The immutable result binds source identity/content/expiry, representation, variant, run, mode, model, revision and settings. Client structural validation re-encodes the full variant and all events. `matchesProviderPreparation` additionally requires the original server-created object, its retained SHA256/UTF-16LE fingerprint, matching expected identity/policy and unexpired source time. Cloning or changing a projection cannot pass that server provenance check. This process-local check is **not authorization**, durable storage, or a guarantee that a Source has not subsequently been deleted/replaced. No owner marker, visitor token, environment object, raw database row or key appears in the client projection.

Initial and final updates request text output, tools empty/tool choice none, VAD off, transcription explicitly null, disabled truncation,512maximum output tokens per response, and minimal reasoning. Effective ACKs must confirm all these settings on the same exact model/session. Every complete source `conversation.item.done` and the distinct final settings ACK, plus settled sends, are required. `item.added`, partial/malformed ACKs, final ACK before the items, mismatched predecessors, missing settings, timeouts, Stop and late callbacks cannot admit questions. Full item ACKs may arrive in reverse order after ordered source sends; readiness still waits for every full ACK and the final barrier, preserving07B's established semantics.

`protocolReady` means the complete source protocol was acknowledged. It does **not** mean the provider can generate a response with that input. `productionReady` remains false. Capacity is checked at **every** generation, including later history growth. A successful response or the PM's07D tiny live sample creates no future capacity assumption.

`TextLifecycle` permits one explicit provider-policy response attempt at the512-token cap after its existing draft/revision/receipt barriers. It adds no automatic retry, history deletion, summarization or model switch. Context errors terminate the attempt, release the connection/listeners/timers once, clear the active policy, and retain existing transcript semantics and the external source preview. Both standalone `error` and correlated failed `response.done.status_details.error` are handled, including optional absent output. Other failures remain fail-closed. Provider error messages are never displayed. The UI names the context limit and requires explicit fresh-session recovery; an explicit Start retains the established behavior of clearing conversation/draft, with a visible notice. Voice rejects this basis before connection/media acquisition, even if its mode is altered.

## Official protocol evidence

OpenAI Docs applied. The official [model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), [client events](https://developers.openai.com/api/reference/resources/realtime/client-events) and [server events](https://developers.openai.com/api/reference/resources/realtime/server-events) were consulted20October2026UTC. The web tool opened the model/client pages; its server HTML fetch exceeded its size limit and its Markdown fetch rejected the content type. Both exact official client/server Markdown schemas were then fetched successfully over HTTPS at19:08:11UTC, retained as `artifacts/local/07e/official-{client,server}-events.md`.

The reference documents disabled truncation producing errors instead of dropping earlier messages, text output disabling audio output, optional `max_output_tokens` (generic1–4096 range), minimal reasoning, explicit null to turn transcription off, effective session updates, complete item events, and failed response status details.512is within that generic documented output range. Error codes are strings rather than an exhaustive context-error enum; tests simulate `context_length_exceeded`, and the existing context/length/limit classifier is reused. This is protocol implementation evidence, not observation of a real full-source overflow shape or model/account compatibility. The model page's advertised context size is never used to fabricate a local fit assertion.

## Verification and acceptance map

All07E provider replies are **simulated**. All worker commands run with pinned Node24.22.0/npm11.19.1 in ignored `artifacts/local/07e/offline-checkout`, copied only from tracked/task inputs with `.env` excluded and installed dependencies reused through a junction. Empty keys, unusable loopback PostgreSQL URL and disabled public gates are explicit. No fresh install, real SQL, credentials, provider, WebRTC or physical device is claimed. The shell's `.env` was never loaded into these checks.

| Task criterion | Evidence |
|---|---|
|1. Complete PDF/YouTube A/B, authority/cancellation | Focused provider suite reconstructs each complete source exactly and records source hashes/item/byte counts; foreign/expired/missing/replaced/final-read changes and cancellation at each noncooperating read are denied. Existing79context checks retained. Large Unicode splitting preserves all text; bounds reject rather than shorten. |
|2. Explicit basis, binding, fail-closed policy/voice | Actual default priming/text lifecycle accepts the server-prepared provider input without synthetic subclass admission. Measured validation refuses it; exact model/revision/mode and altered source/settings/manifests/extra synthetic assertions are denied. Server provenance rejects clones/stale identities. Voice acquires nothing. |
|3. Full ACK and lifecycle barriers | Initial/final effective mismatch matrix, missing/partial/added-only/early-final ACKs, unsettled final send, timeout, Stop and late callbacks; all existing75priming/90text lifecycle and voice interruption checks retained. |
|4. Overflow and explicit recovery | First/later standalone/failed-response cases preserve source/prior text, close once, and emit zero automatic retries/truncations. Four browser overflow/recovery scenarios at320/390/768/1440px (16new cases); partial text and full source remain visible until explicit fresh Start. All provider responses authored. |
|5. Default unavailable and browser boundary | Separate actual production build remains unavailable. Emitted dependency graph excludes server/test/network/media APIs; production bundle/route audits exclude test fixtures and server preparation. No factories/routes/config/key/dependency/lockfile/schema change. |

Run from a disposable **no-key checkout without `.env`**, using the README's pinned runtime setup and empty provider keys/unusable loopback `DATABASE_URL`:

```text
node --conditions=react-server --test tests/unit/provider-admission.test.ts
npm run lint
npm run typecheck
npm test
npm run test:context
npm run test:priming
npm run test:text-lifecycle
npm run build
npm run test:smoke
npm run test:text-session
npm run test:mode-switch
npm run test:lifecycle
npm run test:interruption
npm run test:voice-session
npm run test:recovery
```

The retained local runner `artifacts/local/07e/verify.mjs` creates/refreshes the no-env copy and explicitly allowlists its environment; `focused` runs the first command and other arguments name npm scripts. Do not run framework tooling against a checkout containing real `.env`. Exact command UTC/exits/logs (including failures), final build and changed hashes are in PROJECT_STATE and `artifacts/local/07e/{commands.jsonl,audit.json,changed-files.sha256.json,provider-matrix.json}`. Browser outputs remain under the isolated copy's `artifacts/local/{10b,10c,08c,11b}`. Screenshots were inspected; emulation is not physical-device evidence.

## Subsequent integration obligations — NOT_RUN here

PM must separately assign an owned-source issuance/transport integration. It must establish the visitor on the server, re-read ownership/expiry/replacement immediately before credential issuance and at the relevant transport/turn boundaries, and derive policy exclusively from server configuration. A browser-supplied basis, manifest, numeric budget or serialized receipt cannot authorize a source or mint credentials. The WeakMap provenance marker is not a browser token or cross-process capability. Keep existing synthetic proof credential paths closed to uploaded sources.

The server/owned transport must enforce exact model/mode/revision, disabled truncation,512output cap, minimal reasoning, no tools/VAD/transcription/audio, full-source ACKs and single-owner Stop/deadline semantics. It must prevent unapproved client configuration/response overrides, unsolicited generation and audio input; client configuration alone cannot impose a hard account spending cap. Recheck effective settings and fail closed on drift. Reuse one connection per attempt; do not retry a potentially charged request after a timeout or context rejection. Do not infer a fit guarantee from priming, usage returned by an earlier response, advertised context size or07D's sample.

Actual full-source and growing-history overflow, live grounded answers/quality, provider error/effective-setting compatibility, real source issuance/transport, WebRTC voice, deployed/browser recovery and physical iOS/Android remain **NOT_RUN**. When separately authorized, PM must bound requests/output/time/usage, record live failures as well as successes, verify complete source/preview/history retention, confirm no silent truncation/retry, and test explicit user recovery. No live command is introduced by07E and no original Step07 completion is claimed.
