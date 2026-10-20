# Task 10D — owned-source application text integration

Proposed **READY_FOR_REVIEW** for the local vertical slice only. Original Steps 02/07/10 remain open. PM owns acceptance, live allocation, activation and deployment. No real `.env`, hosting setting, dependency, lockfile, schema or migration was changed. No worker live calls or real database operations.

## Application boundary

`OWNED_SOURCE_TEXT_ENABLED=true` is the single new server gate; absent/false is unavailable. It also requires a valid existing source-read configuration (PDF or YouTube ingestion configuration), signing secret, database URL and server `OPENAI_API_KEY`. `.env.example` stays false. Availability is the safe `{ available: boolean }` DTO from `textAvailability`, projected as one boolean to `SourceWorkspace`; no environment/config object crosses RSC. With PDF configured, an already-owned YouTube Source works while YouTube acquisition remains disabled. Voice has no application factory.

The stable `createHttpTextController` is supplied to the existing `ConversationArea` / `TextSession` only when available. The browser proxy owns fetch cancellation and a 30-second stream-silence watchdog. Existing keyed source/mode ownership and `BrowserSession` dispose it on source changes, mode changes, unmount, pagehide or offline. It never opens a provider socket or accesses media. The server runs the accepted `TextLifecycle`, `PrimingController`, provider admission and transcript store directly, with no positive subclass or developer-script import.

| Endpoint | High-level input / result |
| --- | --- |
| `POST /api/text-sessions` | Exactly `{sourceId, requestId}` (v4 UUIDs); fresh signed visitor/source read, reserve one session; returns `{sessionId}` / 201. No provider acquisition until the sole stream attaches. |
| `GET /api/text-sessions/{sessionId}/stream` | Same visitor cookie required; no query parameters; one reader only. Returns no-store NDJSON of safe status, visible transcript and latest opaque question ID. Complete source-loading items never enter this transcript. |
| `POST /api/text-sessions/question` | Exactly `{sessionId, questionId, question}`; fresh source authorization; one pending response; 202 is accepted processing, not confirmed receipt. Exact finalized provider user-item ACK establishes receipt. |
| `POST /api/text-sessions/stop` | Exactly `{requestId}` from Start, within the signed visitor's namespace. Idempotently closes only that visitor's matching attempt. Unknown/foreign request IDs return the same 200 without affecting another visitor. Also records a bounded cancellation tombstone, so Stop can beat a delayed Start response/request. |

All operations require the signed visitor; IDs alone convey no authority. Mutations require the configured exact Origin and absent/same-origin Fetch Metadata. Reads reject foreign Origin / cross-site metadata. Strict shapes reject caller model/settings/policy/owner/source-text/provider-event overrides. JSON bodies are capped at 8,192 bytes / 2 seconds; questions are unchanged, nonblank, at most 1,000 UTF-16 units. Failures are authored generic responses with no-store/nosniff; unsupported methods also have no-store. No raw upstream body or source/question/answer/cookie/key logging.

## Provider, fidelity and cleanup

Server-owned WebSocket authentication selects exact **gpt-realtime-2.1-mini**, structured **B**, accepted `provider-text-full-source-2026-10-20-v1`, 512 output tokens, minimal reasoning, text output, disabled truncation, empty tools, no tool choice/audio transcription/VAD. No credential is issued to the browser. Source preparation validates server provenance, reconstructs the complete source and rechecks ownership/expiry after asynchronous preparation and connection acquisition. Every question freshly rechecks the final owned row. ACK barriers/settings validation remain in the existing lifecycle; no automatic generation or paid retry is added.

The Node-only socket uses the `ws` copy shipped with pinned Next 16.4.2, explicitly externalized with its exact module path. It has a 10-second handshake timeout, 80,000-byte inbound bound, 64,000-byte outbound bound and 256,000-byte pending-write guard, no redirects/retries and once-only termination. This is coupled to the pinned Next version; upgrades must reverify this integration. It needs no custom Next server, inbound WebSocket upgrade or new service. Future voice still requires WebRTC.

| Resource | Bound / release |
| --- | --- |
| Active sessions | One per visitor, maximum 20 per process. Existing stricter Start admission: 3/visitor/hour, 10/shared unverified-network bucket/hour, 20/global/hour, 50/process lifetime. No trust in forwarded IP headers. |
| HTTP commands | Ordinary commands 120/visitor/hour, 600/shared/global/hour, 3,000/process lifetime, 20 concurrent; Stop has a separate 60/visitor, 300/shared/global, 1,500/lifetime, 20-concurrent budget so it can cancel an awaiting Start/question. |
| Session timers | 10-minute absolute maximum, clipped to visitor and source expiry; 2-minute idle timeout; stream must attach within 5 seconds. Provider responses/heartbeats do not extend idle time. |
| Questions | 20/session; one pending; duplicate/replayed IDs rejected without another generation. Ready snapshots carry the accepted question ID, preventing a queued old heartbeat from reopening the composer during a new question. |
| Streams | One reader; complete snapshots coalesced at 16 ms, never shortened; 1 MB/snapshot and 2 MB queued bytes. Backpressure/oversize/disconnect ends the attempt. The application Web Stream queue bound is tested directly; an actual throttled physical network is NOT_RUN. |
| Other lifecycle bounds | Accepted preparation/connection/priming/turn deadlines, 8 MB complete priming wire bound and transcript/event/part limits remain. Exceeding a bound ends the attempt rather than trimming source/history. |
| Source changes | Actual repository emits invalidation **after transaction commit** on replacement/removal. Expiry has an independent timer. A 10-second authorization/heartbeat read catches out-of-process disappearance; source checks also happen at each question/acquisition. |
| Terminal cleanup | Stop/failure/cancel/timeout deletes session/owner entries, aborts waiting work, closes transport, clears timers/listeners, publishes one final safe snapshot if possible, and disposes server transcript/source references. Replay/cancellation keys (owner hash + opaque request ID, no text) remain in a separate process-lifetime ledger capped at 512. |

Process restart loses sessions and admission/replay state. The page requires an explicit fresh Start; there is no reconnect, cross-instance durability, permanent conversation history or hard account spending cap. Already received browser transcript/preview survives Stop or a context error until deliberate fresh Start/source/mode change/reload. On stream loss the browser retains the last snapshot it actually received; it cannot recover server text that never arrived.

## Verification and acceptance

All ordinary checks use the pinned Node24.22.0/npm11.19.1 in an `.env`-free isolated copy under ignored `artifacts/local/10d/offline-checkout`, with a reused dependency junction, empty real keys, an unusable loopback database URL and explicit external-network denial. No fresh install or real SQL is claimed. `npm run test:owned-text` launches the built Next application on owned loopback3126, injects synthetic Prisma and a local fake provider through an explicit Node preload, and uses actual HTTP routes, socket adapter, server lifecycle and browser UI. Source acquisition in browser cases is explicitly fulfilled from a seeded fixture; saved-source reads and all text operations are real built routes. YouTube acquisition availability in that isolated process is a UI fixture only, independent of deployment.

Final build/runtime/dirty identity, exact UTC commands/exits (including failures), checks/counts and changed-file SHA256 are in `artifacts/local/10d/identity.json`, `commands.jsonl`, `final-checks.json`, `changed-files.sha256.json` and `integrated-results.json`. PROJECT_STATE records final command counts/build. No commit or push was created.

| Criterion | Evidence / practical limit |
| --- | --- |
| 1. Actual routes/adapter/existing UI, both source kinds | Integrated HTTP PDF/YT two-turn streaming + Stop, complete source ACKs and empty loading transcript; four desktop/390px browser flows, exact complete preview, no browser media/socket access, retained answers. No fixture factory/page in production. |
| 2. Boundary denials | Unit + built HTTP signed visitor/source/session tests: missing/invalid/expired/foreign identities, Origin/metadata, strict request shapes/UUIDs/body cap, absent gate/key, source expiry/removal/preparation changes, stale/replayed IDs, overlapping questions and stream ownership. Negative paths precede provider work where authority can be checked first. Foreign Stop is a non-disclosing no-op. |
| 3. Resources/recovery | Unit shortened-clock attach/idle/absolute/source expiry, slow consumer, twenty-turn cap, rate/concurrent caps, pending reads/late acquisition, duplicate stream/read cancellation and Stop-before-Start. Integrated provider opens=closes, registry/listeners/timers=0; actual page navigation/mode switch/source removal, context-limit partial/complete-preview retention. Socket and browser-proxy unit tests cover once-only cleanup and queued stale readiness. Actual phone/degraded network/audio NOT_RUN. |
| 4. Boundaries/defaults | New server entries import `server-only`; final repository reads retained. Emitted browser markers exclude server WS/key/registry/fixture code; all production traces exclude tests/scripts/artifacts. Existing diagnostic proof code remains separate/default-off. Smoke checks all four new endpoints default 503/no-store. Lock/schema unchanged. |
| 5. Required commands | lint, typecheck, unit suite, build, smoke, text-session, mode-switch, recovery, boundaries, plus new focused unit/integrated checks; exact final results in PROJECT_STATE and command ledger. |

Development failures remain in the ledger: missing clock `now` caught by TypeScript; lint findings corrected; initial built fake-provider injection bypassed by bundling was denied by the network guard (no real call), then fixed by externalization; an overbroad bundle marker hit the older diagnostic browser proof and was narrowed to actual server-only markers; a replacement browser assertion ran before its saved-ID read completed and was fixed to await that read. An existing tablet text-session teardown observed zero scroll listeners before hydration (107/108); unchanged full rerun passed. The historical 10A static assertion that production supplies no text factory was updated to assert the new safe gate and continued absent voice factory. The new proxy test exposed reliance on fetch abort for a pending read; Stop now explicitly cancels the response reader too. The synthetic snapshot database also needed its intentionally noncooperating read drained before seeding the next scenario (otherwise its old snapshot overwrote the newly seeded row); only the fixture was corrected. None is relabeled as a live success.

## PM runbook — bounded real application check (NOT_RUN by worker)

1. Review this boundary, hashes and local evidence first. PM explicitly selects an intended database and bounded real-provider allocation, checks account/project model access and current usage. Keep this check on loopback; do not change Render or publish a gate. Configure `DATABASE_URL`, `VISITOR_COOKIE_SECRET` and `OPENAI_API_KEY` privately for that intended local process; never paste/print them. Existing committed migrations must already be applied by PM, without a reset.
2. With pinned Node/npm, run lint/typecheck/unit/build while the new gate is false. Record HEAD, dirty manifest and `.next/BUILD_ID`. In a dedicated terminal set only these nonsecret process overrides, then start that reviewed build:

   ```powershell
   $env:OWNED_SOURCE_TEXT_ENABLED = 'true'
   $env:PDF_INGESTION_ENABLED = 'true'
   $env:PDF_INGESTION_LOCAL_HTTP = 'true'
   $env:YOUTUBE_INGESTION_ENABLED = 'false'
   $env:PROOF_ENABLED = 'false'
   $env:TEXT_PROOF_ENABLED = 'false'
   $env:PDF_PROOF_ENABLED = 'false'
   $env:CAPTION_PROOF_ENABLED = 'false'
   $env:REALTIME_ISSUANCE_ENABLED = 'false'
   $env:APP_ORIGIN = 'http://127.0.0.1:3000'
   npm run start -- --hostname 127.0.0.1 --port 3000
   ```

3. In a fresh browser profile at that exact origin, upload [W3C's public one-page dummy PDF](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf). Its complete extracted phrase is “Dummy PDF file” (verified from the public PDF on20October2026UTC). Inspect the full preview; expect one page and the complete phrase. No synthetic proof credential route is involved.
4. Click **Start text session**, wait for **Ready for your question**. Ask “What three words are written in this PDF?” (expected: Dummy PDF file), then “What is the last word of the phrase you just quoted?” (expected: file). Record readiness/receipt, first-text latency, final two user/two assistant turns and correctness. No microphone request should occur. Do not resend automatically on any failure; record the safe failure and stop.
5. Click **Stop text session**. Confirm both answers remain, Send is disabled, a fresh Start is explicit and preview unchanged. Check the browser network shows only same-origin high-level commands/NDJSON and no provider credential. Do not export cookie/request headers or keys. In the OpenAI usage dashboard record before/after usage and any reporting lag, plus actual/estimated cost separately; worker tests are not a usage/billing proof.
6. Stop the local server (Ctrl+C), close the profile, restore `OWNED_SOURCE_TEXT_ENABLED=false` / prior process overrides or close the dedicated terminal, and restart the default-disabled build to confirm the new routes return503/no-store and Start is unavailable. No deployment. Record real application/live/phone results separately; full original step acceptance is still PM-owned.

## Contract sources inspected

OpenAI Docs skill applied; current official [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events), [server events](https://developers.openai.com/api/reference/resources/realtime/server-events), [server WebSocket guide](https://developers.openai.com/api/docs/guides/voice-websockets?voice-api=realtime) and [exact mini model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) were opened/fetched20October2026UTC. Full Markdown copies/hashes are retained under10d (including the guide's separate Realtime section). The implementation reuses accepted07E/F event/settings behavior; official schemas support permanent server authentication, effective session updates, finalized item ACKs, response correlation, text deltas/done and disabled-truncation errors. No worker model/account-access or live contract success is inferred from documentation.

Installed Next16.4.2 docs consulted: `01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/03-file-conventions/route.md` (Web streams/Node runtime), and `01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`. Selected React rules: server serialization and listener ownership; Playwright selected skill/reference for package-script browser checks. No visual redesign or unrelated skill/dependency setup.
