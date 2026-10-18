# Project state — Talk to a Document

**Snapshot:** 17 October 2026, Toronto time (18 October UTC). Local bootstrap is implemented and verified; database and deployment acceptance checks remain open. Detailed decisions and evidence: `docs/BOOTSTRAP.md`.

**Current phase:** Step 01 — local foundation ready for PM review; service provisioning/deployment remain PM implementation tasks.

**Active task:** local bootstrap handed back for review. **Verified completed implementation steps:** none in full. **Next unfinished acceptance check:** configure the intended PostgreSQL target, apply the migration, then verify HTTPS phone access and source persistence across a service restart.

The user authorized this bootstrap and tracker update. The manager resumes ownership of sequencing and completion decisions. Preserve this evidence when opening a new chat.

## Canonical files

| Purpose | Initial location |
|---|---|
| Plan and stable step IDs | `docs/IMPLEMENTATION_PLAN.md` |
| Status and evidence | `docs/PROJECT_STATE.md` |
| Verification procedures | `docs/TESTING.md` |
| Skill selection | `docs/SKILLS.md` |
| Manager and worker roles | `prompts/APM_MANAGER_PROMPT.md`, `prompts/WORKER_PROMPT.md` |
| Product references | `references/PRODUCT_REFERENCES.md` |
| Existing APM mapping | No separate framework/state found; this file remains canonical |

## Decisions already made

- Aim for level 4 in all four rubric areas, plus working deployed YouTube ingestion.
- One source at a time; no multiple-document search, embeddings or vector database.
- No accounts/OAuth now. Anonymous visitor cookies authorize temporary source access. Revisit accounts only if needed later.
- Managed PostgreSQL and Prisma; temporary Source and public TranscriptCache state. Permanent conversation history is deferred.
- Local application: Next.js 16.4.2 / React 19.3.1 / TypeScript 5.9.3, pinned Node 24.22.0 and npm 11.19.1. Prisma 7.10.1. Render Node hosting remains planned, not provisioned.
- YouTube: direct Node adapter first candidate, local proof, separate free hosted trial, managed Supadata/ScrapeCreators fallback. Canonical Python package only if a reserve is needed.
- Full supported source context with preserved sections and measured prompt changes. No silent truncation; optional lexical retrieval only for an observed problem.
- Real voice and genuine microphone-free text mode; explicit state, interruption, cleanup and recovery.
- Complete demo target Monday 19 October 2026; outer submission target Tuesday evening 20 October, Toronto time. Do not reset deadlines with a new chat.

## Step ledger

| ID | Step | Status | Evidence / next gate |
|---|---|---|---|
| 01 | Foundation and HTTPS deployment | IN_PROGRESS | Local scaffold, clean install, build and browser checks pass; SQL migration generated offline. Apply to real PostgreSQL, verify public HTTPS shell on phone and restart persistence next. |
| 02 | Realtime voice proof | PENDING | Real question/answer, anonymous credential route, stop cleanup |
| 03 | Local/deployed YouTube proof | PENDING | Local uncached captions, deployed managed result, separate free-direct outcome |
| 04 | Deployed PDF ingestion | PENDING | Near-limit PDF and beginning/middle/end completeness |
| 05 | Source selection and mobile preview | PENDING | Coherent 390 px import/preview/replacement flow |
| 06 | Production caption adapter | PENDING | Normalization, cache, bounded fallback/error behavior |
| 07 | Context and grounding | PENDING | Source coverage, evaluation, full local conversation proof |
| 08 | Voice controls and interruption | PENDING | Interrupt/follow-up/mute/stop/restart without stale sessions |
| 09 | Live conversation text | PENDING | Incremental/final ordering and interrupted turns |
| 10 | Text fallback | PENDING | Real source answer with microphone denied and no audio capture |
| 11 | Recovery and backend hardening | PENDING | Network, ownership/expiry, cancellation and bounded work |
| 12 | Mobile polish | PENDING | Physical phone workflow and explicit browser coverage |
| 13 | Reviewer script and tests | PENDING | Evidence for exact submission build and rubric |
| 14 | README and walkthrough | PENDING | Public app/repo, reproducible README, 10–15 minute video |

Allowed task statuses: PENDING, IN_PROGRESS, READY_FOR_REVIEW, DONE, BLOCKED. Evidence checks use PASS, FAIL, NOT_RUN or BLOCKED. A completed experiment with a negative result does not establish a working capability.

## Capability status

| Capability / access | Last known state |
|---|---|
| Actual project repository, branch and HEAD | Existing `.git` preserved on `main`; no HEAD existed at verification start. Local bootstrap inputs recorded in `docs/BOOTSTRAP_FILES.sha256`; first bootstrap commit includes lockfile and handoff. Use `git log -1 --oneline` for its final identity. No push. |
| Public app URL and hosting plan | UNVERIFIED |
| PostgreSQL, migration and source lifetime | Schema/client/initial SQL prepared and validated offline. No configured URL, connection, applied migration, cleanup or restart-persistence result. |
| OpenAI project/model access and live voice | UNVERIFIED |
| Local direct YouTube path | NOT_RUN |
| Deployed managed YouTube path | NOT_RUN |
| Deployed free direct YouTube path | NOT_RUN |
| Deployed 25 MB PDF boundary | NOT_RUN |
| Physical iOS Safari / Android Chrome | NOT_RUN / NOT_RUN |
| Selected skills installed in project | All four in `.agents/skills`; executable/skill versions in `docs/SKILLS.md`. Impeccable hook trust/automatic execution requires harness confirmation; no global package installation. |
| GitHub connector in planning environment | Public web research worked; connector requested reauthentication. This does not determine the worker repository's access. |

## Command registry

Commands below exist in the bootstrapped repository. Results are local and use the pinned runtime. `README.md` includes exact setup, including the optional checkout-local Windows runtime path.

| Purpose | Verified command | Last run / result |
|---|---|---|
| Runtime / package manager | `node --version`; `npm --version` | PASS: v24.22.0 / 11.19.1 |
| Clean dependency install | `npm ci` | PASS, exit 0; generates Prisma Client without a database |
| Development server | `npm run dev` | PASS with `-- --hostname 127.0.0.1 --port 3000`; HTTP 200 and browser console clear after icon fix; stopped after verification |
| Type/lint checks | `npm run lint`; `npm run typecheck` | PASS, both exit 0 |
| Production build/start | `npm run build`; `npm run start` | PASS, build exit 0; start exercised by smoke tests on port 3100 |
| Database schema/client | `npm run db:validate`; `npm run db:generate` | PASS offline; SQL generated with Prisma migrate diff (see BOOTSTRAP.md) |
| Database migrations | `npm run db:deploy`; `npm run db:status`; development-only `npm run db:migrate -- --name descriptive_name` | NOT_RUN: real target URL and privileges required |
| Database cleanup | Not implemented | NOT_RUN; expiry indexes do not enforce TTL |
| Focused unit tests | `npm test` | PASS, 4/4 configuration tests; no ingestion/conversation tests yet |
| Browser checks | `npm run browser:install`; `npm run test:smoke` | PASS, 2/2 production Chromium viewport checks (1440×1000, 390×844) |
| Browser CLI | `npm run browser:cli -- <command>` | PASS; version 0.1.22, dev open/resize/snapshot/console exercised |
| Forced provider / cache bypass | TO ESTABLISH | NOT_RUN |

## Evidence ledger

Append concise rows; store detailed logs/screenshots in the repository's appropriate ignored/local evidence location. Commit sanitized evidence summaries where useful; never commit secrets or private source data.

| Date | Task/check | Build | Environment / provider / device | Result | Evidence / limits |
|---|---|---|---|---|---|
| Planning snapshot | Requirements and plan | No application build inspected | Research only | Complete planning | No implementation test result implied |
| 17 Oct 2026 Toronto | 01 local bootstrap | `main`, first-bootstrap working tree; `docs/BOOTSTRAP_FILES.sha256` | Windows x64, Node 24.22.0, npm 11.19.1; no providers/database | PASS | Install/clean install, lint, typecheck, 4 unit tests, schema validation, production build. Logs: ignored `artifacts/local/`. |
| 17 Oct 2026 Toronto | 01 responsive shell | Same input manifest | Production Chromium 156.0.8078.4, 1440×1000 and 390×844 | PASS | 2 smoke tests: HTTP 200, labels, disabled controls, skip-link focus, no horizontal overflow or console errors. `test-results/*/shell.png` visually inspected. Not physical-phone evidence. |
| 17 Oct 2026 Toronto | 01 development smoke | Same input manifest | Playwright CLI, desktop Chrome, resized to 390×844 | PASS | Missing favicon fixed; fresh session has 0 errors/warnings. `artifacts/local/dev-snapshot.yml`, `dev-console.log`. Server stopped intentionally. |
| 17 Oct 2026 Toronto | 01 offline migration | `prisma/migrations/20261018031000_initial/migration.sql` | No connection or credentials | PASS for generation only | Initial missing-output defect fixed; SQL inspected. Real migration and persistence remain NOT_RUN. |
| 17 Oct 2026 Toronto | 01 dependency audit | Locked dependency tree | npm registry audit | FAIL full / PASS production-only | 5 high findings in one lint-tool chain; no patched braces release. `npm audit --omit=dev` reports 0. ESLint 9 also carries an unsupported-version notice; see BOOTSTRAP.md. |
| 17 Oct 2026 Toronto | 01 deployment/database acceptance | No deployed build | PostgreSQL/Render/physical phone | NOT_RUN | Outside local bootstrap; PM must complete the remaining gate. |

## Blockers and next actions

- The local shell needs no credentials and passes the recorded checks. No database connection was attempted; a real `DATABASE_URL` is needed to apply/test migrations. Keep secrets in `.env` or hosting configuration, never in chat or public variables.
- PM next: configure PostgreSQL, apply `db:deploy`, inspect `db:status`; provision the planned HTTPS Node service in its region, open it on a phone and verify a temporary server-written source survives restart within TTL. Ownership/expiry/cleanup remain implementation work, not claims made by the schema.
- OpenAI model/API access, Supadata/ScrapeCreators credentials, hosting settings and physical iOS/Android availability remain unverified. No services were provisioned and no deployment/push occurred.
- Review/approve `.codex/hooks.json` in Codex `/hooks` if prompted; refresh `/skills` discovery. On-disk skill installation and manual Impeccable context loading passed; automatic hook execution was not verified.
- Track the dev-only braces advisory and ESLint 9 support notice. No unsafe forced downgrade or audit suppression was applied. Do not mistake a clean production-only dependency audit for complete security verification.

## Decision log

| Date | Decision | Reason / consequence |
|---|---|---|
| 17 Oct 2026 | Defer accounts and permanent history | Demonstration scope; anonymous source authorization remains required |
| 17 Oct 2026 | Separate local, managed deployed and free direct results | Prevent a cached or managed success from being mistaken for direct-cloud proof |
| 17 Oct 2026 | Use a manager chat plus one worker chat per bounded task | Preserve sequencing and require evidence before advancing |
| 17 Oct 2026 | Manually scaffold inside the existing Git repository | Preserve all handoff documents; no create-next-app overwrite or Git reinitialization |
| 17 Oct 2026 | Pin Node/npm, stable framework/database packages and npm lockfile | Official requirements and actual local checks support the chosen stack; avoid Prisma release candidate |
| 17 Oct 2026 | Credential-free shell and offline generation; lazy server-only database access | Local bootstrap remains runnable without inventing credentials or claiming a connection |
| 17 Oct 2026 | Node configuration tests plus two production browser smoke cases | Proportionate foundation; add feature-specific tests only with actual features |
| 17 Oct 2026 | Install four selected skills at project scope | Preserve installer lock/content, avoid global dependencies; hook trust remains a manual harness action |
| 17 Oct 2026 | Keep Step 01 IN_PROGRESS and Steps 02–14 PENDING | Local build/browser evidence does not satisfy database, deployment or physical-phone acceptance |
