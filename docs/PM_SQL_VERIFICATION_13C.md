# PM disposable PostgreSQL verification

23 October2026 UTC, following user Docker recovery. **Result: FAIL in harness fixture setup; cleanup behavior not yet evaluated.** Docker prerequisite is resolved. Sole follow-up is [Task13D](WORKER_TASK_13D.md).

Environment: Docker engine27.3.1; official postgres18 image digest `sha256:edb0c08dc33befd0262ab3b5cf1c4f3f8cfd8b09e88c05b45adee29d6761ddb6`, actual PostgreSQL18.6 Debian. Isolated container per attempt, random credential passed through environment, ephemeral tmpfs PostgreSQL storage and dynamic127.0.0.1-only port. Distinct local databases pm_reference and pm_cleanup_disposable; no ordinary/shared application database connection. Clean13C export used pinned Node24.22.0/npm11.19.1, no .env and no inherited application config.

Both attempts: container readiness0, disposable database creation0, `npm run db:deploy`0 (three migrations), `npm run db:status`0/up-to-date. Original `npm run test:cleanup:postgres` exited1 with DISPOSABLE_VALIDATION_OR_ASSERTION at CLI-sequence. Diagnostic replay used a temporary copy of the same harness with scalar error/stack-location reporting and no changed assertions/fixtures. It exited1, SQLSTATE23514 at seed Source INSERT (line39), before any child cleanup CLI result. The temporary diagnostic file was removed. Original failure evidence is retained separately.

Diagnosis from exact fixture and migration: future active PDF row has uploadedPdfOwner populated but extractionStatus FAILED and absent provider; Source_active_source_identity rejects it. The later replacement active PDF INSERT also lacks the required provider. Fixture fix must preserve active ownership and the existing constraint, not weaken either. No claim is made about later cleanup/race scenarios because execution did not reach them.

Evidence: original-checkout `artifacts/local/13c/pm-sql/` and `pm-sql-diagnostic/`, each with exact sanitized command ledger, timestamps, stdout and stderr. Both task-created containers were explicitly removed with `docker rm -f -v <exact generated name>` (exit0); task-label inventory afterward returned no containers. Their tmpfs data is gone. No existing containers/volumes were reset. Original application/test files and dependencies unchanged. No live provider calls, production migration, cleanup, commit, push or deployment.

13C offline acceptance is retained, while the real-SQL gate changes from NOT_RUN to FAIL/setup. PM reruns the full SQL suite after the focused worker correction, then resumes release commit/deployment and final hosted/device/submission gates.
