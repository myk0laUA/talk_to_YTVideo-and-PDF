# Task06C — automatic captions, deadline and cooldown handoff

**PM06C review:** accepted implementation/local/controlled-provider realDB orchestration. Application39c785c published, not deployed; fresh393unit/58fallback checks and actualDB sharing/rollback/cancel PASS. Exact evidence in PROJECT_STATE; worker report below retained as history. Full Step06 remains IN_PROGRESS, managed/live gates blocked. Next07A offline context preparation.

Worker implementation only; proposed **READY_FOR_REVIEW**, pending PM acceptance. Original Step06 remains IN_PROGRESS. Base `main` / `afa2fa3f12757bd3f7039e99f4971c16e21b4616`, initially clean; dirty delivery without commit/push/deployment. Local production build `SrvpjOM0z5eghhXbG4jBP`, Node24.22.0/npm11.19.1. Exact UTC command history/exits, safe counters, hashes and audit are in ignored `artifacts/local/06c/`. No real keys, database mutations or provider requests were used.

## Operator policy

- Existing ingestion/proof flags remain default off. Ingestion accepts explicit `direct`, `supadata`, or `auto`. `auto` always requires a valid server-only `SUPADATA_API_KEY`, including when direct-first is enabled. Invalid/missing configuration returns disabled before visitor/cache/provider work. No browser selector or bypass field is accepted.
- `YOUTUBE_AUTO_DIRECT_FIRST` defaults **false**. In auto this means managed-only on a cache miss. Exact `true` opts into direct-first. The real deployment was not changed: retain PDF-only until PM authorizes configuration and live verification.
- Proof remains forced direct/Supadata, always uncached/uncoalesced, and rejects auto. For a forced ingestion verification, choose the requested forced provider **and** `YOUTUBE_CAPTION_CACHE_BYPASS=true`; otherwise normal valid public cache hits intentionally preserve their originating provider. An auto bypass remains auto, with its cooldown/fallback policy and a separate bounded job; it is not a direct verification.
- Normal imports reserve the unchanged admission budget before body reading. After normalization, one compatible shared job starts its **15,000ms total deadline before cache lookup**. Lookup, direct, managed submission/polls, validation and cache population consume that budget. Direct retains its own maximum9s. Managed retains its adapter bounds but receives the same job abort signal and only the remaining total time. Followers cannot restart the timer/attempts. Source transactions occur independently after extraction, with the existing visitor/cancellation/ownership/expiry guards.
- One direct attempt can fall through to exactly one managed submission for `blocked`, `rate_limited`, `timeout`, or `upstream_failure`, while the job remains live. All other direct categories terminate. Success is fully validated for shape, video, language and actual originating adapter **before** accepting it or considering fallback; malformed success terminates. No retries/resubmissions were added. Existing managed202 handling polls at most5times at1s intervals. Failures/partial/job responses are never cached.
- Direct `blocked`/`rate_limited` immediately opens a **five-minute** direct cooldown. Two consecutive direct timeout/upstream failures also open it. Direct success clears the streak/cooldown; other terminal results reset the streak. A successful managed fallback does not erase a direct failure streak. During direct cooldown, auto misses use managed only.
- Managed `rate_limited` opens a **five-minute** automatic-miss cooldown. While active, return the existing authored429/rate_limited without calling either adapter or waiting. Cache lookup still happens first; a valid cached success remains usable under normal configuration, authorization and admission. Deliberate forced calls bypass and do not modify automatic cooldowns. This policy avoids initiating another direct chain when its potential managed fallback is suppressed.
- Managed quota (`quota_exhausted`), unknown limits (`provider_limited`), and authentication/access rejection (existing `blocked`, with upstream401/402/403 retained internally by the adapter) preserve their authored categories. They need operator action; no automatic retry/fallback/sleep or reclassification as recovery. A later deliberate request is still subject to all existing budgets. No provider HTTP assumptions or adapter contracts changed.
- Cooldowns use monotonic time comparisons, **no background expiry timers**, and one policy record in the process singleton's configured provider closure. The record contains a policy digest/timestamps/streak, never one entry per video. Managed credential/direct-opt-in policy rotation replaces the record; forced calls do not. Process restart resets it; different processes/hosts have independent cooldowns and quotas. There is no distributed suppression/durability claim.
- Shared job identity includes video, normalized requested language/native mode, selection, direct opt-in and credential digest. Forced/bypass work cannot join auto. Existing one-job/eight-waiter, visitor4/IP8/global8-hour/lifetime16 and one active request per visitor remain unchanged. Frozen public captions are shared; every caller independently commits its own UUID/expiry. No owner/credential/private text fields or diagnostics were added to DTOs/logs.

## Changes and acceptance evidence

| Criterion | Implementation / evidence |
| --- | --- |
| 1–2 forced, opt-in, missing key, gates | `captions/config.ts`, `sources/config.ts`, `configured.ts`, `.env.example`; focused config/forced tests, built optout/missing-key/default-off/proof-bypass |
| 3 one original deadline, abort | Existing coordinator wraps new auto chain; auto bypass uses an isolated coordinator. Deterministic handler test: cache3s + real direct9s + managed3s; follower joins at12s, both504at15s, zero Source/cache writes. Built held responses: **15017.435ms** including cache3s/direct9s/remaining managed3s; both active fetches abort, no writes |
| 4 selective, validated fallback/poll bounds | New server-only `captions/automatic.ts`; every existing terminal category plus malformed-success variants tested; built XML error/no-captions/unavailable/too-large and managed error/poll scenarios verify exact calls |
| 5–6 finite cooldown/operator policy | Fake monotonic clock tests open/skip/expiry/reset, two-failure streak, key rotation, forced bypass, managed rate cooldown and quota/auth no retry. Built cancel-all retry, source-failure and rate-cooldown infer skips from exact counters; valid managed cache hit still succeeds during rate cooldown |
| 7 compatible sharing/owned independence | `captionJobKey` includes selection/direct opt-in/key digest. Existing coalescing61 checks retained on this build; new browser overlap/cancel-one/cancel-all/source-failure/proof-bypass verifies a shared fallback chain and independent Source behavior |
| 8 diagnostics/privacy/no deployment | New test-only preload, harness and focused tests are explicit process arguments; no production hooks. Audit verifies traces/client chunks, unchanged UI/schema/lockfile/adapters/Source transactions, teardown and safe evidence |

`tests/unit/caption-automatic.test.ts` adds41 deterministic cases; all393unit tests pass. Test timer advancement after completion/cancellation produces no new calls or resurrected jobs; node:test reports no unhandled rejection. `scripts/verify-caption-fallback.mjs` is the new repeatable built command, `npm run test:captions:fallback`, using port3112. Its21scenarios/58checks pass over actual production routes, adapters, cache and Source repository with **synthetic fetch/Prisma only**. Test-only `tests/captions/automatic-upstream.cjs` rejects every nonfixture fetch. Existing repository preload adds only an IPC direct-opt-in configuration field, inaccessible from HTTP.

Exact final fallback counters below are per isolated scenario. W/P/T = watch/player/timedtext; M = managed submit; polls are additional GETs. Source attempts include failing/rolled-back creates, while surviving rows include replacement/removal effects.

| Scenario | W/P/T | M / polls | Cache writes | Source attempts / surviving rows |
| --- | --- | --- | --- | --- |
| Two browser visitors, then warm replacement and owned removal | 1/0/0 | 1/0 | 1 | 3/1 |
| Direct success | 1/1/1 | 0/0 | 1 | 1/1 |
| Direct opt-in false | 0/0/0 | 1/0 | 1 | 1/1 |
| No captions | 1/1/0 | 0/0 | 0 | 0/0 |
| Unavailable / too large (each) | 1/0/0 | 0/0 | 0 | 0/0 |
| Malformed direct XML | 1/1/1 | 0/0 | 0 | 0/0 |
| Managed202success | 1/0/0 | 1/2 | 1 | 1/1 |
| Managed202never completes | 1/0/0 | 1/5 | 0 | 0/0 |
| One overall deadline | 1/0/0 | 1/0 | 0 | 0/0 |
| Managed rate cooldown, forced population, cached auto hit | 1/0/0 | 2/0 | 1 | 2/1 |
| Managed quota / unknown limit / auth / malformed (each) | 1/0/0 | 1/0 | 0 | 0/0 |
| Missing key / default off (each) | 0/0/0 | 0/0 | 0 | 0/0 |
| Cancel one during managed | 1/0/0 | 1/0 | 1 | 1/1 |
| Cancel all, then deliberate retry | 1/0/0 | 2/0 | 1 | 1/1 |
| Prior two Sources, one independent Source failure, warm recovery | 1/0/0 | 2/0 | 2 | 5/2 |
| Shared proof admission, forced proof/direct bypass/managed bypass | 3/0/0 | 2/0 | 1 | 2/2 |

Two390px Chromium contexts receive distinct owned v4 UUIDs/exact signed-visitor expiries and all3ordered segments with fractional seconds, and deny reciprocal GET/DELETE. The repeated import has zero extraction/cache writes and unchanged cache TTL. Only that visitor's Source is removed; the other stays readable. Final `fallback-preview-0.png` and `fallback-preview-1.png` were visually inspected: complete beginning/middle/end text, timestamp precision and return controls, no clipping. Source provider is checked through the actual DTO, since the existing UI does not print an adapter selector. Zero page errors, external browser calls or browser storage entries. This is mobile viewport emulation, not physical phone/audio evidence.

## Reproduce and PM follow-through

Use the pinned `.tools/node-v24.22.0-win-x64` on PATH (or an equivalent pinned installation), npm11.19.1, and the existing installed browser. Build first. Run lint, typecheck, test, build; then `test:captions:fallback`, `test:captions:mocked`, `test:captions:cache`, `test:captions:coalescing`, `test:youtube:http`, `test:youtube-ui`, `test:smoke`. Routine tests override provider keys/DB with synthetic or empty values; harnesses own/close their production servers and block nonfixture fetch. Do not run the explicit live-caption command or load actual service credentials for this task. See PROJECT_STATE for the exact final command UTC/exits and retained prior PDF/voice/text identities.

PM should compare `changed-files.sha256.json`/`identity.json` to the reviewed dirty files, review failure/deadline/cooldown tests and rerun the focused commands. Inspect `fallback-results.json`, especially remaining-deadline, cancel-all, source-failure and proof-bypass. All scenarios end with coordinator0/participants0/active0, no forbidden server fetch and released3112. `audit.json` covers the complete owned port list and production boundaries. Initial test-harness locator and surviving-row assertion failures are retained as `fallback-first-attempt.*`/`fallback-second-attempt.*`; no production correction was needed for either. The existing HTTP suite's obsolete invalid-provider fixture used `auto`; it now uses `unknown-provider`, since auto with a managed key is valid. Its first failure is retained in `youtube-http-first-attempt.log`, followed by a fresh59-check pass.

Actual SQL/hosted provider availability, key/quota configuration and human phone/grounding checks are **NOT_RUN** by this worker. PM may repeat the accepted06B controlled-provider real-PostgreSQL ownership/rollback/cancellation procedure with this auto policy, using narrowly reserved synthetic tuples and exact captured-ID cleanup; no shared reset or migration. No new database implementation/schema exists here. Actual managed proof waits for key/quota readiness and an explicitly authorized live-test allocation. Do not enable auto/direct in the real deployment under this worker handoff. ScrapeCreators, OCR/audio transcription, Step07/context, voice/text and general cleanup remain outside06C.
