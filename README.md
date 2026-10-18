# Talk to a Document

A mobile web workspace for exploring one PDF or YouTube video through voice and text. **PDF import, complete preview, replacement and removal are now available** on Free Render application `03eb7d8`. Fresh PM YouTube UI checks passed 99/99 with synthetic providers; earlier PDF suite passed75/75; actual HTTPS/Free PostgreSQL displayed all 384 fixture lines and passed replacement/removal. Backend exact 25 MB evidence remains recorded separately. The requested iPhone PDF workflow passed by user report. YouTube owned-source backend is accepted locally/on the real DB; YouTube UI implementation is accepted against isolated success tests and real hosted error recovery. Live retrieval currently returns blocked, so public YouTube import remains disabled. Grounded conversation and TTL cleanup remain unfinished. Validated public caption cache passed local and actual PostgreSQL checks. Cancellation-safe sharing passed local and actual PostgreSQL checks in application675c12e (not deployed). Next: `docs/WORKER_TASK_06C.md`, bounded provider fallback/cooldown. Live API keys/funding/quota remain pending; diagnostic/credential gates stay disabled.

**03a accepted:** the separate default-disabled `POST /api/proof-captions` retrieved two uncached local fixtures with independent source-caption comparison. The actual Free Render trial returned one matching transcript and one player sign-in block; broad hosted reliability is unproven. The explicit local command is `npm run proof:captions:local -- --allow-public-youtube` after build; it starts/stops an isolated loopback server on port 3103. See [the caption proof handoff](docs/CAPTION_PROOF_03A.md) for configuration, contracts, limits and evidence. Managed captions and source-grounded conversation remain untested; normal import controls remain unavailable.

**Public shell:** [talk-to-document-4pre.onrender.com](https://talk-to-document-4pre.onrender.com/), deployed on Render Free in Ohio. Free PostgreSQL is provisioned and migrated; the live local operator probe and physical iPhone shell-access check pass. Exact source persistence passed across two actual hosted restarts; test data/configuration were removed and normal startup restored. Free hosting sleeps when idle; the database dashboard lists expiry on November 16, 2026. See `docs/PROJECT_STATE.md` for exact deployment identities and limitations.

## Local setup

Install **Node 24.22.0**, which bundles **npm 11.19.1**, and select it in your shell. Both versions are enforced by `.npmrc`; another major Node version will fail installation. `.nvmrc` and `.node-version` contain the same exact pin.

From this repository:

```sh
node --version
npm --version
npm ci
```

Expected versions: `v24.22.0` and `11.19.1`. `npm ci` generates Prisma Client without contacting a database.

Optionally copy the configuration example (the shell works without it):

```powershell
Copy-Item .env.example .env
```

On macOS/Linux: `cp .env.example .env`. Keep the blank secret values until you have real configuration. Do not overwrite an existing `.env`.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). Use Ctrl+C to stop. Without explicit valid PDF ingestion/visitor configuration the PDF chooser stays disabled. See `docs/PDF_UI_05A.md` and `.env.example`; never point routine browser tests at the real database. YouTube and conversation controls remain unavailable.

During this bootstrap, a checksum-verified Windows runtime was downloaded into ignored `.tools/node-v24.22.0-win-x64`. On this checkout only, PowerShell can select it for the current session with:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v24.22.0-win-x64') + ';' + $env:PATH
```

That directory is not committed or required on a fresh checkout. Install the pinned runtime normally on other machines.

## Verification and production mode

```sh
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
```

The focused Node tests check configuration validation, missing database configuration, error redaction, and accidental public secrets. The two Chromium smoke checks run the production server at `127.0.0.1:3100`, check desktop/390 px layout, disabled controls, keyboard navigation and browser errors, and save screenshots in ignored `test-results/`. They require port 3100 to be free. Browser installation downloads Chromium; Linux CI may also need `npx playwright install --with-deps chromium`.

To run production mode yourself after building:

```sh
npm run start
```

This serves [localhost:3000](http://localhost:3000). `next build` does not run ESLint; lint is a separate gate. See [testing](docs/TESTING.md) for later live-provider and physical-device acceptance checks.

## PostgreSQL and secrets

Prisma schema, client generation, a server-only lazy client, and the initial SQL migration are implemented. **The migration and local live operator probe passed against the PM-selected Render database.** For another checkout, set `DATABASE_URL` to the intended PostgreSQL connection URL supplied by its owner/provider in `.env` or the server environment. Use the provider's required TLS configuration; do not disable certificate checks as a workaround.

Once the PM has selected and configured the target database:

```sh
npm run db:deploy
npm run db:status
```

`db:deploy` applies committed migrations. For future schema edits on a development database, use `npm run db:migrate -- --name descriptive_name`; Prisma's development migration workflow may require shadow-database privileges. Do not point it at the production database. `npm run db:generate` regenerates types after edits.

The operator-only persistence probe is available with `npm run db:probe -- --help`. Its three modes are `npm run db:probe -- write --manifest <absolute-private-file>`, `verify --manifest <same-file>`, and `cleanup --manifest <same-file>`. Handles must be outside the checkout, protected as private files, and retained off-host across a service restart. The fixed TTL is two hours; verification never writes or extends it. Follow the [exact local/hosted persistence runbook](docs/DB_PERSISTENCE_RUNBOOK.md), including target confirmation, secure handle transfer, restart evidence and fixture cleanup. Local and hosted restart acceptance passed. The runbook uses a retained private Secret File and explicit temporary startup commands on Free hosting. This command is never invoked automatically and does not implement application cleanup or browser authorization.

`Source` stores temporary source text/sections, owner-session hashes, extraction metadata and explicit expiry. `TranscriptCache` stores only validated public captions under a unique video/language-preference/mode key. TTL enforcement, deletion, visitor sessions, and access checks still need implementation; database indexes alone do not enforce them. Conversation turns and audio are not stored.

`OPENAI_API_KEY`, `SUPADATA_API_KEY`, and `SCRAPECREATORS_API_KEY` are reserved, optional server variables for later integrations. None is needed for this shell and no provider access is verified. Never use `NEXT_PUBLIC_` for these values. The application and Prisma CLI validate configured values without logging secrets; a missing database URL fails when database access is requested.

## Structure and handoff

- `src/app`: App Router layout, page and responsive styles.
- `src/server`: environment validation and backend-only database client.
- `src/shared`: browser-safe product metadata; future public contracts belong here.
- `prisma`: PostgreSQL schema and committed migrations; generated client is ignored.
- `tests/unit`, `tests/smoke`: proportionate bootstrap checks.
- `.agents/skills`, `skills-lock.json`: selected project skills and installer lock; activation details in [skill policy](docs/SKILLS.md).
- [AGENTS.md](AGENTS.md): agent commands and manager/worker responsibilities.
- [Project state](docs/PROJECT_STATE.md): current evidence and next unfinished gate.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): requirements and original Step 01–14 acceptance checks.
- [Bootstrap decisions](docs/BOOTSTRAP.md): verified compatibility sources, tool versions and local evidence.

Steps 01 and 04 backend gates are complete; 05a PDF UI is accepted in local/hosted environments, requested iPhone PDF workflow passed by user report. Next worker brief: `docs/WORKER_TASK_06A.md`. Build first; `npm run test:source-ui` uses port 3107 (75 checks), `npm run test:sources:http` uses 3106 with a synthetic repository, `npm run test:pdf:http` uses 3105 with actual synthetic PDF parsing. Real Free PostgreSQL and actual Render HTTPS checks passed separately. Exact build/command/limitation evidence is in `docs/PDF_UI_05A.md`, `docs/SOURCE_STORAGE_04B.md` and `docs/PROJECT_STATE.md`. Hosting remains Free; no live API spend. Earlier hosted parser stress/stall/resource limitations remain documented.

AI assistance was used for scaffolding, implementation, configuration, deployment, documentation and verification. Recorded PDF ingestion checks do not establish working grounded conversation. The current hosted PDF test configuration generates its visitor signing secret per process; restarts can invalidate visitor access. Reload clears the selected view. Durable signing configuration and TTL cleanup remain release work.
