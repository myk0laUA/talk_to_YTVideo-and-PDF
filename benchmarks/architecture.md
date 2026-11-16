# Operational architecture and targets

Repository inspection (2026-11-15), before optimization. Targets below are **acceptance targets**, not achieved production SLOs.

## Request paths

| Route | Methods / critical work |
|---|---|
| `/api/sources/pdf` | POST: origin + signed visitor → admission → bounded multipart → PDF worker → transactional source replacement |
| `/api/sources/youtube` | POST: validation → admission/coalescing → PostgreSQL public-caption cache → direct YouTube or Supadata → transactional replacement |
| `/api/sources/[id]` | GET: ownership/expiry → database read → validate full stored text/sections → serialize; DELETE: guarded transaction → invalidate active sessions |
| `/api/voice-preparations` | POST: admission → repeated fresh source authorization → full-context manifest → bounded single-use ticket |
| `/api/voice-preparations/credential` | POST: consume ticket → reauthorize → OpenAI ephemeral credential → reauthorize → release resources |
| `/api/voice-preparations/cancel` | POST: owner-scoped cancellation |
| `/api/text-sessions` | POST: authorize and reserve relay session; actual provider initialization starts with stream attachment |
| `/api/text-sessions/[id]/stream` | GET: authorize → full-context preparation → OpenAI WebSocket → NDJSON response stream |
| `/api/text-sessions/question` | POST: authorize and submit bounded question to owned relay |
| `/api/text-sessions/stop` | POST: cancel/close relay and release admission |
| `/api/proof-source` | Disabled-by-default source proof |
| `/api/proof-pdf` | Disabled-by-default extraction proof |
| `/api/proof-captions` | Disabled-by-default caption proof |
| `/api/realtime/client-secret` | Disabled-by-default credential proof |

There are **14 route files**: ten ordinary paths exposing **11 supported method/path operations** (GET and DELETE share `/api/sources/[id]`), plus four default-disabled proof paths. Thus “11 backend HTTP operations” is defensible; “11 APIs” is ambiguous and does not mean 11 external integrations. Unsupported methods on conversation routes explicitly return 405.

PostgreSQL contains `Source` and `TranscriptCache`, **not conversation history**. The source primary key, unique active-owner slot, owner/expiry and expiry indexes already exist. Cache identity is unique on video/language/mode. Writes replace the owned source in a transaction; invalidation closes associated in-process sessions. Cleanup is an explicit bounded CLI, not an automatic scheduler. The original source GET used an interactive transaction plus `set_config` despite making one SELECT. The lazy singleton Prisma client has a five-connection pool with a five-second acquisition timeout. Writes retain row-lock (1.5 s), statement (3 s), transaction (5 s) and transaction acquisition (2 s) deadlines.

PDF uploads are capped at 25 MB, parsed in a worker with a 15-second execution deadline and V8 heap limits (128 MB old generation, 16 MB young generation); the worker is terminated in `finally`. Native allocations are not bounded by V8 limits. One PDF extraction is admitted at a time. YouTube permits up to eight participants sharing one compatible caption job; a validated public cache avoids refetching. Direct retrieval and Supadata have bounded response bodies, polling and deadlines. Providers can return rate limits, quota exhaustion and blocked access; these are distinct from local admission failures. No live external provider is exercised by this benchmark.

Voice uses browser-to-OpenAI WebRTC; HTTP setup is not audio latency. Text uses server-owned WebSockets and browser NDJSON. Text sessions cap at 20, expire after ten minutes, idle out after two minutes, and bound backlog/snapshots. Voice has two concurrent preparation admissions and four stored tickets. Process-local quotas and replay tombstones are finite; restarting resets them. Multiple instances would require shared coordination/sticky routing before claiming equivalent behavior.

Completed dialogue lives in source-scoped browser memory: **128 individual user/assistant items**, not 128 paired exchanges, with additional character/byte limits. Mode switching and voice reconnect resend source plus eligible completed dialogue; incomplete answers are displayed but excluded from replay. Page reload loses the chat. Voice retries up to three consecutive failures; text needs explicit restart. There is no history retrieval API or durable chat restoration to load-test.

## Workload targets (not achieved results)

| Workload | Proposed local acceptance target |
|---|---|
| Full source reads, 45,614 characters, 8 sections | 1/5/10/25/50 closed-loop VUs; at 25 VUs ≥200 req/s; p50 <100 ms, p95 <250 ms, p99 <500 ms; failures <1%, timeout rate 0 |
| Sustained reads / short spike | 10 VUs for 30 s / 50 VUs for 5 s; same read latency and failure targets; this is not a long soak |
| Voice HTTP source preparation | 1 VU, paced 0.5 s between prepare/cancel pairs; p50 <500 ms, p95 <2 s, p99 <3 s; failures <1%; no provider calls |
| PDF source preparation | One real synthetic page; completion <5 s; reject excess concurrency rather than allocate unbounded workers; 15 s parser deadline remains |
| YouTube source preparation | Five visitors importing the same 100-segment synthetic public transcript; one deterministic 50 ms provider call; all persist successfully <2 s; unrelated work may be shed |
| Application resources | Sample RSS every 20 ms; target <512 MiB for this fixture; mean CPU <100% of one core; pool ≤5, idle connections recover after load |
| Database | Source operation p95 <200 ms at 25 VUs; lock failure <3.5 s; unavailable DB returns a safe error within 6 s; no connection leak |
| Recovery | First successful read <2 s after local PostgreSQL restart begins (includes readiness); resource cleanup after cancellation; restore 128 dialogue items correctly with deterministic acknowledgments |

These workloads are intentionally different. Admission limits make a 50-VU paid session-initialization test inappropriate. Closed-loop saturation throughput does not establish an arrival-rate capacity or production concurrent-user limit. k6 VUs send requests as fast as replies arrive, without realistic user think time on reads. Failure injection is evaluated separately from normal-load error rates.

## Observability and existing verification

Existing voice preparation diagnostics mark authorization/context/provider stages. New opt-in `OPERATIONAL_METRICS=true` adds fixed-label count/error/duration histograms, query timings, pool totals/idle/waiting, process RSS and CPU in aggregate JSON stdout. No public metrics endpoint or monitoring service is added. HTTP timing ends when the handler returns its Response: NDJSON stream duration and media transport need separate measurement. Error counts include expected 4xx admission/validation responses; pool errors are counted without logging raw errors. Query events contain no retained SQL or parameters. Repository timers include acquisition and validation, while Prisma query event timing is adapter-level and is not PostgreSQL-only execution time.

Tests use Node's runner, production Next HTTP integration fixtures, and Playwright Chromium desktop/mobile viewports. Existing tests inject transports/databases explicitly; they do not prove live provider or real PostgreSQL behavior. The benchmark adds real isolated PostgreSQL measurements and outages. Render deployment instructions exist; no CI workflow or infrastructure deployment is added here.

## Cost interpretation

This run uses existing local hardware and an isolated local database: **zero paid API calls and $0 incremental cloud/API charges** (electricity and hardware cost excluded). Raw output reports app CPU, RSS and transferred bytes; PostgreSQL, k6 and total machine resource use are excluded from app figures. A hosting estimate must price the required app RAM/CPU, PostgreSQL storage/connections, egress and uptime separately. Provider costs require measured input/output text/audio tokens and current contracted prices; neither is measured here, so there is no invented monthly production bill. Reinitialization resends source/history and can increase paid input usage.

For an explicit budgeting example, the first optimized 50-VU run transferred **92,061 bytes per response**, including HTTP overhead: one million equivalent reads is about **92.06 decimal GB**. At an **assumed** $0.10/GB egress charge, that component would cost approximately **$9.21 per million reads**, excluding included allowances, compression/TLS differences, compute, database and model usage. This is arithmetic from the measured payload plus a labeled assumption, not a provider quote. High saturation throughput should not be extrapolated into a realistic monthly traffic forecast.

Measurement definitions: [k6 built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/), [k6 summaries](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/), [node-postgres pool counters](https://node-postgres.com/apis/pool). Exact installed versions appear in raw output.
