# Task 01a — operator persistence acceptance runbook

**PM update, 18 October 2026: free hosting only.** The user has prohibited paid hosting. The SSH-based hosted procedure below is retained as the original worker proposal and is **not executable on the selected Render Free tier**. Do not upgrade or add paid services to follow it. Local probe commands remain applicable. A bounded worker revision must establish a free-compatible hosted execution method before Step 01 can pass; see `PROJECT_STATE.md`. No live checks have been waived or completed by this change.

**Live update, 18 October:** Free Render web service and PostgreSQL now exist in Ohio. The committed migration/status and separate-local-process live probe passed; the PM removed its fixture. Details are in `PROJECT_STATE.md` and ignored `artifacts/local/render-2026-10-18/`. Hosted runtime restart proof remains **NOT_RUN** and requires the free-host correction in `WORKER_TASK_01A_FREE_HOST.md`. Historical NOT_RUN labels below describe the initial worker handoff; current results belong to the tracker. This tool does not establish browser authorization, application TTL cleanup, ingestion or voice. Step 01 remains IN_PROGRESS; Steps 02–14 remain PENDING.

## Command contract

Use Node **24.22.0** / npm **11.19.1**, from the repository root with installed locked dependencies and generated Prisma Client (`npm ci`, or `npm run db:generate` when dependencies already exist). These commands are explicit operator actions and never run during install, build or app startup:

```sh
npm run db:probe -- --help
npm run db:probe -- write --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- verify --manifest <same-file>
npm run db:probe -- cleanup --manifest <same-file>
```

Replace the angle-bracket arguments with a file path, never a connection string or manifest contents. Help does not load `.env`, construct a database client or require generated Prisma files. Other modes load `.env` quietly, respecting already configured server environment variables. Missing/invalid configuration fails; it is never skipped. No dependency or schema changes are needed.

`write` exclusively creates a private manifest **before** opening the database, then inserts once. It refuses an existing handle, including after a failed write. Each manifest contains random row/run UUIDs, a random 256-bit private owner hash and exact UTC timestamps. The fixed TTL is **two hours from manifest creation**; it cannot be extended by verification. The fixture has two known page/text markers, exact JSON sections, full text, counts and metadata. `verify` reads the ID in the manifest and compares every stored field, including owner marker, creation/update timestamps and unchanged expiry. Missing, altered or expired fixtures fail. Each command is a separate Node process; the reader cannot reuse the writer's memory.

`cleanup` checks ID, owner, run-specific origin/title, provider, kind, creation and expiry, then performs one atomic deletion constrained by those same fields. It works after expiry, never sweeps tables and never accesses `TranscriptCache`. Repeat cleanup returns `ALREADY_ABSENT` with exit 0. An identity mismatch refuses deletion; do not edit the manifest to force it. Cleanup does not delete the private manifest: retain it until the final missing-row check, then remove only that file through the operator's normal secure file handling.

Success prints only mode, outcome, row ID and UTC timestamps, **after pool closure**. Failures print only `FAIL`, a category and timestamp, exit 1. Categories: `USAGE`, `CONFIGURATION`, `MANIFEST`, `DATABASE`, `TIMEOUT`, `MISSING`, `EXPIRED`, `ALTERED`, `IDENTITY_MISMATCH`. No raw exception, URL, owner hash, manifest contents or row is printed. A repeated cleanup success proves absence, not that this invocation deleted a row.

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

The PM selects and confirms the intended database/service/region, records non-secret resource identities, and configures `DATABASE_URL` in `.env` or hosting settings. Never put it in command history. Use the provider's TLS requirements and CA chain; for certificate-verified TLS use the provider-supported `sslmode=verify-full`/CA settings. The probe passes the URL to pg without injecting a permissive SSL object. It rejects `sslmode=no-verify`, `uselibpqcompat=true` and `NODE_TLS_REJECT_UNAUTHORIZED=0`. Do not turn off TLS or certificate validation to bypass an error. A provider-required CA must be available in that process. Provider TLS connectivity remains untested.

After confirming the target, the PM runs:

```sh
node --version
npm --version
npm run db:deploy
npm run db:status
```

Expected: `20261018031000_initial` applied and migration status up to date. Record timestamps and exit statuses with resource ID/region and reviewed commit/build. Do not reset, use `db:migrate`, or print environment variables on the hosted target. Migration tooling can report connection metadata; review/redact its output before retaining evidence.

## Local two-process live database check (PM, NOT_RUN)

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

## Actual hosted service restart check (PM, NOT_RUN)

**Execution prerequisite:** the selected service must support a shell/SSH session in the actual running web-service environment, and the deployed checkout must contain these scripts, generated client and production dependencies. Render documents shell/SSH for paid web services and no shell/SSH for free web services ([Render SSH access](https://render.com/docs/ssh)). Plan selection and any cost are PM/user decisions. If access is unavailable, mark this gate BLOCKED and return that exact constraint to the PM; do not add a public fixture endpoint or claim an ephemeral job/local process proves restart persistence.

1. Record deployed commit, deployment ID, `.next/BUILD_ID`, service ID/region and database resource ID. Connect using the exact SSH command from that service's dashboard; verify host fingerprints against Render's documentation. Change into the deployed repository root, confirm pinned Node/npm versions, and run credential-free help. Keep the same reviewed build throughout the check. Record UTC start time (`date -u`) and the current instance identity where available.
2. Choose a fresh non-secret filename such as `/tmp/td01a-RUN_ID.json` (replace `RUN_ID` with a new UUID). In that **hosted** shell:

   ```sh
   npm run db:probe -- write --manifest /tmp/td01a-RUN_ID.json
   echo $?
   ```

   Expected: `WRITTEN`, exit 0; retain row ID, createdAt and expiresAt from output. Never `cat` the handle. This starts the fixed two-hour clock.
3. Securely copy the private file to the operator's protected directory, before restart. Render documents SFTP-mode SCP transfer ([Render file transfer](https://render.com/docs/disks#transferring-files)). In local PowerShell, with the actual SSH endpoint and matching filename:

   ```powershell
   $probeSshTarget = 'YOUR_SERVICE@ssh.YOUR_REGION.render.com'
   $probeRemoteHandle = '/tmp/td01a-RUN_ID.json'
   $probeLocalHandle = Join-Path $probePrivateDir 'td01a-RUN_ID.json'
   scp -s -p "${probeSshTarget}:${probeRemoteHandle}" "$probeLocalHandle"
   $LASTEXITCODE
   Test-Path -LiteralPath $probeLocalHandle
   ```

   Expected: transfer exit 0 and `True`; do not display file contents. Confirm transfer support for the selected service before this gate. If unavailable, stop and ask the PM to resolve secure off-host retention; no new disk/service is provisioned by this task.
4. Exit the hosted shell. PM restarts the **actual web service** through the authorized hosting dashboard/workflow. Record restart request/completion UTC timestamps, event ID and service/deploy/build identities. Wait for the service to be running again. This runbook does not authorize a worker to restart or deploy it.
5. Copy the same local handle back to the restarted instance using the same endpoint and filename:

   ```powershell
   scp -s -p "$probeLocalHandle" "${probeSshTarget}:${probeRemoteHandle}"
   $LASTEXITCODE
   ```

   Reconnect to the restarted actual service, change into the repository root, apply `chmod 600 /tmp/td01a-RUN_ID.json`, and confirm the same deployed build. In the hosted shell run:

   ```sh
   npm run db:probe -- verify --manifest /tmp/td01a-RUN_ID.json
   echo $?
   npm run db:probe -- cleanup --manifest /tmp/td01a-RUN_ID.json
   echo $?
   npm run db:probe -- cleanup --manifest /tmp/td01a-RUN_ID.json
   echo $?
   npm run db:probe -- verify --manifest /tmp/td01a-RUN_ID.json
   echo $?
   ```

   Expected: `VERIFIED`/0 with the original ID/expiry, `REMOVED`/0, `ALREADY_ABSENT`/0, then `MISSING`/1 before TTL ends. Never run a new write to repair the original proof. On failure retain the handle privately for fixture cleanup; do not change its expiry. If the run expired, clean up and schedule a distinct new run, recording the failed attempt separately.
6. Store only sanitized logs in `artifacts/local/01a/`, copied off-host. Include command/exit/UTC timestamp, same row ID and expiry, source/deploy/build identity, restart event/time, service/database identities, and outcome. Avoid terminal recording during private file handling. Delete only this handle's local/remote copies after evidence and cleanup are confirmed. No permanent disk is required for the database proof.

## Physical phone check (PM/user, NOT_RUN)

On an available physical phone, open the deployed HTTPS root and reload. Expect readable source/conversation labels, honest disabled controls, no horizontal clipping. Record URL, device, OS, browser, Toronto/UTC timestamp and deployed build. This establishes only Step 01 shell access on that device; audio, permission behavior and the other phone platform remain untested.

## Evidence and review boundaries

`npm test` includes explicitly mocked persistence, validation, failure, timeout and cleanup checks plus credential-free real CLI/import/file checks. It cannot satisfy a real database or hosted restart gate. Record all live procedures above as NOT_RUN until actually executed. Ask the PM to review task 01a's code/runbook and retain Step 01 IN_PROGRESS; do not advance Steps 02–14.
