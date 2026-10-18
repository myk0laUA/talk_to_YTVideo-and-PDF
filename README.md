# Talk to a Document

A mobile web workspace for exploring one PDF or YouTube video through voice and text. **Current implementation: local application shell only.** Imports, preview, visitor authorization, conversation, cleanup, and external services are not implemented. Step 01 remains in progress; the PM coordinates the remaining work.

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

Open [localhost:3000](http://localhost:3000). Use Ctrl+C to stop. The import buttons are deliberately disabled; the page explains the unavailable functionality.

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

Prisma schema, client generation, a server-only lazy client, and an initial SQL migration are prepared. **No database connection or migration application has been tested.** Set `DATABASE_URL` to a real PostgreSQL connection URL supplied by the database owner/provider in `.env` or the server environment. Use the provider's required TLS configuration; do not disable certificate checks as a workaround.

Once the PM has selected and configured the target database:

```sh
npm run db:deploy
npm run db:status
```

`db:deploy` applies committed migrations. For future schema edits on a development database, use `npm run db:migrate -- --name descriptive_name`; Prisma's development migration workflow may require shadow-database privileges. Do not point it at the production database. `npm run db:generate` regenerates types after edits.

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

Next PM gate: apply the migration to the intended PostgreSQL database, then deploy the shell over HTTPS in the same region and verify a temporary server-written source survives a restart within its TTL. Phone access, database persistence, service credentials and deployment remain unverified. Do not mark Step 01 done until its acceptance evidence exists.

AI assistance was used for local scaffolding, configuration, documentation and verification. No external service success or deployment is implied.
