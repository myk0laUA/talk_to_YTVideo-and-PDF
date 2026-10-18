# Agent instructions

Read [START_HERE.md](START_HERE.md), [the implementation plan](docs/IMPLEMENTATION_PLAN.md), [project state](docs/PROJECT_STATE.md), [testing instructions](docs/TESTING.md), and [skill policy](docs/SKILLS.md) before work. Preserve the original Step 01–14 IDs and handoff documents.

The PM owns sequencing, bounded task briefs, evidence review, and completion decisions. A worker implements and verifies one assigned task, reports evidence and limitations, then returns to the PM. Keep one active implementation task. Role details: `prompts/APM_MANAGER_PROMPT.md` and `prompts/WORKER_PROMPT.md`. Do not advance later steps simply because scaffold code exists.

Use Node **24.22.0** and npm **11.19.1** (see `.node-version`, `.nvmrc`, and `package.json`). Use npm and preserve `package-lock.json`.

Consult the version-matched Next.js guides in `node_modules/next/dist/docs/` for framework changes. `agentRules: false` keeps `next dev` from rewriting this hand-maintained file.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
npm run start
```

`test:smoke` starts the existing production build on port 3100. Run `build` first. Database commands require a real `DATABASE_URL` in `.env`: `npm run db:deploy` applies committed migrations; `npm run db:status` checks them. Use `npm run db:migrate -- --name descriptive_name` only on an intended development database for schema changes. Never reset a shared database. Cleanup is not implemented yet.

Keep App Router UI in `src/app`, backend-only code in `src/server`, and safe cross-boundary values/types in `src/shared`. Server runtime entry modules must import `server-only`. Never send environment objects, permanent keys, owner hashes, or raw database models to the browser. The database client is infrastructure, not authorization: future services must enforce visitor ownership and expiry. No ingestion or conversation behavior is implemented yet.

Use only task-relevant selected skills from `.agents/skills` under `docs/SKILLS.md`; do not expand scope to satisfy generic skill suggestions. Preserve one source/one conversation, anonymous sessions, PostgreSQL, WebRTC voice, genuine text fallback, and no accounts/embeddings/vector database. Service provisioning and deployment are PM tasks.

Record actual commands, exit status, build identity, local versus deployed context, and gaps in `docs/PROJECT_STATE.md`. Screenshots/logs belong in ignored `artifacts/local/` or `test-results/`. Never claim browser emulation proves physical phone/audio behavior. Do not print or commit secrets.
