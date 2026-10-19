# Talk to a Document

A mobile web workspace for one temporary PDF or YouTube source and one conversation, with anonymous visitor sessions, PostgreSQL, server-side extraction and planned OpenAI Realtime voice over WebRTC with a microphone-free text fallback. No accounts, embeddings or vector database.

[PROJECT_STATE](docs/PROJECT_STATE.md) is the authoritative status tracker. Task 13A prepares reproducibility; it does not complete Step 13/14.

[Walkthrough preparation (14A)](docs/WALKTHROUGH_14A.md) provides a conditional 13-minute final script and a clearly labeled 5½-minute progress alternative. Recording, live integration and final reviewer access remain unverified.

| Capability | Verified scope / current limit |
|---|---|
| Public PDF import | Last verified [Free Render deployment](https://talk-to-document-4pre.onrender.com/), application `03eb7d8`: complete preview, replacement and removal through real PostgreSQL. Requested iPhone PDF flow passed by user report; device/browser versions unspecified. Not freshly retested by 13A. |
| YouTube | Owned-source storage, cache, coalescing and fallback have local/synthetic and separately recorded PostgreSQL evidence. Historical local direct extraction passed; latest hosted direct attempt returned blocked, so public YouTube import stays disabled. Managed live retrieval and complete live local fallback remain unproven. |
| Conversation UI | Local scripted lifecycle, priming, interruption, transcript, mode switching, recovery and mobile reflow have scoped evidence. Production supplies no uploaded-source conversation controller factories. Genuine grounded conversation is unfinished. |
| Release blockers | Exact supported-model tokenizer and Realtime framing accounting remain unavailable/fail closed. Keys alone cannot enable conversation. Source-session integration, grounding/audio, physical-device checks and real SQL cleanup/race verification plus scheduling remain open. |

Hosting remains Free, sleeps when idle and has resource limits. Last recorded Free PostgreSQL expiry: **16 November 2026**, not a fresh dashboard check. No paid-account access, provider quota or spending allowance is assumed. Conversation turns/audio are not stored; source access enforces visitor ownership and expiry. Bounded cleanup exists locally but has no verified SQL execution or production schedule. See [storage](docs/SOURCE_STORAGE_04B.md), [cleanup](docs/CLEANUP_11A.md) and the tracker for signing/restart and hosting limits.

## Clean local setup without keys

Install and select **Node 24.22.0 / npm 11.19.1** (`.node-version`, `.nvmrc`, `package.json`, `.npmrc`). Use npm and preserve `package-lock.json`. An ignored `.tools` runtime in another checkout is optional operator convenience, never a required repository input.

Use a new clone/export without another checkout's `.env`, `node_modules`, `.next`, generated files or artifacts. For isolated no-key review, use a fresh PowerShell session and set this environment first. It removes inherited application configuration without printing values; no `.env` is needed.

```powershell
Get-ChildItem Env: | Where-Object {
  $_.Name -match '^(NEXT_PUBLIC_|OPENAI_|SUPADATA_|SCRAPECREATORS_|PROOF_|REALTIME_|TEXT_PROOF_|CAPTION_PROOF_|PDF_PROOF_|PDF_INGESTION_|YOUTUBE_|VISITOR_|APP_ORIGIN$|DATABASE_URL$|NODE_OPTIONS$|NODE_ENV$|PRISMA_)'
} | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, $null, 'Process') }
$env:DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic'
$env:NEXT_TELEMETRY_DISABLED = '1'
```

Unset production gates default off. Provider keys stay empty/unset; the loopback database is deliberately unusable. The boundary runner enables its own isolated PDF fixture gate, generates nonreported signing material and uses a synthetic repository with external fetch blocked. Never substitute a real database for routine checks.

```sh
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
npm run test:boundaries
```

[Clean-copy results and reviewer checklist](docs/REVIEWER_CHECKLIST_13A.md) record inputs, builds, UTC times, exits and cache reuse. `npm ci` generates Prisma Client; `db:validate` validates the schema. Neither runs migrations or proves a live database. `next build` does not run ESLint.

Build before HTTP/browser checks. Smoke starts/stops production on free port **3100**, runs **16 Chromium checks** (desktop/390px plus small-width enlarged-text reflow), verifies disabled gates, keyboard behavior, route responses and browser errors, and saves screenshots in ignored `test-results/`. Boundary checks run **186 focused units + 59 built HTTP checks** on free port **3125**, using synthetic visitors/repository/providers. Viewports do not prove phone/audio behavior. `browser:install` installs Chromium or reuses its cache; Linux libraries may additionally require `npx playwright install --with-deps chromium` (not verified by this Windows run).

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000); stop with Ctrl+C. Alternatively, after build, `npm run start` serves production there. The no-key shell disables PDF/YouTube import and says voice/text are not connected. The configured public PDF deployment is a different environment. Optional server configuration is in [.env.example](.env.example); copy only when needed, never overwrite an existing `.env` or publish secrets with `NEXT_PUBLIC_`.

## Later service and reviewer gates

Provisioning, deployment, keys and intended-database migrations are PM work, outside this no-key procedure. On an explicitly selected configured database, `npm run db:deploy` applies committed migrations and `npm run db:status` checks them. `db:migrate` is for intentional development schema changes; never reset a shared database. See the [database runbook](docs/DB_PERSISTENCE_RUNBOOK.md). Credentials, owner hashes and raw database models stay server-only.

The [reviewer checklist](docs/REVIEWER_CHECKLIST_13A.md) separates later near-limit PDF, direct/managed uncached captions, accounting/integration, grounding, voice/text/device/network, SQL cleanup and exact deployed-build gates. Historical local extraction command `npm run proof:captions:local -- --allow-public-youtube` makes real outbound YouTube requests and is **not** part of offline verification; prerequisites and limits are in [03A](docs/CAPTION_PROOF_03A.md). No synthetic proof authorizes uploaded-source conversation.

## Code and evidence

- `src/app`: App Router UI; `src/server`: backend services; `src/shared`: safe contracts/lifecycle state.
- `prisma`: schema/migrations; generated client is ignored.
- `tests`, `scripts`: unit, built HTTP and isolated browser checks; scope in [TESTING](docs/TESTING.md).
- [Plan](docs/IMPLEMENTATION_PLAN.md): original Step 01–14 criteria; [skills](docs/SKILLS.md): selected tools; [AGENTS](AGENTS.md): handoff responsibilities.
- [Boundaries](docs/BOUNDARIES_11C.md), [mobile](docs/MOBILE_REVIEW_12A.md), [PDF UI](docs/PDF_UI_05A.md), [YouTube UI](docs/YOUTUBE_UI_05B.md), [model blocker](docs/MODEL_BUDGET_07C.md): scoped evidence and manual procedures.

AI assistance was used for implementation, configuration, deployment, documentation and verification. Historical evidence retains its original build identity in PROJECT_STATE; it does not establish final submission readiness.
