# Task 06B — cancellation-safe public caption sharing

**PM06B review:** implementation/local and actualDB orchestration accepted; application675c12e published, not deployed. Fresh352unit/61coalescing checks and actualDB overlap/rollback/cancel PASS. Latest PROJECT_STATE records exact evidence; worker report below is historical. Next06C, full Step06 remains IN_PROGRESS.

Worker outcome: implemented, proposed **READY_FOR_REVIEW** under original Step 06. PM owns acceptance. No 06C/07 work, live requests, database mutation, install, migration, commit, push or deployment.

## Identity and boundaries

Clean arrival on `main`, HEAD `8bdbd8c325c936677f41d2535f60b4949e35d192` (reviewed application `03eb7d8` plus PM documentation). Final working tree is dirty. Production build **`gPQqBgrBk57n2NXLBiHYu`**, Node **24.22.0**, npm **11.19.1**, using ignored `.tools/node-v24.22.0-win-x64`. Host defaults Node26/npm12 were detected, not used for verification. Final hashes and manifest digest: ignored `artifacts/local/06b/changed-files.sha256.json` and `identity.json`.

All new integration results are local production HTTP with **synthetic upstream and Prisma boundaries**, actual handlers/adapters/cache/repository, and two isolated Chromium 390px contexts. They prove process wiring and lifecycle behavior, not real PostgreSQL scheduling, hosted provider availability or physical phone/audio behavior. Permanent keys and real database configuration are overridden with synthetic/empty environment values by the command runner and harnesses. No request/config test selectors were added to application code.

## Implementation and policy

- `src/server/captions/coordinator.ts`: process-local registry, maximum one compatible public job/eight waiters; job-owned AbortController and fixed deadline. Registry key includes normalized video, case-insensitive requested language (default distinct from explicit `en`), native mode and a SHA256 policy identity for the configured provider/key. The original requested spelling (for example `en-US`) is retained for the existing adapter contract; joined callers share that creator's validated public track. Key rotation cannot join an earlier policy. No raw provider key or visitor information enters the identity/result.
- `src/server/captions/admission.ts`: caption-only leases reserve request quotas before body parsing, then synchronously bind the validated key. One active request per visitor, visitor4/IP8/global8 per hour/lifetime16 remain unchanged. At most eight participants are admitted; incompatible binds consume an admitted attempt but do no cache/provider work. Duplicate active visitor/over-budget/exclusive-proof rejection does not acquire a lease. All forwarding addresses still use the existing single unverified-network bucket.
- One extraction slot is held conservatively until the admitted handlers finish (including Source transactions). Proof acquires it exclusively before body parsing; bypass binds a unique symbol. Proof and bypass are uncached/uncoalesced. Pending import bodies are admitted and bounded to two seconds; incompatible bodies are rejected after validation and before IO. Proof cannot race a pending import reservation into an extra extraction.
- `src/server/sources/youtube.ts`: the first compatible caller creates a job encompassing **one cache lookup**, optional single configured-provider extraction, validation and optional single cache population. A caller arriving while that job is live joins without another lookup. After settlement, a later request reads the durable cache again. Warm hits create new owned Sources and never renew the cache TTL. Cache provenance may differ from the currently selected miss adapter, as in 06A.
- Public transcript data is copied through `validatedTranscript`, checked for requested video/language and originating miss provider, then deeply frozen before sharing. `captionRecord` separately copies data and creates a fresh UUID for each visitor. Source commits are outside the job and remain independently authorized atomic replacements. A single Source transaction failure leaves other callers unaffected and does not extract again.
- Each caller detaches on cancellation. One cancellation cannot abort another live caller. Final detach and deadline abort synchronously remove the registry entry; old cleanup checks entry identity before deleting, so it cannot erase a replacement job. Already-aborted callers perform no IO. Promise rejection handlers are attached even for detached callers. Late results check the job signal before further work; every Source transaction retains its own visitor-expiry/cancellation guards. A public cache write already in progress can finish independently; it cannot authorize an owned Source write.
- The job deadline starts at creation, includes cache work, and is never extended by joining: **9000ms direct / 15000ms Supadata**. Existing adapter deadlines remain intact; a job can exhaust its budget earlier while awaiting cache IO. Database transaction bounds remain unchanged. Completion/error/cancellation clears timers and map entries. No automatic retry/fallback/cooldown or quota reset was added. As before, cancellation after an already committed database transaction cannot undo that commit.
- `src/server/sources/runtime.ts` keeps one handler/coordinator on `globalThis` across production requests. Caption admission also spans separately bundled proof/import routes; compatibility uses structural capability detection rather than cross-bundle `instanceof`. **Multiple processes/hosts are not coordinated.** PostgreSQL's existing unique cache tuple remains the durable invariant.
- `src/server/captions/handler.ts` defaults to the same caption-specific exclusive admission contract. Generic voice/PDF admission, UI, shared contracts, source transactions, cache adapter/schema/migrations and lockfile are unchanged.

## Verification

Use the pinned runtime. Exact command UTC start/end, exit and log path are in ignored `artifacts/local/06b/commands.jsonl`; logs and sanitized scenario snapshots are in the same directory. Build precedes all built tests. Application code was unchanged after the final build; subsequent refinements affect only tests/documentation.

| Check | Command | Expected / observed | Context | Status / exit |
| --- | --- | --- | --- | --- |
| Lint | `npm run lint` | No warnings | Local, pinned | PASS / 0 |
| Types | `npm run typecheck` | Prisma generation, Next types, TypeScript | Local, pinned | PASS / 0 |
| Unit | `npm test` | 352 tests, including 24 coordinator/admission tests | Controlled promises/mock time; no services | PASS / 0 |
| Production build | `npm run build` | Build `gPQqBgrBk57n2NXLBiHYu` | Synthetic/empty secret overrides | PASS / 0 |
| Cache | `npm run test:captions:cache` | 4 scenarios / 53 checks | Built handlers, synthetic Prisma/upstreams, Chromium | PASS / 0 |
| Coalescing | `npm run test:captions:coalescing` | 13 scenarios / 61 checks plus strict data/counter assertions | Built handlers, held synthetic upstream/Prisma, two Chromium contexts; port3111 | PASS / 0 |
| YouTube HTTP | `npm run test:youtube:http` | 9 scenarios / 59 checks | Built handlers, synthetic boundaries | PASS / 0 |
| Adapter regression | `npm run test:captions:mocked` | 8 scenarios / 31 checks | Built direct/managed adapters, synthetic upstream | PASS / 0 |
| YouTube UI | `npm run test:youtube-ui` | 99 checks | Chromium, mocked UI plus built-handler synthetic boundaries | PASS / 0 |
| Smoke | `npm run test:smoke` | 14 checks | Built app, disabled features | PASS / 0 |
| Source HTTP | `npm run test:sources:http` | 6 scenarios / 51 checks | Actual PDF parsing, synthetic Prisma | PASS / 0 |
| PDF UI | `npm run test:source-ui` | 75 checks, all 384 lines / 12 pages | Chromium / actual PDF parser, synthetic Prisma | PASS / 0 |
| Bundle/trace/teardown audit | Pinned `node artifacts/local/06b/audit.mjs` | 13 server traces /13 browser chunks; checked server/test markers/private values absent; eight owned ports rebind | Local build only | PASS / 0 |
| Real PostgreSQL / hosted provider / physical phone | PM-only follow-through | Not performed by worker | No shared database mutation or live extraction authorized | NOT_RUN |

An exploratory coalescing invocation started before the first exploratory build finished and failed readiness with missing `.next/server/preview-props.json`; the server stopped and port released. This was a worker command-order mistake, not an application defect. Repeated only after build exit0. Earlier full checks passed on build `L6sJf4LtI8bTvJGNKmSh2`; review then found raw abort reasons on the uncoalesced bypass could become internal500. Normalized them to authored cancelled408 and added a delayed-adapter cancellation regression; build `IsVkDdYtJ1Zs4hOCP-Sge` passed all required commands. Final compatibility review restored the original requested regional-language spelling for adapters while retaining case-insensitive job identity, and added an `en-US`/`en-us` overlap regression. Rebuilt/repeated all required commands on the final identity above. Earlier unit runs passed 328 preexisting tests, then 20/21/22/23 new checks; final24 new checks include both regressions. No failed result was counted as a pass.

## Acceptance mapping and exact counts

Final race review also made deadline-abort registry removal synchronous, before promise cleanup; the controlled-time test starts an immediate new job before awaiting the old callers. The required suite was repeated after that change. No application changes followed that final build.

Each direct extraction sequence is one `watch`, one `youtubei/v1/player`, one `api/timedtext`; failure/timeout at the held watch is one call only. These are synthetic configured-adapter calls, not live YouTube requests. Full counts and per-scenario sanitized database snapshots are in `coalescing-results.json`.

| Criterion / scenario | Evidence |
| --- | --- |
| Simultaneous cold miss | Two Chromium requests overlap at held watch: zero early Source/cache writes, then both201; one extraction sequence, one cache lookup/population, two distinct owned UUIDs. Both full ordered previews include all three segments and fractional seconds. Requested cookie expiries differ and exactly match each Source expiry. |
| Ownership/replacement/removal/TTL | Reciprocal GET/DELETE404; replacement removes only A's prior ID; browser B removal preserves A; final explicit removals leave zero owned rows and one public cache row. Third warm import adds zero extraction/population; cache expiry is unchanged. Screenshots `overlap-0.png`, `overlap-1.png` inspected. No browser storage entries, external requests or JS errors. |
| Cancel leader / cancel follower | Each scenario: one extraction sequence, one cache write, **one Source create**, zero upstream aborts. Cancelled request disconnects; survivor201. Unit tests also seed and preserve cancelled visitor's prior Source. |
| Cancel all / deliberate retry | Both disconnected callers: underlying held watch aborts once, zero Source creates, empty map/admission. Retry succeeds with one fresh sequence, one cache write/Source create. Total stage calls: aborted watch + fresh three =4. Unit controlled promises cover racing final detach/new job and late old resolution without resurrection. Already-aborted unit caller has zero transactions/provider calls. |
| Language/provider-policy separation | Built held leader plus different language/default-language/video/bypass and configured Supadata each get busy before extra cache/provider IO. Incompatible visitor attempts count toward visitor4. Unit tests separately cover API-key identity rotation and case-normalized same-key sharing. |
| Provider blocked / actual adapter timeout | Each scenario begins with one successful prior-source/cache sequence shared through sequential miss/hit. Cold overlapping refresh fails both callers, zero new Source attempts; prior IDs/content survive. No fallback/retry. Deliberate retry adds exactly one fresh sequence. Total stages=3 prior +1 failed watch +3 deliberate retry=7. Timeout aborts underlying signal once at the existing 9s bound; unit mock time shows later joins do not extend it. |
| Shared cache read failure | One delayed cache lookup fails both callers with storage_unavailable, zero provider/Source attempts, prior Sources exact. Deliberate retry adds one sequence. Total=6 stages including initial prior-source population. |
| Shared cache write failure | One refresh sequence, one attempted failed cache write, both storage_unavailable, zero Source attempts, both prior Sources exact. Fresh deliberate retry succeeds. Total=9 stages including initial prior-source sequence. |
| Source write failure isolation | One shared refresh sequence/cache write, **two independent Source attempts**, one503 and one201; failed visitor retains prior content. Subsequent import uses populated cache without another extraction. Total=6 stages including prior-source population. |
| Expiry | Built offset-clock expiry while both callers wait: one refresh sequence/cache write but **zero new Source attempts**, both401; prior IDs retained. Unit also expires only A while later-expiring B succeeds with one independent Source create and no second extraction. |
| Exact request limits | Built quota scenario: eight distinct participants concurrently admitted, one cache lookup/extraction/write and eight Source creates; active duplicate, ninth caller and proof are429 with no extra IO. Snapshot total/IP/lifetime each8. After one window advance, eight fresh warm imports consume lifetime16 with zero extraction/population (9 total cache reads, 16 total Source creates). After another hour, lifetime still rejects before IO. Separate proof/bypass scenario reaches visitor4 and rejects fifth; all requests share one unverified-network bucket. |
| Proof/bypass | Proof loaded first in separate built route holds exclusive slot; import429 with zero cache/coordinator work. Held bypass excludes ordinary/bypass/proof joins. Every deliberate sequential bypass extracts anew, with no cache reads/writes. One proof + three deliberate bypasses =4 extraction sequences /12 stages. |
| Bounds/teardown/security | Every scenario ends map0/participants0/active0, zero forbidden server fetch attempts, server SIGTERM and port3111 successfully rebound. Unit success timer remains cleared after advancing mock time. Client/server trace and port audit recorded separately. |

## PM follow-through and stop

1. Review final diff/hash manifest against base and the build identity. Run pinned `npm test`, then the established `npm run test:captions:coalescing` after a fresh build if application code changes. It owns port3111, creates its own isolated servers, blocks nonfixture fetches and closes Chromium/servers. Do not run it against a deployment or shared database. New test files and preloads must stay outside production traces.
2. Review admission counters, one held upstream, cancellation/timeout cleanup, immutable data and independent Source transactions. Source repository/schema/cache SQL are unchanged; orchestration changed, so repeat a controlled two-visitor overlap against real PostgreSQL using a **synthetic provider** (as in 06A's PM-only owned-source procedure). Reserve a previously absent synthetic video/language/native tuple, capture candidate UUIDs and prior rows, assert one extraction/cache population, distinct ownership/expiry, one-caller rollback and no Source on cancelled waiter. Clean only captured fixture IDs/tuple, preserve and compare unrelated rows. Do not reset a shared database or run real provider requests as part of that check.
3. Multiple instances remain outside this process-local feature. PostgreSQL uniqueness handles durable cache-row identity but does not promise cross-process deduplication. Hosted live direct success, managed key/quota availability, real captions/phone and grounded conversation remain open gates. Retain the latest PM PDF-only deployment; worker did not change services.

No human phone, key or purchase action is needed for Task06B. Request PM evidence review and acceptance only; full Step06 remains IN_PROGRESS. Stop here without 06C/07 work.

## Exact final command times

| Command | 18 October2026 UTC | Observed | Exit/status |
| --- | --- | --- | --- |
| `npm run lint` | 21:32:00.122–21:32:04.551 | No warnings | 0/PASS |
| `npm run typecheck` | 21:32:04.554–21:32:08.085 | Prisma/Next/TypeScript pass | 0/PASS |
| `npm test` | 21:32:08.086–21:32:11.143 | 352/352; 24 new coordinator/admission tests | 0/PASS |
| `npm run build` | 21:32:11.144–21:32:17.186 | Production build gPQqBgrBk57n2NXLBiHYu | 0/PASS |
| `npm run test:captions:cache` | 21:32:17.187–21:32:24.204 | 4 scenarios/53 checks | 0/PASS |
| `npm run test:captions:coalescing` | 21:32:24.205–21:32:49.980 | 13 scenarios/61 checks | 0/PASS |
| `npm run test:youtube:http` | 21:32:49.981–21:32:59.090 | 9 scenarios/59 checks | 0/PASS |
| `npm run test:captions:mocked` | 21:32:59.091–21:33:14.902 | 8 scenarios/31 checks | 0/PASS |
| `npm run test:youtube-ui` | 21:33:14.904–21:33:55.377 | 99/99 | 0/PASS |
| `npm run test:smoke` | 21:33:55.378–21:33:59.828 | 14/14 | 0/PASS |
| `npm run test:sources:http` | 21:33:59.829–21:34:14.090 | 6 scenarios/51 checks | 0/PASS |
| `npm run test:source-ui` | 21:34:14.092–21:35:08.741 | 75/75; all384 PDF lines | 0/PASS |

Final audit command: pinned `node artifacts/local/06b/audit.mjs`, exit0; exact UTC in audit.json/identity.json. These files also record the final changed-file manifest/hash identity.
