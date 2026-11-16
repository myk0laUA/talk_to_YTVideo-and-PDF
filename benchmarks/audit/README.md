# Independent benchmark audit — November 16, 2026

**The transaction improvement reproduced; the resource-saving claim would not.** Real source handlers + local PostgreSQL, 50 k6 VUs, three 10-second stages per version: fresh median throughput **995 → 1,393 req/s (+40.1%)**, median run p95 **56.10 → 49.63 ms (−11.5%)**, zero recorded failures. Median peak RSS worsened **458 → 551 MiB**. **Next.js routing and WebRTC are excluded.**

The original **+39.4% throughput / −13.9% p95** arithmetic is correct. These are short local stage medians, not production capacity or a pooled p95. [Fresh raw comparison](reproduction/results.txt) · [Original claim calculations](claims.json) · [Memory evidence](memory/summary.json). Reproduce with `BENCH_OUTPUT_DIR` set to a fresh directory, then `npm run bench:baseline`, `npm run bench:optimized`, `npm run bench:report` ([setup](../README.md#reproduce-safely)).

## Resume accuracy

| Supplied bullet | Classification | Required qualification |
|---|---|---|
| Built/deployed Next/TypeScript voice app, 11 APIs, PostgreSQL, OpenAI Realtime/WebRTC, 128 turns | **NEEDS QUALIFICATION** | Source confirms technologies and 11 ordinary **method/path operations across ten paths**; four additional default-disabled proof paths bring the route-file count to 14. This does not mean 11 external APIs. The public homepage returned HTTP 200; live import/conversation and deployed commit identity were not reverified. 128 means individual role-tagged messages, subject to character/wire limits. Serializer/ACK-barrier tests verify that size; this is not a 128-message live WebRTC reconnect test. |
| 50 users, sustained 1,312 req/s, 54.48 ms p95, zero failures, +39.4% / −13.9% | **NEEDS QUALIFICATION** | 50 closed-loop k6 VUs, not 50 human voice sessions. 1,312.36 is the median of three stage-average rates. 54.48 is the median of three run p95 values, not a pooled p95. Each stage is ten seconds and shares a process with other stages. Arithmetic is verified; full historical configuration equivalence is not independently provable from the archived module alone. |
| Metrics, PostgreSQL failures, safe errors, 195–350 ms recovery | **NEEDS QUALIFICATION** | All four original probes were 194.7501–349.5331 ms, measured from invocation of `pg_ctl start` through readiness and one successful HTTP read/body parse. This excludes shutdown, outage duration and detection. It is neither full outage-to-recovery time nor automatic failover. |

**Verified facts:** actual route/handler code, original raw metric arithmetic, query events/read 3 → 1, fresh local behavior and tests linked below. **Inference:** fewer transaction round trips contribute to the observed improvement. **Unverified:** production scalability/SLOs, current deployed commit and full live-provider behavior, pooled latency quantiles, long-term leak freedom, and exact historical process/cache state.

The earlier architecture document incorrectly called “11 endpoints” stale. Counting supported method/path operations gives 11; counting ordinary paths gives ten. Unsupported-method exports returning 405 are not operations. [Architecture](../architecture.md) now makes that distinction explicit. No resume file was edited.

## Before/after and independent reproduction

| Metric at 50 VUs (median of each metric) | Original baseline | Original optimized | Audit baseline | Audit optimized |
|---|---:|---:|---:|---:|
| Throughput, req/s | 941.47 | 1,312.36 | 994.59 | 1,392.98 |
| p50, ms | 52.03 | 35.83 | 49.27 | 33.90 |
| Run p95, ms | 63.31 | 54.48 | 56.10 | 49.63 |
| Run p99, ms | 76.60 | 66.88 | 61.18 | 60.25 |
| Failed requests / recorded timeouts | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| Stage peak RSS, MiB | 355.52 | 543.64 | 458.31 | 551.31 |
| App CPU, % of one core | 14.10 | 13.05 | 33.34 | 41.34 |
| Query events per source read | 3 | 1 | 3 | 1 |
| Maximum pool connections | 5 | 5 | 5 | 5 |

Original throughput/p95 changes: **+39.3955% / −13.9414%**. Original RSS change: **+52.9133%** using unrounded values, rather than 52.8% from rounded 356/544. Audit throughput/p95 changes: **+40.06% / −11.54%**. Original and new CPU measurements vary substantially and the audit optimized process consumes more CPU; no efficiency claim is supported.

Fresh 50-VU ranges: baseline **986.55–1,000.96 req/s, 55.42–57.42 ms p95**; optimized **1,364.43–1,401.58 req/s, 49.24–51.48 ms p95**. All three optimized repetitions outperform all three baseline repetitions on these two metrics. This is useful reproducibility evidence, not a confidence interval.

### What is controlled, and what is not

- Same workstation, runtime/dependency versions, fresh cluster settings, five-connection app pool, fixtures, stage order/durations, warmup and mocked providers. Each matrix starts a new database and application process. The audit uses the same current factory for baseline and optimized, with only the archived repository implementation substituted.
- Each matrix has one long-lived process: individual stages share heap, warmed database/cache state and connections. Baseline precedes optimized; stage repetitions are not independent process trials. No deliberate OS cache eviction, randomization or machine-wide resource isolation.
- The archived repository is the original code plus a timing wrapper, checked against `b786404^`. The initial pre-optimization factory/harness state was not fully archived; its timeout/disposal changes cannot be replayed byte-for-byte. The fresh controlled replay confirms the transaction effect under the **current** shared factory.
- Removing the interactive transaction also removes its two-second transaction acquisition limit; the standalone read uses the pool's five-second connection acquisition limit. Lock/statement limits remain 1.5/3 seconds. Both are bounded, but behavior under a stalled or fully unavailable pool is not identical. The read-load comparison did not reach those acquisition deadlines.
- Fifty synthetic records, 45,614 characters and eight sections each, roughly 92 KB JSON per full-source response. Real handlers execute visitor ownership checks, record validation, Prisma reads and serialization. The Node HTTP adapter adds complete-response buffering; Next routing, middleware and transport behavior are absent. No empty-handler control attributes a precise percentage to harness overhead.
- k6, PostgreSQL and the application share a workstation. App-only CPU/RSS excludes client and database resources; client saturation and total-system bottlenecks were not separately profiled. A five-connection queue is observed, not proof that the database alone sets capacity.
- HTTP failures and semantic checks cover the normal load; intentionally injected failure probes are separate. Historical timeout counter covered request timeout 1050; the audit also counts dial timeout 1211. Built-in `http_req_failed` would capture either. No original latency samples were removed or raw files rewritten.

## Bounded memory investigation

Four 15-second stages at **500 arrivals/s**, 50 preallocated/max VUs, no warmup; two seconds idle then explicit GC outside each measured stage. Fresh process/cluster per version, optimized first then baseline. Both use `--expose-gc` and GC observation; these are diagnostic conditions, not the original saturation workload. Baseline completed **30,003** requests, optimized **30,004**, with zero failures or dropped iterations. [Baseline](memory/baseline.txt) · [Optimized](memory/optimized.txt).

| Measurement | Baseline | Optimized |
|---|---:|---:|
| Four stage peak RSS values, MiB | 307.92, 319.80, 311.27, 314.03 | 294.83, 298.86, 300.39, 300.40 |
| Post-GC live heap range, MiB | 19.42–19.64 | 19.20–19.24 |
| Post-GC RSS range, MiB | 283.05–308.96 | 284.05–297.58 |
| Final cumulative GC count (includes four forced GCs) | 2,515 | 3,384 |
| Final cumulative GC duration, ms | 1,580.41 | 1,845.89 |

**Observed:** live JS heap remains nearly flat; ArrayBuffer bytes fall to about 0.33 MiB after each forced collection; RSS does not return to initial process size. Both versions remain within the five-connection cap and have no pending pool waiters at memory snapshots. No new source cache was introduced. The optimized process performs more GC events in this equal-work probe, even though its sampled peak RSS is lower.

**Interpretation:** the original +52.9% RSS change is not demonstrated to be retained live JavaScript or a changed connection-pool maximum. Higher request volume, allocation churn, GC/heap sizing and response buffering are plausible contributors, consistent with the equal-rate results. The probe cannot assign causality among them or exclude native retention, slow leaks, or long-soak growth. Do not claim the optimization reduces memory; the ordinary saturation rerun still uses more RSS. Node's [memory API](https://nodejs.org/api/process.html#processmemoryusage) distinguishes live heap, external/ArrayBuffer allocations and RSS; they are not interchangeable.

Reproduce the diagnostic experiment after installing prerequisites:

```powershell
$env:BENCH_MEMORY = 'true'
$env:BENCH_OUTPUT_DIR = 'artifacts/local/sre/audit/memory'
npm run bench:optimized
npm run bench:baseline
$env:BENCH_MEMORY = ''
$env:BENCH_OUTPUT_DIR = 'artifacts/local/sre/audit'
node scripts/bench/audit.mjs
```

The final command independently recalculates original claims and, when present, the memory summary. All byte fields in `memory/summary.json` are converted to MiB; GC durations remain milliseconds.

## Failure and recovery audit

`pg_ctl stop -m fast` shuts down the isolated database. A read while stopped must return a safe 503. The test then times `pg_ctl start -w` followed by one explicit read in the same application process, with the existing Prisma/pool objects. It does not retry a failed request automatically. Pool reconnection permits the subsequent read without restarting the application; final disposal asserts the pool ended.

The original four values are **349.5331, 201.1468, 194.7501 and 341.9076 ms** ([calculated inventory](claims.json)). The four new instrumented probes are **285.00, 304.77, 289.76 and 293.18 ms**. The new probes split PostgreSQL readiness (**146.53–266.77 ms**) from the read (**35.39–138.39 ms**) and assert the entire returned source is unchanged. These checks cover a committed source and existing pool recovery, not crash durability of an in-flight write, replication, or failover.

The clean-clone smoke adds a fifth fresh probe at **289.43 ms**, using the committed original harness while browser checks ran. It is functional evidence, excluded from performance comparisons. All nine observed probes (four original, five fresh) fall within the rounded 195–350 ms range; none was discarded.

Real table locks return 503 at the configured approximately 1.5-second deadline, then reads succeed after unlock. Malformed/foreign requests produce 400/404. Mock caption timeout/failure produce 504/502 and a subsequent success. Five visitors share one provider call but perform real separate DB writes; two simultaneous imports for the same owner admit one and reject one. Source PDF processing uses the real worker/parser. Provider timeout classification is injected after 50 ms, not measured against a live service.

## Reproduction, checks and publication

See [verification status](verification-status.md) for commands actually executed, failures or exclusions, clean-clone results and publication state. Raw verification output is retained in [verification.txt](verification.txt). Local probes, installation/build checks and browser suites are separate from the performance matrices; smoke timings overlapping regression work must not be used as performance comparisons.

The security scan found zero known configured-secret matches and zero checked high-confidence token/private-key patterns across **1,921 reachable historical blobs**; all **335 tracked files** were inventoried, none exceeded 1 MB, and `.env.example` was the only tracked `.env` file. No tracked PDF/dump/database/archive files were found beyond schema migration SQL. [Scan scope](hygiene.json). This is a bounded heuristic audit, not a proof that all possible secret formats are absent. Generated clusters, cookies, downloaded tools and clean-clone dependencies remain ignored under `artifacts/local` or `.tools`.

**Dependency security is not clean:** `npm audit --json` exited 1 with eight moderate affected dependency entries (not eight distinct exploits); `npm audit --omit=dev --json` exited 1 with one. [Full audit](npm-audit.json) · [Production graph audit](npm-audit-production.json). No high or critical entries were reported at audit time. `fast-uri@3.1.8` is reached through `@prisma/streams-local → ajv`, via Prisma CLI/dev tooling and the client's optional Prisma peer. npm includes it in the production graph; no application request-path exploit was demonstrated. [fast-uri advisory and patched versions](https://github.com/advisories/GHSA-w74x-v6f9-j3xg). The other entries propagate from `minimatch@10.2.6` through TypeScript ESLint tooling; [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). ESLint 9.39.5 also prints an unsupported-version warning on installation. Dependency remediation is outstanding; versions were retained to keep this audit's measured environment reproducible. This is suitable evidence for a technical review with disclosed limitations, not an all-clear security/release assessment.

## Corrected resume candidates

- Built a Next.js/TypeScript voice app for PDFs and YouTube with 11 backend HTTP operations, PostgreSQL and OpenAI Realtime/WebRTC; component-tested replay of 128 role-tagged messages.
- Benchmarked source handlers with local PostgreSQL at 50 k6 VUs: median 1,312 req/s and 54.48 ms run p95 across three 10-second stages; removed redundant transactions to improve throughput 39.4% and p95 13.9%.
- Added bounded operational metrics and real PostgreSQL lock/outage tests; verified safe errors and first successful reads 195–350 ms from restart invocation across four local probes.

These candidates deliberately qualify the scope. Explain the increased RSS and missing Next/WebRTC load coverage when discussing the second bullet. The deployment claim can be retained separately as a historical accomplishment, but this audit verified only the hosted homepage, not current live provider functionality.
