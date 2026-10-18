# Project state — Talk to a Document

**Snapshot:** 17 October 2026, Toronto time (18 October UTC). PM reconciliation accepted the local bootstrap at `c68258e3ecafd4f1c76589d42fecb72e0383846d`; database and deployment acceptance checks remain open. Detailed bootstrap decisions and evidence: `docs/BOOTSTRAP.md`.

**Current phase:** Step 01 — local foundation accepted by PM; service provisioning/deployment remain PM tasks.

**18 October PM update:** User has signed into Render and reached the new Web Service form. GitHub remote was confirmed empty with `git ls-remote --heads origin` (exit 0, no refs). PM reviewed all 01a operator code/tests and accepted the local probe portion; fresh `npm test` passed 18/18 (exit 0) and `git diff --check` passed. The free-tier hosted execution correction remains outstanding, so the full live Step 01 gate is not accepted. Preparing the reviewed shell/probe for the first GitHub publication; deployment is not yet verified. No application implementation changed in this PM review.

**Publication result:** Reviewed shell/probe and planning updates committed as `ef3f98bf48745f03d647fabcda678c4ad81718d9` and pushed to `origin/main`; commit and `git push -u origin main` exited 0. `git ls-remote --heads origin main` independently returned that exact SHA; working tree was clean after publication. The repository is no longer empty. User then attached Browser; the in-app Render tab opens at `/login`, so its separate session needs the user's OAuth login before PM can configure the free service. No service creation/deployment or billing change has occurred. This subsequent update is documentation only.

**Active worker assignment:** `01a` — operator-only Source persistence probe and runbook; worker proposes READY_FOR_REVIEW for code/runbook, awaiting PM evidence review. Brief: `docs/WORKER_TASK_01A.md`; results below and runbook: `docs/DB_PERSISTENCE_RUNBOOK.md`. This is the only active implementation assignment. **Verified completed implementation steps:** none in full. **Next unfinished acceptance check:** provision/configure the intended PostgreSQL target, apply the migration, then verify HTTPS phone access and source persistence across a service restart. The user confirmed that PostgreSQL and Render are not provisioned. Task 01a prepares the missing verification tool; it does not substitute for those live checks.

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

- **18 October 2026 user constraint: FREE HOSTING ONLY.** Hosting and database must use free tiers; no paid plans, upgrades, paid add-ons or chargeable overages are authorized. This supersedes prior paid-service suggestions. Render Free web service plus Free PostgreSQL remains a candidate for the assessment, with a 30-day database expiry and idle cold starts; no resources have been created. Confirm account availability and billing behavior before provisioning. OpenAI/provider usage is a separate, unresolved budget and is not authorized by this hosting decision.
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
| Actual project repository, branch and HEAD | Review baseline `main` at `c68258e3ecafd4f1c76589d42fecb72e0383846d`. Origin: `https://github.com/myk0laUA/talk_to_YTVideo-and-PDF.git`; `git ls-remote --heads origin` confirmed no remote branches on 18 October before first publication. Working changes include worker 01a plus PM planning updates. Use `git log -1` and remote refs for the resulting publication identity; no deployed identity exists yet. |
| Public app URL and hosting plan | NOT_PROVISIONED, confirmed by user during PM reconciliation; Render remains the intended host. No public URL or selected region recorded. |
| PostgreSQL, migration and source lifetime | NOT_PROVISIONED, confirmed by user. Schema/client/initial SQL prepared and validated offline. Only `.env.example` exists; no process `DATABASE_URL` is configured. No connection, applied migration, cleanup or restart-persistence result. |
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
| Database cleanup | Application TTL cleanup not implemented; operator fixture cleanup: `npm run db:probe -- cleanup --manifest <absolute-private-file>` | Fixture behavior tested with mocks only; live NOT_RUN; expiry indexes do not enforce TTL |
| Database persistence probe | `npm run db:probe -- --help`; `npm run db:probe -- write --manifest <absolute-private-file>`; `npm run db:probe -- verify --manifest <same-file>` | Help PASS exit 0; each live mode with missing configuration correctly exits 1. Live database NOT_RUN; exact procedure in DB_PERSISTENCE_RUNBOOK.md |
| Focused unit tests | `npm test` | PASS, 18/18: 4 existing configuration tests + 14 task 01a tests; persistence boundary mocked; no ingestion/conversation tests yet |
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
| 17 Oct 2026 Toronto | PM bootstrap review | `main` / `c68258e3ecafd4f1c76589d42fecb72e0383846d`; existing local Next build ID `lxNV6Yi8cibql5cMH2koo` | Local Windows; no live services | PASS for local bootstrap only | Inspected source/schema/tests and original worker command exit statuses; reviewed saved lint/typecheck/build/unit/schema/smoke/dev-console logs and passing Playwright last-run record. Fresh `node --version` / `npm --version` returned v24.22.0 / 11.19.1, exit 0; Node SHA256 verifier matched all 24 manifest entries, exit 0. `git diff --exit-code -- src tests prisma package.json package-lock.json` exited 0. Existing test suite/build not rerun; no new browser or physical-device claim. |
| 17 Oct 2026 Toronto | PM service prerequisites | Same HEAD; planning-only changes follow | User confirmation and local configuration-presence checks | BLOCKED for live checks | User: PostgreSQL and Render do not yet exist. No `.env`; process `DATABASE_URL` absent (values not printed). Deployment-file search found none (`rg` exit 1 means no matches). Task 01a can proceed without credentials; live migration/restart/phone checks remain NOT_RUN. |
| 18 Oct 2026 Toronto | PM 01a local review / pre-publication | `main` / `c68258e` plus reviewed worker and PM diff | Local Windows; mocked persistence, real CLI/filesystem tests | PASS for local probe | Reviewed all four operator modules, tests, package script and runbook; fresh `npm test` 18/18 exit 0; `git diff --check` exit 0. App/schema/lockfile unchanged. Hosted SSH procedure superseded by free-only decision; free-compatible hosted test remains pending. |

## Blockers and next actions

- The local shell needs no credentials and passes the recorded checks. No database connection was attempted; a real `DATABASE_URL` is needed to apply/test migrations. Keep secrets in `.env` or hosting configuration, never in chat or public variables.
- PM next: provision/configure only free PostgreSQL and the free HTTPS Node service in the same selected region once account/repository access is available. Apply `db:deploy`, inspect `db:status`, then complete a free-compatible hosted restart check and phone access. The existing SSH procedure cannot run on Render Free and must be revised before acceptance; do not upgrade to execute it. Region/access remain unresolved. No keys are needed in chat.
- 18 October scope correction for 01a: retain its local probe and evidence, but the hosted execution procedure needs a bounded worker follow-up compatible with Free hosting. A possible approach is an explicitly enabled, temporary operator startup command that writes/verifies the same private fixture across an actual service restart, then is disabled. This is a proposed design, not implemented or verified. No unauthenticated diagnostic endpoint; no silent reseeding; no downgrade of the persistence gate to a local-reader-only test. Keep the task under PM review until the corrected execution plan is reviewed; no second worker task has started.
- Worker 01a returned code/runbook with proposed READY_FOR_REVIEW; PM reviews evidence below. No new worker task started. The probe's fixture expiry/cleanup checks do not establish application ownership/expiry/cleanup. Those capabilities remain pending.
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
| 17 Oct 2026 | Accept completed local bootstrap after PM evidence review; issue only 01a | Committed inputs match recorded build/test evidence. First unmet gate is live database/deployment; worker prepares repeatable persistence verification while PM retains provisioning ownership. No application code changed in the manager chat. |
| 18 Oct 2026 | Free hosting and database only | Explicit user decision. Render Free has no SSH/shell/one-off jobs, sleeps after 15 idle minutes, and Free PostgreSQL expires after 30 days. Revise hosted test execution instead of purchasing access. Current official constraints checked at https://render.com/docs/free ; no service created or billing changed. |

## Worker 01a evidence — proposed READY_FOR_REVIEW

**Outcome:** operator code, focused tests and runbook implemented; live acceptance NOT_RUN / provisioning dependency BLOCKED. PM owns acceptance and sequencing. Step 01 remains IN_PROGRESS and Steps 02–14 remain PENDING.

**Build identity:** `main`, HEAD `c68258e3ecafd4f1c76589d42fecb72e0383846d`, dirty working tree; no commit, push or deployment. Production Next build ID `t8I8i-o9q6IhSzEgN5uBD`. PM edits already present on arrival: `START_HERE.md`, `docs/PROJECT_STATE.md`, untracked `docs/WORKER_TASK_01A.md`; preserved. Exact final file SHA256 inventory (including PM planning files) and inventory digest: ignored `artifacts/local/01a/input-files.sha256` and `artifacts/local/01a/identity.json`. The inventory distinguishes worker/PM dirty contents from HEAD; it is not a commit or deployed identity.

**Changes and decisions:** added `scripts/verify-db-persistence.ts`, private operator helpers in `scripts/lib/{db-persistence,probe-database,probe-manifest}.ts`, `tests/unit/db-persistence.test.ts`, `db:probe` npm script, README/testing references and `docs/DB_PERSISTENCE_RUNBOOK.md`. The operator owns its own bounded PrismaPg pool; no shared client refactor was necessary. Existing `src/server/db.ts`, server-only guards, app UI/runtime, schema, migrations, package-lock and skill installations are unchanged. No new dependencies, route, automatic seed or scheduled cleanup. Two-hour fixed TTL, private external manifest, all-field exact verification and atomic identity-constrained deletion support the PM's later acceptance procedure.

All execution below was local Windows x64 with Node v24.22.0 / npm 11.19.1. No `.env` or process DATABASE_URL was present (presence checks only; values never printed). UTC timestamps are on 18 October, corresponding to 17 October Toronto. Full start/end timestamps and command exit statuses are in `checks.json` and `probe-cli-checks.json` under the evidence directory.

| Check / command | UTC start–end, 18 Oct 2026 | Expected | Observed / exit / status | Evidence in `artifacts/local/01a/` |
|---|---|---|---|---|
| `node --version`; `npm --version` | During final verification | Exact pinned versions | v24.22.0 / 11.19.1; both 0; PASS | `runtime.log` |
| `npm run lint` | 03:29:06–03:29:08 | No errors/warnings | Exit 0; PASS | `lint.log`, `checks.json` |
| `npm run typecheck` | 03:29:08–03:29:11 | Generate client/types without DB; types pass | Exit 0; PASS | `typecheck.log`, `checks.json` |
| `npm test` | 03:29:11–03:29:12 | Configuration, exact verification/rejection, isolated cleanup, sanitation/deadlines, private handle I/O, CLI/import checks | 18/18 pass, exit 0; PASS. Persistence is mocked, CLI/import/filesystem checks are real local processes/files | `test.log`, `checks.json` |
| `npm run db:validate` | 03:29:12–03:29:13 | Existing schema valid without connection | Exit 0; PASS | `db-validate.log`, `checks.json` |
| `npm run build` | 03:29:13–03:29:17 | Credential-free production build | Exit 0; PASS; build ID above | `build.log`, `checks.json`, `runtime.log` |
| `npm run db:probe -- --help` | 03:29:54.214–03:29:54.827 | Help without credentials | Exit 0; PASS | `help.log`, `probe-cli-checks.json` |
| `npm run db:probe -- write --manifest <external-path>` | 03:29:54.831–03:29:55.388 | Missing config fails before creating a handle or connecting | CONFIGURATION, exit 1; PASS negative check | `missing-write.log`, `probe-cli-checks.json` |
| `npm run db:probe -- verify --manifest <external-path>` | 03:29:55.388–03:29:55.941 | Missing config is not silently skipped | CONFIGURATION, exit 1; PASS negative check | `missing-verify.log`, `probe-cli-checks.json` |
| `npm run db:probe -- cleanup --manifest <external-path>` | 03:29:55.942–03:29:56.490 | Missing config fails without deletion | CONFIGURATION, exit 1; PASS negative check | `missing-cleanup.log`, `probe-cli-checks.json` |
| `npm run db:deploy`; `npm run db:status`; real write/verify/cleanup | Not run | Migration and exact stored record verified with real selected DB | NOT_RUN; no target exists | PM follows runbook after provisioning |
| Hosted write → actual service restart → verify → cleanup → missing verify | Not run | Same ID/content/owner/expiry in restarted actual hosted environment | NOT_RUN; PostgreSQL/Render absent | Record deployment/build, restart event/time and sanitized logs per runbook |
| Physical phone HTTPS root/reload | Not run | Readable labels, honest disabled controls, no horizontal clipping | NOT_RUN; deployment/device evidence absent | Runbook gives exact observation fields; audio and other phone platform stay untested |

The focused probe-only suite was also run during implementation (12/12 at that point); the final 18-test suite above supersedes it. No unexpected failures were observed; missing-config invocations intentionally exit 1. `npm ci` was unnecessary because dependencies did not change. No browser suite was rerun: this task changes only operator code/docs, leaving the app runtime unchanged; prior bootstrap viewport results are not new task 01a or physical-device evidence. POSIX file-permission enforcement is implemented but its conditional test branch was not exercised on Windows; Windows directory ACL setup and real provider TLS remain operator/live checks.

**Acceptance mapping:** (1) implemented command/help contract, explicit-only npm script, pinned versions and real missing-config CLI checks; (2) final 18-test suite covers all requested mocked cases, every stored field mutation, expiry during read, cleanup identity mismatch/race, bounded operations/shutdown and late-read cancellation; (3) independent-process live procedure prepared, NOT_RUN; (4) hosted migration/restart/retained-handle runbook prepared, actual restart NOT_RUN; (5) backend/operator-only diff and credential-free build pass, unchanged schema/app/secrets boundary, no HTTP fixture endpoint.

**Remaining work / exact blocker:** PM must provision/select/configure PostgreSQL and Render, then execute and record migration, live two-process persistence, hosted restart and physical-phone evidence. Render's documented free web service lacks shell/SSH access; PM must confirm a compatible service/execution method and secure file-transfer support before the hosted gate. No plan/billing/access change was made. A private local handle must be retained before restart; ephemeral service storage alone is insufficient. The runbook uses dashboard-provided SSH endpoints and secure SCP transfer, with no credentials or owner hashes in shell arguments. Failed writes may have uncertain commit outcomes; retain the handle for verify/cleanup rather than inventing a new passing run.

**Handoff requested:** PM review code/tests/runbook and the input inventory; accept or return 01a without marking Step 01 complete. Stop here; no Step 02 implementation or service action is authorized by this worker brief.
