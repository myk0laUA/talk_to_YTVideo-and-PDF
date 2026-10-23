# Task 11A — expired-row cleanup operator runbook and review

**PM13D verification22October2026:** corrected harness passed all12 real PostgreSQL18.6 scenarios on an isolated migrated disposable target: zero owned fixtures remaining,4clients/pools released, container disposed. [Acceptance](PM_ACCEPTANCE_13D.md), logs `artifacts/local/13d/pm-sql/`. Earlier NOT_RUN statements are historical. No production cleanup/scheduler established by this test; operational plan remains a release action. Production cleanup/schema code unchanged; only invalid active-PDF fixtures and stage reporting corrected.

**Current PM11A review:** local cleanup implementation accepted in3961af4; build0rWK8RA2kP8W59_6R1mUe, all11 hashes match, fresh52cleanup/641unit PASS. Real PostgreSQL cleanup/race validation remains NOT_RUN, no deployment/scheduling. Next single task `docs/WORKER_TASK_08A.md`: simulated voice lifecycle/controls using07B priming. Full08–10 remain unfinished;07 model binding/live gates remain blocked. Public03eb7d8 stays PDF-only.

Worker proposes **READY_FOR_REVIEW** for this storage subcheck only. PM owns acceptance and production execution. Full Step 11, deployment and scheduling remain open. No schema/migration, existing repository/cache adapter, application route, client bundle import, UI or provider gate is changed.

## Operation and bounds

`src/server/cleanup/service.ts` captures one server-clock cutoff before the CLI acquires its own database connection. Both tables use **expiresAt <= cutoff**, including the exact boundary, regardless of Source kind, extraction status or legacy proof provenance. Future rows are excluded. There is no CLI cutoff, SQL or table parameter. The injectable clock/store are server-side test seams, not public routes. Normal execution uses Date.now. Existing ownership/read/replace/cache-upsert code remains untouched.

`src/server/cleanup/postgres.ts` uses the existing pg dependency and the current public Prisma tables. Each transaction explicitly requests READ COMMITTED (READ ONLY for dry-run), installs local timeouts, selects only id/expiresAt in ascending expiry/UUID order, then optionally deletes those UUIDs **with the expiry predicate repeated**. Neither bodies, sections, titles nor owner hashes are selected. The affected-row count supplies deletion totals. A committed refresh making a candidate future-dated survives; simultaneous cleaners can select the same row, but only the actual deleter counts it. There are no retries or application-client disconnects.

| Control | Default | Permitted CLI range / fixed bound |
|---|---|---|
| Batch candidates | 100 | 1–500 |
| Total candidates across both tables | 1,000 | 1–5,000 |
| Total completed batches, including empty scans | 20 | 1–100 |
| Invocation deadline | 30,000 ms | 1–60,000 ms |
| Batch deadline checked at query boundaries | 5,000 ms | Fixed |
| PostgreSQL statement / lock wait | 1,500 / 500 ms | Fixed |
| Idle transaction / client query backstop | 3,000 / 5,000 ms | Fixed |
| Connection acquisition | 1,500 ms | Fixed |
| CLI process backstop | 70,000 ms | Fixed; error exit, uncertain progress |

The batch deadline is cooperative at query boundaries. An in-flight query finishes/fails under its own timeout before cancellation can roll back. Rollback/connection shutdown also take time; the process backstop is the final bound. No claim of instantaneous query cancellation. pg 8.23.1 timeout/startup handling was inspected in installed `lib/defaults.js`, `lib/client.js` and `lib/connection-parameters.js`. The SQL design follows PostgreSQL's documented [READ COMMITTED predicate recheck](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED) and [statement/lock/idle transaction timeouts](https://www.postgresql.org/docs/18/runtime-config-client.html); consulted 18 October 2026. Documentation is design support, not real SQL test evidence.

Source scans precede TranscriptCache scans. A large Source backlog can consume the entire budget first. Execute reruns make progress; dry-run repeatedly inventories the same bounded prefix. No fairness/scheduling system is introduced. Dry-run performs no data writes and executes no DELETE; PostgreSQL enforces a read-only transaction.

## CLI and interpreting output

Select pinned Node24.22.0/npm11.19.1. Supply an intentional DATABASE_URL through the normal process environment or private `.env`; no localhost/default database is substituted. URL must include protocol, host and database. Only SSL query parameters are allowed; arbitrary startup SQL/timeout overrides are rejected. Never paste a secret URL into evidence.

```powershell
$env:PATH = "$PWD\.tools\node-v24.22.0-win-x64;$env:PATH"
npm run db:cleanup -- --help
npm run db:cleanup
npm run db:cleanup -- --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
# After PM review, on the explicitly intended target only:
npm run db:cleanup -- --execute --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
```

This worker did **not** run general execute cleanup on shared PostgreSQL. These are operator instructions for a later PM decision. `--execute` is required for deletion. Unknown/duplicate/invalid options, including future cutoff arguments, fail before connection acquisition. `--help` alone needs no database.

The JSON report contains mode, cutoff, elapsedMs, completed batch count, per-table selected/deleted/unscanned, status, countsBasis and failedBatch. **Counts cover completed batches only**; the active failed batch is never included as confirmed committed progress. Dry-run's selected count is an inventory, with deleted=0. `unscanned=0` means that table's keyset traversal reached a short/empty batch; it does not mean dry-run deleted the rows. `unscanned="unknown"` means the scan did not finish. It is intentionally not an unbounded COUNT query.

`status=complete` means the bounded traversal of both tables finished. It is not a global serializable emptiness guarantee: concurrent backdated insertions or expiry changes behind the cursor can require another run. `status=limit` never claims completion, including when a full batch happens to exactly meet the cap. No promise that a limit necessarily leaves a specific number of rows. Failed/unfinished tables keep unscanned unknown.

Exit **0**: complete scan; **2**: capped scan; **1**: usage/configuration/storage/close failure, cancellation or timeout. Preflight failures have no cleanup counts/cutoff because no operation ran. Valid configuration followed by connection failure reports a cutoff and zero completed batches with failedBatch=not_started. Signal handlers stop new work and roll back the active batch where possible. Stop after acknowledged COMMIT still includes that batch's actual deletions. Earlier committed batches remain committed.

`failedBatch=rolled_back` records acknowledged rollback before COMMIT was attempted. `failedBatch=unknown` covers ambiguous COMMIT or failed rollback; confirmed counters are then a lower bound on actual deletion. Do not interpret zero confirmed counts as proof of zero writes in that case. `none` means no failed SQL batch; `not_started` means acquisition failed. A process watchdog reports uncertain progress and exit1. Inspect/re-run a deliberate dry-run; there is no automatic retry. Sanitized output contains no connection string, driver error, UUID, owner, URL, title or source text.

The CLI owns one max-1 pg pool/client, destroys that connection on close, ends the pool, clears its watchdog and removes only its own SIGINT/SIGTERM listeners. The helper takes a caller-owned connection and never closes it. No shared application client is acquired.

## Repeatable local verification

```powershell
npm run test:cleanup
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run test:smoke
```

Ignored `artifacts/local/11a/run-checks.ps1` selects the pinned runtime, synthetic loopback DB, empty provider credentials and disabled gates, and writes UTC/exits to commands.jsonl. Build precedes smoke on3100. The final focused suite has **52 checks**; full suite **641**. Browser smoke remains the existing14 desktop/mobile-viewport cases; no browser automation was changed or investigated, no physical phone/audio claim.

Synthetic CLI sequence (the actual imported CLI runner/parser with injected test storage, not a real SQL process):

| Per table (Source and TranscriptCache independently) | Before rows | Selected | Deleted | Remaining rows / eligible |
|---|---|---|---|---|
| Default dry-run | 5 | 4 | 0 | 5 / 4 |
| Explicit --execute | 5 | 4 | 4 | 1 / 0 |
| Second --execute | 1 | 0 | 0 | 1 / 0 |

The test asserts byte-identical dry-run snapshots, unchanged live rows/owners/active slot, 3 opens/3 closes. Actual entry-point subprocesses separately test help, invalid options, sanitized connection failure and termination; there is no production synthetic DB flag. The focused log includes sanitized JSON sequence evidence, extracted as cli-sequence.json. Per-table fixture totals are assertions, not production inventory.

## Disposable PostgreSQL procedure — NOT_RUN

No designated disposable PostgreSQL target/opt-in was available to this worker. The existing shared Render DB is excluded from general execution. No service provisioning, dependency installation or migration was attempted. Unit simulations and SQL-contract assertions do **not** prove SQL race, locking, rollback, transaction timing or teardown semantics.

PM procedure:

1. Designate an isolated disposable PostgreSQL database already containing this repository's committed migrations. Keep the application and other writers off that database for the whole run; do not use the shared Render database. Verify isolation administratively, not from URL spelling. Harness requires both tables initially empty and a different actual database name from the ordinary database, even across different servers. It performs no schema provisioning/reset.
2. Supply `TEST_CLEANUP_DATABASE_URL` securely for that disposable target. Leave normal `DATABASE_URL` configured to the project's ordinary database solely for an identity SELECT. Supply `CLEANUP_DISPOSABLE_ACK=I_CONFIRM_EMPTY_DISPOSABLE_DATABASE` only after verifying the target. Do not record either URL. The harness rejects an identical URL before connection, then compares actual database name/OID/server address/port and refuses matching identities. Only the test target receives fixture writes. Conservative name refusal may reject safe same-name separate servers; use a distinctly named disposable database.
3. Run pinned `npm run test:cleanup:postgres`, capture sanitized stdout/stderr and exit under `artifacts/local/11a/`. Expect exit0/PASS, per-scenario reports, ownFixturesRemaining0 and all clients/pools released. Any stage/category failure is not a SQL pass. Missing opt-in and identical-target subprocess refusal are tested locally; they are not a live integration run.
4. Review actual CLI dry-run/execute/no-op counts (5→5→1→1 per table), byte preservation, exact expiry boundary, refresh before and **after** selection, overlapping cleaner actual-count sum4 per table, a simultaneous SQL replacement transaction preserving the unique active slot, forced pre-COMMIT failure/rollback, 500ms row-lock wait, cancellation before/during/between batches and during lock wait. Fixed-cutoff service cases use only a test clock. Replacement uses SQL with the existing unique slot; it does not retest the existing application's replacement API.
5. Fixture teardown matches generated UUIDs plus per-run title marker (and Source owner); it never truncates or deletes all expired data for teardown. Inspect ownFixturesRemaining and process exit. A hard process kill may leave synthetic fixtures: the whole database is disposable, and its disposal belongs to PM. Never repoint a harness to a shared database to remove leftovers. Harness PASS is printed only after fixture assertions and successful pool teardown.

The harness runs general CLI execution only after the explicit isolation/empty-table opt-in above. Running another writer against its target would invalidate that isolation assumption. It also contains the real-service race/lock/cancel tests; these remain unexecuted until PM runs it on an actual database.

## Acceptance map and limits

| Task criterion | Evidence / state |
|---|---|
| Both tables, expired/boundary/live and legacy statuses | Focused synthetic fixture and SQL parameter assertions PASS; disposable harness boundary scenario NOT_RUN |
| Dry-run zero writes; explicit execute; real parser | Byte-identical synthetic runner sequence, READ ONLY/no DELETE SQL contract, entry subprocess checks PASS; actual SQL CLI sequence NOT_RUN |
| Deterministic order, one cutoff, zero rows, caps, rerun | Focused keyset/cutoff/cap/empty/idempotency checks PASS; full capped run reports limit, unscanned unknown |
| Cache refresh/overlap/replacement/ownership | Synthetic orchestration PASS; SQL predicate reviewed; real SQL harness NOT_RUN |
| Failure/lock/cancel/deadline/partial progress | Synthetic orchestration, local timeout SQL contract, rollback/unknown-COMMIT and cancellation checks PASS; real lock/rollback/timing NOT_RUN |
| Safe output and resource ownership | Test-only secrets in failures absent from reports; runner close counters and process termination PASS; real SQL teardown NOT_RUN |
| No schema/routes/dependencies/UI/provider activation | Changed-file manifest and boundary audit; original adapters/schema/lockfile unchanged |
| Production/scheduling/free-host execution | NOT_RUN; no scheduler/hook/endpoint added |

Free Render procedure after a later PM approval: run the pinned CLI from a trusted operator machine with explicit access to the intended DB, beginning with dry-run and reviewing its bounded report. A sleeping web service does not execute this tool. A local operator machine must be running and able to reach the database. If `limit`, assess another bounded invocation explicitly; if error/unknown, inspect before any rerun. This task supplies neither periodic execution nor a retention guarantee while Free Render sleeps. No external automation was configured.

Earlier regression identities remain historical: sourceHTTP51/PDFUI75 build gPQqBgrBk57n2NXLBiHYu (18October21:33:59–21:35:08UTC); YouTubeHTTP59/YouTubeUI99 build SrvpjOM0z5eghhXbG4jBP (22:05:42–22:07:37UTC); cache53/coalescing61/fallback58 retain06C's named evidence, accepted in PROJECT_STATE. They were not relabeled fresh11A results. Existing repository/cache code is unchanged; their unit tests run in the fresh full641 suite. Public03eb7d8 remains PDF-only; real07 model budgeting and live gates remain blocked/open as recorded by PM.
