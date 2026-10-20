# Task 02D — owned-source voice preparation and credential boundary

**Proposed READY_FOR_REVIEW; implemented and verified offline only.** Base: clean `main`, HEAD `52ebd6e886db16daaec6c9e1b9607a698555923b`. Delivery is dirty/uncommitted; no commit, push, live operation or deployment. Final isolated production build: **`3CZnJ4A2b8LMobw-ksQIe`**, Node **24.22.0**, npm **11.19.1**. PM decides acceptance under original Steps 02/07. Browser voice wiring is a later assignment.

## Browser contract for the next adapter

Dedicated routes are independent of `/api/realtime/client-secret` and the text gate. `OWNED_SOURCE_VOICE_ENABLED` must be exactly `true`; default is unavailable. Existing owned-source read configuration (valid database URL, ingestion/read gate, exact origin and signing secret) plus a server API key are prerequisites. No arbitrary model environment override is used: the server selects accepted 07G mini/voice revision `provider-voice-full-source-2026-10-20-v1`, structured B, 512 output tokens and marin. Nothing enables ordinary application Voice UI or adds a transport factory.

Both requests are same-origin JSON POSTs, with the existing signed HttpOnly visitor cookie and matching Fetch Metadata when present. Bodies are capped at 512 bytes including chunked requests, with a 2-second read deadline; extra fields are rejected. No query parameters, source text, policy/settings, owner IDs or readiness assertions are accepted.

| Route | Exact request fields | Success projection |
| --- | --- | --- |
| `/api/voice-preparations` | `{sourceId, requestId}`; both UUIDv4 | 201: `{preparationId, requestId, expiresAt, conversationReady:false, providerConfirmed:false, input}` |
| `/api/voice-preparations/credential` | `{sourceId, requestId, preparationId}`; same IDs and visitor | 200: `{preparationId, clientSecret, expiresAt}` |

`preparationId` is an unpredictable 43-character identifier, not a provider credential. Preparation `expiresAt` is epoch **milliseconds**; credential `expiresAt` is provider epoch **seconds**. `input` is the existing safe `ProviderPrimingInput`: exact policy, complete structured-B variant and ordered bounded manifest. It contains necessary source data/instructions and safe protocol metadata, with no raw storage model, owner hash, cookie, key or environment object. Never render the source as HTML. Preparation is not proof of actual provider capacity, grounding or conversation readiness.

The ticket is bound to visitor, source, request identity and the server-held immutable preparation. A credential request claims it before awaiting work. It never accepts a returned browser projection as authority. A claimed ticket cannot be retried after failure, timeout, cancellation or quota denial. Responses use `Cache-Control: no-store` and `nosniff`, including every error and exported method denial. Statuses: unavailable prerequisites 503; invalid origin/metadata/query 403; invalid visitor 401; invalid body 400; unavailable source/ticket/acquisition 404; conflicting preparation/repeated request 409; limits 429; unsupported methods 405. Source denials have identical generic bodies for missing/foreign sources. Provider/SQL errors never reach the browser.

The future adapter must keep ticket/source projection/credential in memory, obtain the credential only when connection acquisition is intended, and abort outstanding requests on Stop, replacement, departure or visitor change. No local/session storage, URLs, logs or telemetry may contain a credential. There is no cancellation endpoint for an already returned, unclaimed preparation: discard it locally; it expires within 30 seconds, and a new preparation for that owner waits for expiry or source invalidation. The accepted existing full-source priming controller must observe initial settings, all ordered source-item ACKs and final settings before questions/media. This task does not implement those browser adapter obligations.

## Provider schema and initial barrier

Official documentation checked 20 October 2026: [create client secret](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create). The request uses one `POST /v1/realtime/client_secrets`, `expires_after:{anchor:"created_at",seconds:60}`, fixed mini model, initial text-only output, input `turn_detection:null` and `transcription:null`, `tools:[]`, `tool_choice:"none"`, `truncation:"disabled"`, 512 maximum output tokens and marin voice. Initial instructions only say context is loading; uploaded content enters later through the existing priming protocol. No new transcription model is selected.

The injectable client has no retries, rejects redirects, uses no-store, and bounds fetch plus body parsing to 8 seconds/32,768 bytes. It validates MIME, JSON, key shape, current expiry (at most 65 seconds ahead), and the effective session's safe initial settings. It cancels failed/stalled/oversized and late response bodies, propagates abort, consumes late rejections, and returns only the two credential fields. The registry independently validates that DTO again after final source/visitor checks. The bundled Next 16.4.2 Route Handler guide was consulted; both new Node routes are explicitly dynamic with explicit uncached method-denial responses.

**A client secret can create multiple sessions until expiry, active sessions can outlast expiry, and clients can change attached settings.** It is not source-bound provider authorization, revocation, a hard session duration or an account spending cap. Server checks govern issuance and the initial configuration only. They do not enforce post-issuance browser behavior or prevent a client from manually changing VAD/output settings. Live schema/model acceptance remains untested.

## Ownership, race and resource matrix

Fresh cookie/config/expiry checks accompany preparation, immediately precede minting and follow it. Actual owned Source reads validate kind/status/active ownership/expiry and exact source identity. Before delivery, structured-B serialization must still match the server-held preparation, including content/locators/kind/expiry. Source replacement/removal through existing repository commits invokes the existing process-global invalidation listener. No Source write or schema change was added.

| Condition | Expected behavior and evidence |
| --- | --- |
| Missing prerequisites; proof/text flags alone | 503/no-store, no source read/provider call; unit config/handler tests and built prerequisite denials |
| Foreign/missing/forged/expired visitor or Source; wrong ID/kind/status | Generic denial without acquisition or content disclosure; both real route and unit suites |
| Wrong Origin/Fetch Metadata/body; model/policy/text/owner overrides | Denied before source reads; bounded chunked/stalled/aborted bodies release readers/listeners |
| PDF/YouTube owned success | Complete structured B reconstruction, preparation makes zero calls, exactly one fake credential; built routes and Chromium harness |
| Altered ticket/source/request ID, replay, simultaneous acquisition | Binding denied; one claim/acquisition; command concurrency can instead reject overlap with429; no retry |
| Source content/expiry changes without local invalidation | Fresh pre/post-mint reads deny, including simulated cross-process mutations |
| Removal/replacement while minting | Existing committed invalidation aborts; post-mint checks discard results; actual DELETE through built source route included |
| Caller cancellation, expired visitor/ticket, held preparation/mint, actual8s provider deadline | No stale credential; late results/rejections discarded; held/late bodies cancelled; once-only cleanup |
| Provider error/invalid JSON/MIME/body/key/expiry/effective session | Sanitized failure, one attempt, consumed ticket, no credential in error response |
| Visitor/network/global/lifetime/concurrent exhaustion | Reservation refused; ticket consumed if acquisition was claimed; zero new provider calls; actual concurrent2/visitor3 HTTP cases plus focused unit cases |

Bounds are process-local. Preparation uses existing conservative `proofLimits` (6/visitor,20/shared-network,20/global per hour,100 lifetime,2 active). Outstanding preparations are additionally limited to **4**, one per owner, with 100 lifetime replay tombstones. Preparation computation has a 5-second deadline; tickets last at most 30 seconds and never exceed source/visitor expiry. Acquisition has a 10-second outer bound, further limited by ticket/source/visitor expiry. Issuance reuses **3/visitor,10/shared-network,20/global per hour,50 lifetime,2 concurrent**. Command/body admission independently limits30/visitor,100/shared-network/global per hour,500 lifetime,4 active. Untrusted proxy headers cannot create network buckets; everyone shares `unverified-network`. Counts charge failed attempts and are never described as an account cap.

Source invalidation clears the timer and projection and aborts pending work; consumed/expired entries are removed. Bounded replay tombstones deliberately remain until restart. An injected mint ignoring abort keeps its acquisition slot until it actually settles, preventing cancellation from bypassing concurrency; its result is never delivered. The production provider wrapper itself returns by its fixed deadline and cancels late transport results. An underlying noncooperating transport may still finish minting an **undelivered** secret, valid until provider expiry; there is no revocation handle. This is charged as an attempt, not refunded. The built race group observed6calls,3aborts,3late-body cancellations, held0 and entries/timers/pending0 on completion.

Restarts lose tickets/tombstones/counts; clients need explicit fresh preparation. Multiple instances have independent limits and local invalidation listeners, so sticky routing or shared coordination is required before multi-instance use. Shared database revalidation catches changes visible at the final read, but cannot atomically revoke an already delivered credential or remove the interval after that read. An HTTP request carries a snapshot of its visitor cookie: the server revalidates its signature/expiry/current config; it cannot observe a later cookie change in the browser without request cancellation or a new request. None of these limits establishes source binding, revocation or a provider spending ceiling.

## Verification and evidence

New focused command **added by02D**: `npm run test:owned-voice` (88focused units, then366built HTTP/browser/bundle assertions across4fresh server processes, port3128). Unit-only command: `node --conditions=react-server --test tests/unit/owned-voice.test.ts`. No new dependency; package-lock retained unchanged. Run build first. All commands below ran in the retained `.env`-free isolated copy with a dependency junction, pinned runtime, empty real keys, unusable loopback DB and external-network denial. Test preloads inject synthetic Prisma/fake provider only; no production test flag, route, or factory exists.

All rows are **PASS/exit0**, 20October2026UTC, on final build `3CZnJ4A2b8LMobw-ksQIe` (build row creates that identity):

| Exact command | UTC start–end | Observed |
| --- | --- | --- |
| `npm run lint` |22:28:39.247–22:28:46.803|No warnings |
| `npm run typecheck` |22:28:46.809–22:28:50.848|PASS |
| `npm run test` (same test script as `npm test`) |22:28:50.852–22:28:55.517|1,381unit tests, including all94accepted07G checks |
| `npm run build` |22:28:55.519–22:29:02.088|Production build PASS; workspace-root warning retained |
| `npm run test:smoke` |22:29:02.089–22:29:07.185|18browser checks |
| `npm run test:boundaries` |22:29:07.187–22:29:11.071|186focused units +59built HTTP assertions; network0 |
| `npm run test:owned-text` |22:29:11.072–22:29:27.992|416HTTP/browser assertions; fake-provider scope |
| `npm run test:owned-voice` |22:29:27.994–22:29:45.314|88units +366built assertions; network0 |

Evidence root: ignored `artifacts/local/02d/`. `commands.jsonl` has every verification invocation's exact UTC/exit/log path, including development failures. `verify.mjs` reproduces the isolated copy/environment. `changed-files.sha256.json` and `audit.json` bind final code/report/dirty identity. Final `built-http.json`, `ordinary-voice-disabled.png` and four safe server logs are copied beside them; originals remain inside `offline-checkout/artifacts/local/02d/`. Existing regression reports remain under that copy's task-specific directories. The actual390px render was visually inspected: selected source and Voice mode, unavailable Start, microphone not in use and playback not enabled. The dedicated same-origin Chromium harness passes owned success/foreign denial with exactly1new provider call. Response, server-log and client-bundle scans contain no tested key/owner/raw-error/server-runtime markers. No credential contents are recorded in evidence.

Earlier focused invocation22:24:10.725–22:24:13.970UTC exited1 due to tests mutating stale synthetic transaction snapshots, counting the Request implementation's own abort listener, and expecting404 where command concurrency correctly returns429. Fixture/assertion corrections passed87units22:24:29.582–22:24:32.667UTC. First full1380/build/regressions passed on `DfX93i_lHyQGYACpKCqED`; first new HTTP harness22:27:29.375–22:27:45.364UTC exited1 because its5s wait was shorter than the actual8s provider deadline. `first-built-http.json` preserves that partial run. Corrected wait and a fresh visitor-bearer change regression produced the final88/1381checks/build above; the earlier failures are not relabelled PASS.

Acceptance1–5 map respectively to configuration/disabled UI evidence; ownership/body/binding matrix; both-kind built success/redaction; race/resource/provider/limit matrix; full/regression commands. No scoped defect remains observed. Real provider/database/configuration/deployment, WebRTC, microphone/speaker/interruption, transcription, grounded voice, hosted and physical-phone tests are **NOT_RUN** and excluded. No human setup is needed for02D. Preserve all original step IDs/unmet live gates; return to PM before adapter integration or another task.
