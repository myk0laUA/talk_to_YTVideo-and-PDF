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

`test:smoke` starts the existing production build on port 3100. Run `build` first. Database commands require a real `DATABASE_URL` in `.env`: `npm run db:deploy` applies committed migrations; `npm run db:status` checks them. Use `npm run db:migrate -- --name descriptive_name` only on an intended development database for schema changes. Never reset a shared database. Cleanup is implemented: `npm run db:cleanup` defaults to dry-run and requires `--execute` for deletion. Real disposable-PostgreSQL cleanup/race verification and production execution/scheduling remain PM gates; follow `docs/CLEANUP_11A.md` and `docs/RELEASE_CANDIDATE_13C.md`.

Keep App Router UI in `src/app`, backend-only code in `src/server`, and safe cross-boundary values/types in `src/shared`. Server runtime entry modules must import `server-only`. Never send environment objects, permanent keys, owner hashes, or raw database models to the browser. The database client is infrastructure, not authorization: services must enforce visitor ownership and expiry. PDF extraction, owned Source storage/read/delete and public PDF import/preview are verified locally and on the host; the requested PDF iPhone flow passed by user report. Owned YouTube Source storage/read/delete and cross-kind replacement are verified locally/on PostgreSQL; YouTube UI implementation passes isolated success tests and actual hosted error recovery. Public YouTube remains disabled after the last hosted direct-caption block; the accepted local application route is the cloud exception. Owned-source text and voice are implemented with larger defaults and separate source-bound authorization; synthetic proof credentials must never authorize uploaded sources. Current local checks, historical live/user reports and final hosted/physical-phone gates are distinguished in `docs/RELEASE_CANDIDATE_13C.md`; do not claim guaranteed answer accuracy.

Use only task-relevant selected skills from `.agents/skills` under `docs/SKILLS.md`; do not expand scope to satisfy generic skill suggestions. Preserve one source/one conversation, anonymous sessions, PostgreSQL, WebRTC voice, genuine text fallback, and no accounts/embeddings/vector database. Service provisioning and deployment are PM tasks.

Record actual commands, exit status, build identity, local versus deployed context, and gaps in `docs/PROJECT_STATE.md`. Screenshots/logs belong in ignored `artifacts/local/` or `test-results/`. Never claim browser emulation proves physical phone/audio behavior. Do not print or commit secrets.
