# Talk to a Document

A mobile web workspace for exploring one PDF or YouTube video through voice and text. **Current implementation: application shell, operator database probe, anonymous proof/credential boundary and gated WebRTC voice proof.** The proof is disabled by default and accepted only with local mocked verification; it is not deployed or live-verified. Imports, preview, production conversation and application cleanup are not implemented. Step 01 is complete; next is the microphone-free text transport proof (02c).

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

Step 01 is complete. Next worker brief: `docs/WORKER_TASK_02C.md`, microphone-free Realtime text transport. Tasks 02a/02b are accepted locally: 93 unit tests, six disabled production smoke checks and ten mocked voice browser checks pass. Build first, then run `npm run test:voice` on free port 3101 for the isolated mocked voice suite. See `docs/VOICE_PROOF_02B.md` and `docs/REALTIME_PROOF_BOUNDARY.md` for evidence and limits. Real database authorization remains the first PM check; live provider and physical audio remain unverified. OpenAI key/client funding are pending; the user stated a $50 total API ceiling (currency unspecified), with no live API spending yet.

AI assistance was used for scaffolding, configuration, deployment, documentation and verification. The recorded shell/database checks do not establish ingestion or conversation capability.
