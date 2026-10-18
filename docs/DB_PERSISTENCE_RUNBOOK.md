# Task 01a — operator persistence acceptance runbook

**PM acceptance, 18 October 2026:** This procedure passed on deployed `c535122`: hosted write, verify-only startup, two actual dashboard restarts, exact verification, fixture-only cleanup, expected MISSING/1, and full normal-start/Secret-File restoration. Step 01 is DONE. See the PM acceptance table in `PROJECT_STATE.md` for exact times, deployments, instance markers and evidence. Earlier NOT_RUN statements below describe the worker handoff; they are superseded by that PM execution record. Do not rerun or recreate its cleaned-up fixture.

**18 October 2026 correction: Free hosting only.** The hosted procedure below replaces the original SSH proposal with a retained Render Secret File and temporary explicit start commands. No SSH, paid jobs, upgrades or new services are needed or authorized. Local probe commands remain intact. This correction is prepared for PM review; actual hosted restart persistence remains NOT_RUN.

**Live update, 18 October:** Free Render web service and PostgreSQL exist in Ohio. The committed migration/status, separate-local-process live probe, and user-reported iPhone shell access passed; the PM removed the original fixture. Details are in `PROJECT_STATE.md` and ignored `artifacts/local/render-2026-10-18/`. Hosted runtime restart proof remains **NOT_RUN**. This tool does not establish browser authorization, application TTL cleanup, ingestion or voice. Step 01 remains IN_PROGRESS; Steps 02–14 remain PENDING.

## Command contract

Use Node **24.22.0** / npm **11.19.1**, from the repository root with installed locked dependencies and generated Prisma Client (`npm ci`, or `npm run db:generate` when dependencies already exist). These commands are explicit operator actions. Normal install/build/start scripts never invoke them; only the PM's temporary hosted start setting runs a probe at startup:

```sh
npm run db:probe -- --help
npm run db:probe -- prepare --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- validate --manifest <same-file>
npm run db:probe -- write --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- write-existing --manifest <same-prepared-file>
npm run db:probe -- verify --manifest <same-file>
npm run db:probe -- cleanup --manifest <same-file>
```

Replace the angle-bracket arguments with a file path, never a connection string or manifest contents. Help, `prepare` and `validate` never load `.env`, read database configuration, import the adapter or connect. Live modes load `.env` quietly, respecting already configured server environment variables. Missing/invalid configuration fails; it is never skipped. No dependency or schema changes are needed.

`prepare` exclusively creates the private manifest without inserting a row (PREPARED/0). `validate` checks its location, permissions, format and unexpired two-hour TTL without a database (VALIDATED/0); it proves no database state. `write-existing` requires that already-prepared manifest, rejects missing/malformed/expired input before database configuration, and uses the existing insert operation. A duplicate ID fails with sanitized DATABASE/1; there is no upsert or missing-row recovery. It never edits the manifest. A new writer must never be substituted for a failed restart check. After explicit cleanup, do not invoke either write mode again with the old handle.

`write` exclusively creates a private manifest **before** opening the database, then inserts once. It refuses an existing handle, including after a failed write. Each manifest contains random row/run UUIDs, a random 256-bit private owner hash and exact UTC timestamps. The fixed TTL is **two hours from manifest creation**; it cannot be extended by verification. The fixture has two known page/text markers, exact JSON sections, full text, counts and metadata. `verify` reads the ID in the manifest and compares every stored field, including owner marker, creation/update timestamps and unchanged expiry. Missing, altered or expired fixtures fail. Each command is a separate Node process; the reader cannot reuse the writer's memory.

`cleanup` checks ID, owner, run-specific origin/title, provider, kind, creation and expiry, then performs one atomic deletion constrained by those same fields. It works after expiry, never sweeps tables and never accesses `TranscriptCache`. Repeat cleanup returns `ALREADY_ABSENT` with exit 0. An identity mismatch refuses deletion; do not edit the manifest to force it. Cleanup does not delete the private manifest: retain it until the final missing-row check, then remove only that file through the operator's normal secure file handling.

Success prints only mode, outcome, row ID and UTC timestamps, **after pool closure for database modes**. Failures print only `FAIL`, a category and timestamp, exit 1. Categories: `USAGE`, `CONFIGURATION`, `MANIFEST`, `DATABASE`, `TIMEOUT`, `MISSING`, `EXPIRED`, `ALTERED`, `IDENTITY_MISMATCH`. No raw exception, URL, owner hash, manifest contents or row is printed. A repeated cleanup success proves absence, not that this invocation deleted a row.

Database limits: one connection; 5-second connection and server statement timeouts; 7-second driver query timeout; 12-second operation deadline; 3-second shutdown deadline; 20-second final process backstop. Normal success/failure disconnects Prisma and ends the pool; a stalled driver is ultimately terminated, closing OS sockets. A timeout/network failure around a write or delete can have an uncertain commit outcome. Keep that manifest, use `verify`/`cleanup` once connectivity is restored, and do not substitute a new write as evidence for the same run. A late read after the deadline cannot initiate a delete. No retries are automatic.

The operator adapter uses the existing `PrismaPg` and generated schema with a separately owned bounded pool. The application singleton and its `server-only` boundary are unchanged. The CLI and adapter also import `server-only`; the npm command supplies Node's `react-server` condition for this explicit operator process. No HTTP route is added.

## Protect the handle and configure the target

Manifests are private control files, **not evidence artifacts**. The tool rejects paths inside this checkout (including ignored directories), creates files exclusively with POSIX mode 0600, and rejects group/world-readable manifests on POSIX. On Windows, restrict the containing directory's ACL before use; POSIX mode bits do not establish Windows privacy. Do not put manifests in git, chat, logs, screenshots or shell command arguments. Use a private local directory independent of the service's disk, and encrypted/authenticated transfer when moving a handle.

PowerShell setup for a private directory (once, before any manifest exists):

```powershell
$probePrivateDir = Join-Path $env:USERPROFILE '.talk-document-probes'
New-Item -ItemType Directory -Force -Path $probePrivateDir | Out-Null
$probeAccount = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $probePrivateDir /inheritance:r /grant:r "${probeAccount}:(OI)(CI)F"
```

On macOS/Linux, use `mkdir -p "$HOME/.talk-document-probes"` and `chmod 700 "$HOME/.talk-document-probes"`. Protect transferred files with mode 0600. Retain an unchanged copy on the operator's machine **before** restarting the service; a file left only in `/tmp` or on the service's ephemeral disk is insufficient.

The PM selects and confirms the intended database/service/region, records non-secret resource identities, and configures `DATABASE_URL` in `.env` or hosting settings. Never put it in command history. Use the provider's TLS requirements and CA chain; for certificate-verified TLS use the provider-supported `sslmode=verify-full`/CA settings. The probe passes the URL to pg without injecting a permissive SSL object. It rejects `sslmode=no-verify`, `uselibpqcompat=true` and `NODE_TLS_REJECT_UNAUTHORIZED=0`. Do not turn off TLS or certificate validation to bypass an error. A provider-required CA must be available in that process. The PM has recorded a live local certificate-verified TLS pass; this correction makes no new provider connection.

After confirming the target, the PM runs:

```sh
node --version
npm --version
npm run db:deploy
npm run db:status
```

Expected: `20261018031000_initial` applied and migration status up to date. Record timestamps and exit statuses with resource ID/region and reviewed commit/build. Do not reset, use `db:migrate`, or print environment variables on the hosted target. Migration tooling can report connection metadata; review/redact its output before retaining evidence.

## Local two-process live database check (already passed; PM rerun only if needed)

With the real selected target configured and migrated, choose a new filename:

```powershell
$probeHandle = Join-Path $probePrivateDir ('01a-' + [guid]::NewGuid().ToString() + '.json')
npm run db:probe -- write --manifest "$probeHandle"
$LASTEXITCODE
# The writer must have exited successfully before starting this separate reader.
npm run db:probe -- verify --manifest "$probeHandle"
$LASTEXITCODE
npm run db:probe -- cleanup --manifest "$probeHandle"
$LASTEXITCODE
npm run db:probe -- cleanup --manifest "$probeHandle"
$LASTEXITCODE
npm run db:probe -- verify --manifest "$probeHandle"
$LASTEXITCODE
```

Expected outcomes in order: `WRITTEN`/0, `VERIFIED`/0, `REMOVED`/0, `ALREADY_ABSENT`/0, `MISSING`/1, all within TTL. Capture sanitized stdout/stderr in `artifacts/local/01a/` with command, UTC timestamp, target identity and exit status. An expired final verify reports `EXPIRED`; it does not satisfy the missing-row assertion. A local process restart alone never passes the hosted restart gate.

## Render Free runtime restart check (PM, NOT_RUN)

This is a temporary operator workflow in the **actual web-service runtime**. It uses no SSH, job, new service, paid plan or HTTP fixture route. The normal package start command is unchanged. Keep one reviewed commit, original row ID and expiry throughout. Render documents Secret Files at `/etc/secrets/<filename>`; saving one triggers deployment ([Secret Files](https://render.com/docs/configure-environment-variables#secret-files)). The following startup composition is our procedure, not a claim of an already-run hosted check.

**Before the TTL starts:** PM reviews/commits/publishes this correction, deploys that exact commit with the normal commands below, and waits for Live. Record commit, deploy ID, service `srv-dba4fuvbtjjs73dong50`, Ohio, database `dpg-dba4g98m7kps73fepv90-a`, runtime versions, UTC time and build ID when available. Record each later settings deployment/build separately; never invent a `.next/BUILD_ID` if unavailable. The migrated target and `DATABASE_URL` are already configured; do not rerun migrations for this correction.

Normal Build Command (unchanged):

```sh
npm ci --include=dev && npm run build
```

Normal Start Command (retain for restoration):

```sh
npm run start -- --hostname 0.0.0.0 --port $PORT
```

1. **Prepare locally without a database.** Use the private local directory/ACL setup above, a fresh filename, and the pinned runtime:

   ```powershell
   $probeHandle = Join-Path $probePrivateDir ('01a-free-' + [guid]::NewGuid().ToString() + '.json')
   npm run db:probe -- prepare --manifest "$probeHandle"
   $LASTEXITCODE
   npm run db:probe -- validate --manifest "$probeHandle"
   $LASTEXITCODE
   ```

   Expected: PREPARED/0 then VALIDATED/0 with identical ID/createdAt/expiresAt. No row exists yet. The **two-hour clock starts now**, including upload/deploy time. Retain the original private local file; never regenerate or edit it during this run. Save only the sanitized output to evidence. All remaining operations must finish before expiry (cleanup still works afterward).
2. **Provision the same private Secret File.** In this existing service's Environment page, Secret Files → Add Secret File, use filename `td01a.json`. Privately paste the prepared file's exact JSON into Contents via the trusted local editor/clipboard; do not paste it into chat, a terminal command, a log or a screenshot. Save Changes. Clear the clipboard afterward. Keep normal startup during this step. Inspect Events and the resulting deployment and wait for Live: saving can already trigger a deployment, so **do not also dispatch another deploy**. Confirm the reviewed commit remains selected. Do not upload `.env` or change database/provider credentials.
3. **One explicit hosted write.** Set the service's Start Command to the single line below. The Node prefix copies the retained Secret File into a new private temporary directory and mode-0600 file, using only built-in Node APIs. It prints only the temporary path into a shell variable. This accommodates provider mount permissions/aliases without weakening the probe's out-of-checkout/private-file checks; the content/ID/expiry stay identical. Staging creates no database record. The temporary copy need not survive restart because the same Secret File and local original are retained.

   ```sh
probe_manifest=$(node -e 'const f=require("node:fs"),p=require("node:path");try{const bytes=f.readFileSync(process.argv[1]);const d=f.mkdtempSync(p.join(require("node:os").tmpdir(),"td01a-"));const t=p.join(d,"manifest.json");f.writeFileSync(t,bytes,{flag:"wx",mode:0o600});process.stdout.write(t)}catch{console.error("MANIFEST_STAGE_FAILED");process.exit(1)}' /etc/secrets/td01a.json) && npm run db:probe -- write-existing --manifest "$probe_manifest" && npm run start -- --hostname 0.0.0.0 --port $PORT
   ```

   Save once; inspect Events for any automatically triggered deploy. Only if none starts, PM deploys the **same reviewed commit** once. Expected runtime log: WRITTEN/PASS with the prepared ID and expiry, followed by normal app startup and Live. `&&` starts the app only after probe exit 0. Record deploy/build identity, actual UTC log timestamp and observed outcome. Do not infer a write from a successful build or an old Live instance. Duplicate starts must produce DATABASE/1 rather than insert a second row or silently succeed. After the first observed WRITTEN, promptly switch to the verify-only startup below; do not restart while write is configured. If the write's outcome is ambiguous, verify the same handle rather than issuing a fresh write.
4. **Verify-only startup.** Replace the temporary start setting with:

   ```sh
probe_manifest=$(node -e 'const f=require("node:fs"),p=require("node:path");try{const bytes=f.readFileSync(process.argv[1]);const d=f.mkdtempSync(p.join(require("node:os").tmpdir(),"td01a-"));const t=p.join(d,"manifest.json");f.writeFileSync(t,bytes,{flag:"wx",mode:0o600});process.stdout.write(t)}catch{console.error("MANIFEST_STAGE_FAILED");process.exit(1)}' /etc/secrets/td01a.json) && npm run db:probe -- verify --manifest "$probe_manifest" && npm run start -- --hostname 0.0.0.0 --port $PORT
   ```

   Save once, inspect the resulting event, wait for Live. Expect VERIFIED/PASS with the **same** ID/createdAt/expiresAt, then ordinary app startup. This command has no writer; missing/changed/expired data fails. This settings deployment alone is **not** the requested actual Restart service evidence.
5. **Actual restart, then repeated verification.** With the verify-only configuration successfully Live, use Dashboard → Manual Deploy → **Restart service**. Record request/completion UTC timestamps, restart event ID, source commit and available build identity. Observe a new VERIFIED/PASS in that restart's runtime logs with the original ID/expiry, then Live. Repeat the actual Restart service once while within TTL and capture VERIFIED again. Render documents that Restart service uses the running instance's same commit/configuration ([restart semantics](https://render.com/docs/deploys#restarting-a-service)); do not substitute a new latest-commit deployment or a local process. A repeated verify can never repair missing state. Never change the Secret File or TTL to make this pass.
6. **Explicit fixture-only cleanup.** After both restart verifications, replace the start setting with:

   ```sh
probe_manifest=$(node -e 'const f=require("node:fs"),p=require("node:path");try{const bytes=f.readFileSync(process.argv[1]);const d=f.mkdtempSync(p.join(require("node:os").tmpdir(),"td01a-"));const t=p.join(d,"manifest.json");f.writeFileSync(t,bytes,{flag:"wx",mode:0o600});process.stdout.write(t)}catch{console.error("MANIFEST_STAGE_FAILED");process.exit(1)}' /etc/secrets/td01a.json) && npm run db:probe -- cleanup --manifest "$probe_manifest" && npm run db:probe -- cleanup --manifest "$probe_manifest" && npm run start -- --hostname 0.0.0.0 --port $PORT
   ```

   Save/inspect/wait as above. Expect REMOVED/0 then ALREADY_ABSENT/0, followed by normal startup. Automatic retries can report ALREADY_ABSENT; retain the first REMOVED log when observed. Cleanup uses the original identity, cannot sweep tables and remains usable after expiry. Do not run write-existing again after cleanup; deleting a row frees its database ID, so operator authorization must stay verify/cleanup-only.
7. **Observe missing, then restore promptly.** Before expiry, use the exact **verify-only** start line from step 4 again. Expect FAIL/MISSING and nonzero exit 1; the `&&` chain intentionally prevents the new instance's app start. Capture that specific category and the corresponding failed startup event. Another category (EXPIRED, CONFIGURATION, etc.) is not a passing missing-row assertion. Do not treat a previous healthy instance's HTTP response as this check. Restore the **normal Start Command** above immediately, save once and inspect its deployment until Live. Do not leave diagnostic verify configured after cleanup or expiry.
8. **Remove diagnostic configuration.** With normal startup restored, delete only Secret File `td01a.json` from this service's Environment page, save, and inspect any triggered deployment until Live. Keep `DATABASE_URL`, normal build/start, Free plan and all unrelated settings intact. A fresh normal deployment discards the ephemeral staged copies; there is no durable `/tmp` dependency. Retain the private local original until cleanup/evidence are confirmed, then remove only that file. Confirm the public HTTPS root loads/reloads with its honest disabled controls and record the final commit/deploy ID and restored start setting.

On any unexpected failure, preserve the same private handle and sanitized category. Do not diagnose by printing credentials/rows. If TTL expires, record that attempt as failed/incomplete, clean up with its original manifest, restore normal startup, and plan a separate fresh run with PM authorization. No mock, settings save, build, or local live probe alone satisfies the hosted restart gate.

## Physical phone check (PM/user, separate)

The tracker records an existing iPhone shell PASS by user report/screenshot; this correction does not repeat or supersede it. If the PM requests a check after restoration, open the deployed HTTPS root on the user's physical phone and reload. Expect readable source/conversation labels, honest disabled controls, no horizontal clipping. Record URL, model, OS/browser versions, timestamp and deployed build; exact model/versions/reload were not reported previously. Audio, the full mobile workflow and Android remain NOT_RUN.

## Evidence and review boundaries

Keep correction evidence in ignored `artifacts/local/01a-free-host/`: command, timestamp, expected/observed category, exit status (or runtime/deploy evidence when the host does not expose it), local vs hosted and mocked vs real, reviewed commit, deployment/build/restart event IDs, original row ID and expiry. Never store the manifest or owner hash in evidence. `npm test` uses mocked database boundaries plus real local CLI/file checks; no hosted pass is implied. Actual free-runtime write/restart/verify/cleanup/configuration restoration remain NOT_RUN until the PM executes them. PM reviews READY_FOR_REVIEW; Step 01 remains IN_PROGRESS and Steps 02–14 PENDING.
