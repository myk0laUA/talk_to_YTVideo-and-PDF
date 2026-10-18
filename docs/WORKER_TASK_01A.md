# Worker task 01a — prepare the database persistence acceptance check

Issued by the PM on 17 October 2026, Toronto time. Paste this brief after `prompts/WORKER_PROMPT.md` in the separate worker chat. This file is a task specification; `docs/PROJECT_STATE.md` remains the canonical tracker.

**Outcome / parent:** Step 01: provide one repeatable, operator-only way to create a synthetic Source, verify the exact record in a later process, and remove only that fixture. Deliver the runbook needed for the PM's real migration and hosted restart check. Estimated effort: 45–60 focused minutes; stop at a reviewable implementation or precise blocker.

**Starting evidence:** `main`, HEAD `c68258e3ecafd4f1c76589d42fecb72e0383846d`; bootstrap working tree was clean before PM planning edits. All 24 bootstrap input hashes match. Node 24.22.0 / npm 11.19.1; recorded clean install, lint, typecheck, four unit tests, schema validation, production build and two Chromium viewport smoke checks passed. PM accepted this local evidence. No live migration, deployed service or physical-phone check has passed. User confirmed PostgreSQL and Render are not provisioned. Preserve PM/unrelated edits; re-inspect current HEAD/status before starting.

**Scope and existing files:** Build on `src/server/db.ts`, `src/server/env.ts`, `src/server/env-schema.ts`, `prisma/schema.prisma`, `prisma.config.ts`, and the committed `prisma/migrations/20261018031000_initial/migration.sql`. Add a small CLI/probe entry point and focused tests; proposed new paths are `scripts/verify-db-persistence.ts` and `tests/unit/db-persistence.test.ts` (not existing files). Document actual commands in README/testing notes. Reuse the existing schema and Prisma adapter; retain server-only runtime boundaries. Do not remove `server-only` just to make a CLI import work. If a small shared private client factory is necessary, explain it and preserve lazy credential-free shell/build behavior.

**Exclusions:** No public diagnostic/write routes, UI changes, visitor-cookie/API implementation, ingestion, voice, transcript cache behavior, scheduled cleanup, accounts or new service architecture. No schema migration unless a concrete defect requires PM review. No service provisioning, deployment, push, billing change or database reset by the worker. PM owns those operations. The probe is an operator fixture tool, not proof of browser source authorization.

**Applicable skills:** No design or React skill is needed for a CLI/database-only change. Follow `docs/SKILLS.md`. If browser regression inspection becomes necessary, use installed `playwright-cli` at `.agents/skills/playwright-cli/SKILL.md` with the existing local commands; no new browser tool or global install. Consult bundled `node_modules/next/dist/docs/` only if a framework change becomes necessary. Preserve all skill installations/lockfiles.

**Implementation notes:**

- Provide separate write, verify and fixture-cleanup modes; verification must run after the writer exits, including from the hosted service environment after the PM restarts it. Do not auto-seed on app startup or during build/tests.
- Use a uniquely identified synthetic fixture with known text/section markers, counts, a random private owner hash and a bounded explicit expiry. Keep the fixture handle/manifest outside tracked files and independent of the web service's ephemeral disk; document how the PM retains it across restart. Keep credentials and owner hashes out of CLI output/evidence.
- Verify the same row ID, exact expected content/sections/counts, owner marker and unchanged expiry; reject missing, changed or expired data. Verification must never recreate a missing row or extend its TTL. Use a short documented TTL sufficient for the planned check and record actual timestamps.
- Cleanup must match this run's ID and fixture identity before deletion. It must never sweep Source/TranscriptCache tables or delete another run's row. Make repeat cleanup safe and explicit. This is fixture cleanup only, not the application's future TTL job.
- Missing/invalid configuration and connection/operation failure must fail promptly with a nonzero exit and a sanitized category. Bound database work, close the pool on success/failure, honor provider TLS requirements, and never print a raw exception that could expose connection details or row contents.
- Keep `npm test`, shell, generation and build usable without a database. Explicit live commands must fail if configuration is absent; do not silently skip and report PASS.

**Acceptance checks:**

1. The three modes are documented and execute with pinned Node/npm; help is credential-free. The new command is not invoked automatically by install/build/start.
2. Focused automated tests cover missing/invalid configuration, sanitized operational failure, missing/expired/altered row rejection, successful exact verification, and cleanup restricted to the correct fixture. Use a small injected database boundary where appropriate; label mocked tests clearly. No live credentials are required for these tests.
3. A two-process live write/read can be run against the PM-selected database after the committed migration. It verifies database state rather than retained in-memory data. This remains NOT_RUN until a real target exists; a mock cannot satisfy it.
4. The runbook gives exact implemented commands and supports a PM-operated hosted write → actual web-service restart → verify sequence within TTL. Record deployment/build and restart event identities. A local process restart alone does not pass the hosted gate.
5. Scope remains backend/operator-only; the existing credential-free shell/build works, permanent secrets and raw models are not exposed, and there is no new HTTP fixture endpoint. Step 01 and Steps 02–14 are not marked complete.

**Commands (existing, verified):** From this checkout in PowerShell, select the local pinned runtime if necessary:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v24.22.0-win-x64') + ';' + $env:PATH
node --version
npm --version
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
```

Run the above once after changes. `npm ci` is needed only if dependency state requires it; preserve `package-lock.json` and do not add dependencies without a concrete need. No new browser suite is required for an operator-only change. If app/runtime behavior changes, run `npm run test:smoke` after the build (port 3100 free); `npm run browser:install` only if Chromium is missing.

**New command contract — TO ESTABLISH, not currently available:** Add and verify `npm run db:probe -- write`, `npm run db:probe -- verify`, and `npm run db:probe -- cleanup`, with documented run-handle arguments that do not put secrets in shell history. Record exact final syntax; do not describe these as already run. Include a credential-free help invocation. Put sanitized logs in `artifacts/local/01a/`.

**Real-service/manual procedure (PM/user, after provisioning; NOT_RUN until then):**

1. PM selects the intended PostgreSQL target and Render Node service/region, configures secrets through `.env` or hosting settings, and records non-secret identities. Confirm the target before migration. Run `npm run db:deploy`, then `npm run db:status`; expected: committed migration applied, schema up to date. Never use reset or development migration on the hosted target.
2. With the reviewed code running in the hosted service environment, execute the probe write command; retain the private handle outside ephemeral service storage. Expected: one identified synthetic Source with a recorded expiry, no secret/raw-row output.
3. PM restarts the actual web service through the authorized hosting workflow. Record restart time/event and deployed commit/build. Execute probe verify in the restarted service environment with the retained handle. Expected: the same unchanged record and content before expiry. Do not substitute a new write or local reader as hosted evidence.
4. Run probe cleanup. Expected: only that fixture is removed; a later verify reports missing with a nonzero exit. Preserve sanitized evidence, not the owner hash or connection string.
5. On an available physical phone, open the deployed HTTPS root and reload. Expected: shell loads with readable source/conversation labels and honest disabled controls, no horizontal clipping. Record URL, device, OS, browser, timestamp and build. This checks Step 01 shell access only; audio and the other phone platform remain untested.

**Required evidence back to PM:** Task ID; changed files and rationale; branch/HEAD plus dirty diff identity (or authorized commit); commands, exit statuses and timestamps; per-criterion expected/observed result; mock/local/live/deployed distinctions; sanitized artifact paths; exact new probe syntax; build identity; any failure and not-run checks. Return `READY_FOR_REVIEW` for the code/runbook with live acceptance explicitly NOT_RUN/BLOCKED if services remain absent. Do not self-approve Step 01. Follow `prompts/WORKER_PROMPT.md`'s report format.

**Stop conditions:** Return after this one task. If service access is missing, finish code, credential-free tests and runbook, then report that dependency. If the existing schema/client requires substantial redesign, fails under the pinned runtime, or a hosted execution method is unavailable, report the exact blocker and smallest alternative to the PM. Do not expose an unauthenticated route, weaken TLS/server-only checks, invent a DATABASE_URL, expand architecture or advance Step 02 to work around it.
