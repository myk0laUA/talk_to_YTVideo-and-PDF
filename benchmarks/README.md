# Measured backend reliability

**50 k6 virtual users: median 1,312 requests/s, median run p95 54.48 ms, 0% failed requests/timeouts across three 10-second stages.** **Excludes Next.js routing and WebRTC.** Local HTTP calls to production source handlers + real PostgreSQL; 45,614-character synthetic documents. Windows 11, i5-13600KF, 32 GiB RAM, Node 24.22.0, PostgreSQL 17.5, k6 2.4.0.

Removed an unnecessary read transaction: **39.4% more throughput, 13.9% lower p95**, per-metric medians of three 10-second stages in each long-lived process (not independent process trials or pooled latency percentiles). Query events/read fell **3 → 1**. **Tradeoff: median peak app RSS increased 356 → 544 MiB (+52.9%)**, missing the 512 MiB target. No memory improvement claimed.

Reproduce (set a new `BENCH_OUTPUT_DIR` first): `npm run bench:baseline`, `npm run bench:optimized`, `npm run bench:report` (prerequisites below). [Before](baseline.txt) · [After](optimized.txt) · [Generated comparison](results.txt) · [Architecture and targets](architecture.md).

**[November 16 independent audit](audit/README.md)** verifies these historical numbers, reports fresh reproduction and equal-rate memory probes, and lists current checks and qualifications.

## Before and after

50-VU results below are the median of each metric across three runs, not a composite “best run.”

| Metric | Before | After |
|---|---:|---:|
| Throughput | 941.47 req/s | 1,312.36 req/s |
| p50 | 52.03 ms | 35.83 ms |
| p95 | 63.31 ms | 54.48 ms |
| p99 | 76.60 ms | 66.88 ms |
| Request failures / timeouts | 0% / 0% | 0% / 0% |
| Peak app RSS, median | 355.52 MiB | 543.64 MiB |
| Mean app CPU, median (% of one core) | 14.10% | 13.05% |
| Mean source repository operation | 51.33 ms | 18.86 ms |
| Maximum pool connections | 5 | 5 |
| Peak queued pool acquisitions, median | 45 | 40 |
| DB restart → first successful read (one probe, includes readiness) | 201.15 ms | 194.75 ms |

50-VU throughput ranges: **928.64–942.95** before, **1,287.04–1,319.27** after. p95 ranges: **60.93–65.29 ms** before, **53.61–55.57 ms** after. The difference held across all three original repetitions. These stages share process, heap, pool and warmed database caches; the whole baseline matrix preceded the optimized matrix. There was no randomization or independent client/database CPU profile, so the test does not identify the system saturation limit. CPU and RSS are process measurements on a shared workstation; no CPU-efficiency or memory-saving claim is justified. Increasing serialization/allocation pressure remains a follow-up concern; these short runs cannot establish a leak or long-term memory bound.

The matrix also covers **1, 5, 10 and 25 VUs**, a **30-second sustained 10-VU run**, and a **5-second 50-VU spike**. All measured read workloads passed the HTTP latency/error thresholds. Complete results, including warmup, are retained in the raw files. `PASS` in the runner refers to assertions and k6 thresholds; it does **not** assert that every proposed resource target was met.

## Diagnosis and change

The original source read performed one SELECT inside an interactive transaction and executed `set_config` on each request. At 50 VUs the five-connection pool queued up to 45 callers. The baseline recorded three Prisma query events per read (including transaction work); this count is **not a count of every wire-level SQL command**. The source primary-key index already existed, so adding an index was not justified.

`SourceRepository.get` now uses one SELECT with the same owner, active-owner, source-kind and expiry filters and the same stored-record validation. PostgreSQL connection startup supplies 1.5-second lock and 3-second statement deadlines; read acquisition remains bounded at five seconds. Replacement/deletion transactions and their guards remain intact. A single SELECT has statement-level consistency; the previous READ COMMITTED transaction did not make later requests atomic with that read. No source cache or stale authorization shortcut was added.

The shared database factory also explicitly owns pool disposal and handles idle connection errors. Opt-in aggregate metrics cover API handlers, repository reads, Prisma queries, PDF parsing, app CPU/RSS and pool counts. Fixed labels/buckets keep memory and cardinality bounded. Raw request identifiers, SQL/parameters, source contents and credentials are excluded.

## Reproduce safely

Prerequisites: the repository's pinned **Node 24.22.0 / npm 11.19.1**, **PostgreSQL 17 binaries** (`initdb`, `pg_ctl`, `postgres`), and **k6 2.4.0**. Run as an ordinary user; PostgreSQL refuses root. Install dependencies with `npm ci`. No `.env` credentials are needed. The harness generates its own short-lived synthetic visitor cookies and never saves them in benchmark evidence.

PowerShell, after installing prerequisites:

```powershell
$env:PG_BIN = 'C:\Program Files\PostgreSQL\17\bin'
$env:K6_BIN = 'C:\path\to\k6.exe'
npm ci
$env:BENCH_OUTPUT_DIR = 'artifacts/local/sre/comparison' # preserve the published evidence
npm run bench:baseline
npm run bench:optimized
npm run bench:report
npm run bench:restore
```

On this checkout the bundled runtime was selected with `& .tools/node-v24.22.0-win-x64/node.exe --conditions=react-server scripts/bench/run.mjs baseline` (then `optimized`). The k6 ZIP was fetched from the [official v2.4.0 release](https://github.com/grafana/k6/releases/tag/v2.4.0) and verified against its SHA-256 checksum list. Downloaded tools are ignored, not vendored. On Linux, set `PG_BIN=/usr/lib/postgresql/17/bin` and put k6 on PATH (or set `K6_BIN`). Cross-platform results are not expected to match this workstation numerically.

The runner refuses occupied ports **3149 / 55439**, initializes a new cluster under ignored `artifacts/local/sre/`, applies the actual migrations, seeds 50 synthetic sources, starts the HTTP adapter, and stops its database/server in `finally`. The database is bound exclusively to `127.0.0.1`, with 20 maximum connections and 64 MiB shared buffers; the application pool is five. It never uses `DATABASE_URL` from `.env`, accepts no remote target, and constructs no real provider clients. Source fixture dimensions, commands, runtime, baseline/current repository hashes and configuration are recorded in output. Stopped cluster directories remain under the ignored artifact folder for inspection.

The baseline loader substitutes the archived, instrumented [pre-optimization repository](repository-baseline.txt) at its original module URL in the **test process only**. `node scripts/bench/audit.mjs` checks it against the parent commit after removing only the timing wrapper. Only that repository module was archived; the initial uncommitted factory/harness state was not archived in full, so complete byte-for-byte historical environment equivalence cannot be independently established. Both versions otherwise use the same handlers, database pool, synthetic content, observability and k6 script. The initial baseline applied lock/statement timeouts inside the read transaction; the optimized factory moves those same effective deadlines to connection startup. Reproduction applies the pool defaults to both; the archived baseline still performs its original per-read timeout query and transaction. No production flag selects baseline/mock behavior.

Durations: 10-second warmup; 10 seconds at each of 1/5/10/25/50 VUs; two additional 25/50 repetitions; 30 seconds at 10 VUs; 5 seconds at 50 VUs; 10 seconds of paced voice prepare/cancel. A request has a 10-second client timeout and no redirects; k6 drains for up to ten seconds. Runs are sequential, using the same machine and data dimensions. k6 consumes and checks the JSON body. There is no think time for reads, so these are closed-loop saturation tests, not arrival-rate tests or estimates of human concurrent users. The client, server and database share the workstation.

`npm run bench:smoke` is a shorter harness/real-database check and runs the existing PostgreSQL cleanup integration suite against two disposable local databases before seeding sources. Set `BENCH_OUTPUT_DIR` to a new directory to preserve published evidence; without it, commands rewrite the original named run files. The report and restoration commands honor the same directory. Do not commit local scratch runs unless they form intentional evidence. `npm run bench:report` recalculates the tables from untouched k6 JSON and resource records. No latency samples are removed. Client connection setup is outside k6 `http_req_duration`; iteration-duration statistics are retained too. The initial harness smoke output is retained under `pilot/` (including an option warning corrected before the full measurements). Later smoke verification overlapped browser regressions and is excluded from performance comparisons.

## Reliability and source/session scope

- A real PostgreSQL table lock produced a safe 503 in **1,512 ms** after optimization; the next read succeeded after unlocking. A stopped database returned 503; the first successful read followed restart in **195 ms**, including `pg_ctl` readiness. The separate smoke rerun recovered in **342 ms**, and the initial pilot took **350 ms**. The timer begins immediately before `pg_ctl start` and stops after one explicit read and body parse. Shutdown, outage duration and detection are excluded; no retry loop or automatic failover is measured. The same application process reconnects through its existing pool. Original probes asserted status and safe errors; the audit also compares the complete source before/after restart. These are local probes, not an availability SLA, a failover guarantee, or evidence of faster recovery after optimization.
- Five simultaneous visitors imported the same 100-segment transcript with **one mocked provider call and five real database writes**, completing within **96 ms**. Two simultaneous imports by one owner yielded **201 / 429**. Synthetic upstream timeout/failure responses yielded **504 / 502**, then a successful retry yielded 201. Timeout classification is injected after 50 ms; this does not measure a live provider deadline. Existing provider tests separately exercise actual timeout/abort behavior with injected transports.
- A generated **616-byte, one-page PDF** used the real worker/parser and PostgreSQL, completed in **206 ms**, and its persisted text was read back. This is a functional processing probe, not a PDF throughput or 25-MB capacity claim. Admission intentionally permits only one parser at a time; existing HTTP regressions cover large files, disconnects and worker cleanup.
- Voice HTTP preparation/cancellation ran at **one paced VU**, without credential minting or media. Twenty preparations succeeded per version; mean server preparation duration was **13.45 → 11.30 ms**, and all tickets/timers/mints were released. k6's setup-workload request summary combines prepare and cancel, so it is not presented as preparation-only p95. Existing configured session limits are not bypassed to manufacture a 50-session claim.
- [History restoration](restoration.txt) exercises the real serializer and final-ACK barrier with **128 dialogue items / 24,594 characters**, at 1/5/10 concurrent restorers, plus interruption and fresh restoration. ACKs are mocked with a requested 1 ms delay; Windows timer scheduling dominates the observed roughly two-second results. This is a correctness/timing probe of the restoration component, not end-to-end reconnect, model, microphone or audio latency.

There is no database-backed conversation-history endpoint. Conversation history is temporary browser memory, lost on page reload. **Neither the Next.js routing layer nor WebRTC/media is included in the k6 throughput figures.** Separate production-build HTTP/browser tests exercise routing and user flows. No live OpenAI, YouTube or Supadata integration, paid API calls, production traffic, deploy, push, or cloud modification was performed.

## Regression evidence

Run `npm run test:reliability` for the safe offline/local suite. It records commands, raw output and exit codes in [verification.txt](verification.txt); repeated invocations append, including failed attempts and their subsequent fixes. The PDF HTTP regressions require the existing generated fixtures: `python tests/integration/generate-pdf-fixtures.py` after installing `tests/integration/fixture-requirements.txt`. The main benchmark generates its own PDF and does not require Python. Browser checks require `npm run browser:install`.

The new regression checks cover single-statement authorization/expiry/record validation, redacted storage errors, pool deadlines, and metrics privacy/reset behavior. See [verification status](verification-status.md) for final outcomes and unrun checks. Historical test counts are not used as performance evidence.


## Methodology audit notes

The headline is a source-read saturation benchmark. Each response contains roughly 92 KB of JSON, including full text and section text. The real handler executes ownership checks, stored-record validation, Prisma reads and serialization; the adapter additionally buffers `Response.arrayBuffer()` before writing HTTP. That transport differs from Next.js. No empty-handler control was measured, so the fraction of time attributable to harness overhead is unknown. The three- versus one-query-event difference and fresh controlled replay support the transaction optimization, not a claim of 50 complete voice sessions or production scale.

`http_req_failed=0` and all semantic checks passing establish no recorded HTTP/network failures in the normal-load samples. Injected 400/404/429/502/503/504 probes are separate and intentionally excluded. Originally the custom timeout counter checked request timeout 1050 only; it now also checks dial timeout 1211 ([k6 error codes](https://grafana.com/docs/k6/latest/javascript-api/error-codes/)). Any original dial timeout would still have failed the built-in HTTP metric. Client connect/setup time is excluded from the headline latency. A median of run p95 values cannot be interpreted as the p95 of all pooled requests.

Dependencies are locked in `package-lock.json`: Next 16.4.2, Prisma/client/adapter 7.10.1, pg 8.23.1, pdf-parse 2.4.5, TypeScript 5.9.3 and Playwright 1.64.1. No TLS, remote database, network jitter, live rate limits, sustained WebSocket workload, or live model/audio cost is represented.
