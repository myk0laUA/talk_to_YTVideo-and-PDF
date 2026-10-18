# Project state — Talk to a Document

**Snapshot:** 18 October 2026, Toronto time. Free HTTPS shell and Free PostgreSQL are provisioned in Ohio; the committed migration and local live database probe pass. Physical iPhone shell access passes by user report and screenshot. Hosted restart persistence remains open. Bootstrap history: `docs/BOOTSTRAP.md`.

**Current phase:** Step 01 — deployed shell/database foundation; finish hosted restart proof.

**18 October PM update:** User has signed into Render and reached the new Web Service form. GitHub remote was confirmed empty with `git ls-remote --heads origin` (exit 0, no refs). PM reviewed all 01a operator code/tests and accepted the local probe portion; fresh `npm test` passed 18/18 (exit 0) and `git diff --check` passed. The free-tier hosted execution correction remains outstanding, so the full live Step 01 gate is not accepted. Preparing the reviewed shell/probe for the first GitHub publication; deployment is not yet verified. No application implementation changed in this PM review.

**Publication result:** Reviewed shell/probe and planning updates committed as `ef3f98bf48745f03d647fabcda678c4ad81718d9` and pushed to `origin/main`; commit and `git push -u origin main` exited 0. `git ls-remote --heads origin main` independently returned that exact SHA; working tree was clean after publication. The repository is no longer empty. User then attached Browser; the in-app Render tab opens at `/login`, so its separate session needs the user's OAuth login before PM can configure the free service. No service creation/deployment or billing change has occurred. This subsequent update is documentation only.

**Active worker assignment:** `01a` free-host correction — implemented; worker proposes READY_FOR_REVIEW for code/tests/runbook, pending PM review. Brief: `docs/WORKER_TASK_01A_FREE_HOST.md`; evidence appended below. PM accepts the original local operator probe with real database evidence. The runbook now uses a retained Secret File and explicit temporary startup commands on Free hosting; this correction is the only active implementation assignment. **Verified completed implementation steps:** none in full. **Next unfinished acceptance check:** verify the same deployed-runtime-written source across an actual free-service restart. Provisioning, migration, and physical iPhone shell access are complete; do not repeat the historical no-service blocker.

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

- **18 October 2026 user constraint: FREE HOSTING ONLY.** Hosting and database use free tiers; no paid plans, upgrades, paid add-ons or chargeable overages are authorized. Render Free web service plus Free PostgreSQL were created with both creation forms explicitly showing $0/month. No billing information was added. The database has a 30-day lifetime and the web service has idle cold starts. OpenAI/provider usage is a separate, unresolved budget and is not authorized by this hosting decision.
- Aim for level 4 in all four rubric areas, plus working deployed YouTube ingestion.
- One source at a time; no multiple-document search, embeddings or vector database.
- No accounts/OAuth now. Anonymous visitor cookies authorize temporary source access. Revisit accounts only if needed later.
- Managed PostgreSQL and Prisma; temporary Source and public TranscriptCache state. Permanent conversation history is deferred.
- Application: Next.js 16.4.2 / React 19.3.1 / TypeScript 5.9.3, pinned Node 24.22.0 and npm 11.19.1. Prisma 7.10.1. Render Free Node service and Free PostgreSQL provisioned in Ohio.
- YouTube: direct Node adapter first candidate, local proof, separate free hosted trial, managed Supadata/ScrapeCreators fallback. Canonical Python package only if a reserve is needed.
- Full supported source context with preserved sections and measured prompt changes. No silent truncation; optional lexical retrieval only for an observed problem.
- Real voice and genuine microphone-free text mode; explicit state, interruption, cleanup and recovery.
- Complete demo target Monday 19 October 2026; outer submission target Tuesday evening 20 October, Toronto time. Do not reset deadlines with a new chat.

## Step ledger

| ID | Step | Status | Evidence / next gate |
|---|---|---|---|
| 01 | Foundation and HTTPS deployment | IN_PROGRESS | Free HTTPS shell live; actual PostgreSQL migration/status, local live probe, and physical iPhone shell access pass. Actual hosted runtime restart persistence remains. |
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
| Actual project repository, branch and HEAD | Origin: `https://github.com/myk0laUA/talk_to_YTVideo-and-PDF.git`, `main`. Application/probe revision `ef3f98b`; deployed source revision `cfe3932ef9eddddaf9e78fada68d53703a719495` includes a later documentation update. Subsequent PM changes are documentation only; use `git log -1` for their identity, not as an invented deployment SHA. |
| Public app URL and hosting plan | `https://talk-to-document-4pre.onrender.com/`; Render Free Node, Ohio, service `srv-dba4fuvbtjjs73dong50`, project `prj-dba4furbc2fs73a1gfl0`. Deployed source commit `cfe3932ef9eddddaf9e78fada68d53703a719495`. First deploy `dep-dba4fvfbtjjs73donhd0`, migration deploy `dep-dba4hfbbc2fs73a1ldkg`, and restored-normal-build deploy `dep-dba4i5bbc2fs73a1npjg` all succeeded. Public Git Repository source; use manual deployment for future pushes. |
| PostgreSQL, migration and source lifetime | Render Free `talk-to-document-db`, Ohio, ID `dpg-dba4g98m7kps73fepv90-a`, PostgreSQL 18, 1 GB. UI expiry: November 16, 2026. Migration `20261018031000_initial` applied; `db:status` up to date. Local live write/read/fixture cleanup passed. Private internal URL saved only in service environment; external TLS `sslmode=verify-full` URL saved to ignored local `.env`. Application ownership/expiry/cleanup and hosted restart proof remain unimplemented/unverified. |
| OpenAI project/model access and live voice | UNVERIFIED |
| Local direct YouTube path | NOT_RUN |
| Deployed managed YouTube path | NOT_RUN |
| Deployed free direct YouTube path | NOT_RUN |
| Deployed 25 MB PDF boundary | NOT_RUN |
| Physical iPhone / Android | iPhone shell access PASS by user report and screenshot; exact model, iOS/browser versions and explicit reload unreported. Full mobile workflow/audio NOT_RUN; Android NOT_RUN. |
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
| Database migrations | `npm run db:deploy`; `npm run db:status`; development-only `npm run db:migrate -- --name descriptive_name` | PASS deploy/status in Render build `dep-dba4hfbbc2fs73a1ldkg`; subsequent build proves both chained commands exited 0. `db:migrate` NOT_RUN and unnecessary. |
| Database cleanup | Application TTL cleanup not implemented; operator fixture cleanup: `npm run db:probe -- cleanup --manifest <absolute-private-file>` | Live fixture cleanup PASS: REMOVED/0, repeated ALREADY_ABSENT/0; unrelated-row protection also has mocked tests. No application TTL job. |
| Database persistence probe | `npm run db:probe -- --help`; `npm run db:probe -- write --manifest <absolute-private-file>`; `npm run db:probe -- verify --manifest <same-file>` | Local separate-process live WRITTEN/0 and VERIFIED/0; after cleanup MISSING/1 as expected. Remote database over certificate-verified TLS. Hosted runtime restart check still NOT_RUN. |
| Focused unit tests | `npm test` | PASS, 22/22 after Free-host correction: 4 environment + 18 operator tests; persistence boundary mocked; no ingestion/conversation tests yet |
| Prepared-manifest operator path | `npm run db:probe -- prepare --manifest <absolute-private-file>`; `npm run db:probe -- validate --manifest <same-file>`; `npm run db:probe -- write-existing --manifest <same-file>` | Prepare/validate PASS without DB/configuration access; overwrite rejection PASS. Hosted insert uses the existing create boundary; duplicate/error behavior mocked, actual hosted runtime NOT_RUN. See revised runbook. |
| Browser checks | `npm run browser:install`; `npm run test:smoke` | PASS, 2/2 production Chromium viewport checks (1440×1000, 390×844) |
| Browser CLI | `npm run browser:cli -- <command>` | PASS; version 0.1.22, dev open/resize/snapshot/console exercised |
| Forced provider / cache bypass | TO ESTABLISH | NOT_RUN |
| Render service settings | Build: `npm ci --include=dev && npm run build`; start: `npm run start -- --hostname 0.0.0.0 --port $PORT`; health `/`; branch `main`; `NODE_VERSION=24.22.0`, `PORT=10000` | PASS, final normal deployment Live at 00:21:46 EDT on 18 Oct. One-time migration build was `npm ci --include=dev && npm run db:deploy && npm run db:status && npm run build`; restored afterward. Private `DATABASE_URL` also configured, value omitted. |

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
| 18 Oct 2026 Toronto, 00:15–00:21 EDT | Free provisioning and deployment | `cfe3932`; service/deployment IDs in capability table | Render Ohio, Free web 512 MB / Free PostgreSQL 18 256 MB, 1 GB storage | PASS | Both creation forms explicitly selected $0/month. Initial shell build/deploy succeeded; no payment data, paid plan or upgrade used. Last restored-normal deployment `dep-dba4i5bbc2fs73a1npjg` Live at 00:21:46. Evidence `artifacts/local/render-2026-10-18/normal-build-deploy-snapshot.txt`. |
| 18 Oct 2026 Toronto, 00:19 EDT | Real database migration/status | `cfe3932`, deploy `dep-dba4hfbbc2fs73a1ldkg` | Render build process → same-region real PostgreSQL | PASS | Temporary build chain ran `db:deploy` and `db:status`; initial migration applied at 00:19:37, schema up to date at 00:19:38, subsequent build/deploy succeeded (chained commands exited 0). Normal build restored afterward. `artifacts/local/render-2026-10-18/migration-deploy-snapshot.txt`. This is migration evidence, not hosted runtime persistence. |
| 18 Oct 2026 Toronto, 00:20:14–00:20:20 EDT | 01a live separate-process probe | `cfe3932` application/probe files; Node 24.22.0/npm 11.19.1 | Local Windows processes → real Render PostgreSQL via external TLS `verify-full` | PASS | `npm run db:probe -- <mode> --manifest <private-file>` produced WRITTEN/0, VERIFIED/0, REMOVED/0, ALREADY_ABSENT/0, MISSING/1 (expected final failure). Same fixture `4ad9cb32-1890-4224-b003-e8f53d7ed41d`; cleaned up. `artifacts/local/render-2026-10-18/live-probe-checks.json`, `live-probe.log`. Private manifest outside checkout, ACL restricted; never included in evidence. |
| 18 Oct 2026 Toronto | Public HTTPS shell | `cfe3932`, final normal deploy above | In-app desktop browser, 1280 px; direct HTTPS request | PASS | `Invoke-WebRequest` HTTP 200 and expected shell notices; browser title/heading/disabled imports present, document width 1265 <= viewport 1280; reload after final deployment passed. `artifacts/local/render-2026-10-18/http-check.json`, `public-shell.png`. Physical phone and audio NOT_RUN. |
| 18 Oct 2026 Toronto | Physical iPhone HTTPS shell | Last verified deployed source `cfe3932`, deploy `dep-dba4i5bbc2fs73a1npjg`; screenshot does not independently expose build identity | User's physical iPhone, browser/version and iOS version unreported | PASS for shell access | User reports "opened on my iphone, it works" and supplies screenshot. Heading, preview notice and source card fit the captured width with no visible horizontal clipping; import controls retain unavailable-preview presentation. Screenshot saved unchanged to ignored `artifacts/local/render-2026-10-18/iphone-shell-user.png`. Lower-page content, explicit reload, ingestion, conversation and audio are not established by this evidence. |

## Blockers and next actions

- PM provisioning/migration/local live probe are complete. Keep secrets in ignored `.env` and Render environment only. The service uses the provider's internal same-region URL; local verification uses the external URL with certificate verification. No permanent credential was printed or committed.
- Worker returned only the bounded free-host correction in `docs/WORKER_TASK_01A_FREE_HOST.md`; proposed READY_FOR_REVIEW. PM reviews the code/evidence, then configures the retained Secret File and temporary startup, deploys/restarts and restores normal settings per the runbook. No subsequent worker task started.
- Physical-phone shell gate accepted from the user's iPhone report and screenshot. No further human action is needed for this narrow shell-access check; full physical-device workflow/audio coverage remains for later steps.
- OpenAI model/API access, Supadata/ScrapeCreators credentials and physical Android availability remain unverified. Steps 02–14 stay PENDING.
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

## Worker 01a Free-host correction — proposed READY_FOR_REVIEW

**18 October 2026, Toronto:** implemented the bounded correction; actual hosted runtime acceptance remains NOT_RUN. This does not supersede PM's accepted migration, local live probe or iPhone shell evidence above. No database mutation, deployment, settings/restart operation, service purchase, provider use, commit, push or other-chat message was performed by this worker.

**Build:** clean arrival on `main` at newer HEAD `2bb3c5732fcb423fe59c91c0e4d23e9c9467d8b6`; final working tree dirty with this correction only. PM's newer documentation preserved. Local Next build `tvgDeSrGJF-lHxucvJ_qQ`. Final changed-file SHA256 inventory/digest: `artifacts/local/01a-free-host/input-files.sha256` and `identity.json`; HEAD supplies unchanged tracked inputs. No deployed identity is claimed for this dirty build.

**Changes:** `scripts/verify-db-persistence.ts` adds `prepare`, `validate`, `write-existing`; `scripts/lib/probe-manifest.ts` creates only for prepare/legacy write and reads existing files for other modes; `scripts/lib/db-persistence.ts` reuses the existing insert path and expiry check; `tests/unit/db-persistence.test.ts` adds retained-manifest, duplicate, independent-reader, invalid-input and redaction cases. `docs/DB_PERSISTENCE_RUNBOOK.md` replaces the obsolete SSH procedure with Free-only explicit startup steps. This tracker records evidence. `package.json`, package-lock, adapter/pool code, app/server code, schema/migrations, skills and default build/install/start remain unchanged. `.env` was not inspected or edited; normal requested build/Prisma tools load their configuration internally without printing values or making database requests.

**Exact new contract:**

```sh
npm run db:probe -- --help
npm run db:probe -- prepare --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- validate --manifest <same-file>
npm run db:probe -- write-existing --manifest <same-prepared-file>
```

Legacy `write`, `verify`, `cleanup` with `--manifest` remain intact. Prepare/validate never load `.env`, configure a DB or import its adapter. Hosted write validates the existing private file and expiry before DB configuration, then inserts; a duplicate ID fails with sanitized DATABASE/1, never upserts. Verify-only startup can never recreate a missing row or extend TTL. Cleanup retains its atomic identity constraints. The two-hour TTL starts at preparation, before upload/deploy. The runbook explicitly prevents reuse of a writer after cleanup; deletion frees the row ID, so no lifetime tombstone guarantee is claimed.

All following checks ran on local Windows x64, pinned Node v24.22.0/npm 11.19.1. Database behavior is mocked; CLI/filesystem/import behavior is real local execution. Evidence directory: ignored `artifacts/local/01a-free-host/`. UTC times on 18 October are Toronto EDT minus four hours.

| Check / actual command | UTC time | Expected | Observed | Exit / status | Evidence |
|---|---|---|---|---|---|
| `npm run lint` | Retry immediately after 04:34:35 | No errors/warnings | No diagnostics; terminal-attached retry completed in 2.795s | 0 / PASS | `lint-retry.log` |
| `npm run typecheck` | 04:34:53–04:35:11 | Generate/types pass | Passed | 0 / PASS | `checks.json`, `verification.log` |
| `npm test` | 04:35:11–04:35:13 | Original safeguards plus new prepared-file cases pass | 22/22 passed | 0 / PASS | `checks.json`, `verification.log` |
| `npm run db:validate` | 04:35:14–04:35:15 | Schema valid, no DB operation | Passed | 0 / PASS | `checks.json`, `verification.log` |
| `npm run build` | 04:35:15–04:35:24 | Existing shell builds | Passed; local ID above; configured `.env` present, not a new credential-free deployment claim | 0 / PASS | `checks.json`, `verification.log` |
| `npm run db:probe -- --help` | Around 04:36:29 | Help without configuration access | All six modes documented | 0 / PASS | `probe-cli.log` |
| `npm run db:probe -- prepare --manifest <external-test-file>` | 04:36:30 | Create private synthetic file only | PREPARED, no database operation | 0 / PASS | `probe-cli.log` |
| `npm run db:probe -- validate --manifest <same-test-file>` | 04:36:30 | Same ID/expiry validates without DB | VALIDATED; identical ID and two-hour expiry | 0 / PASS | `probe-cli.log` |
| Repeated `prepare` on same file | 04:36:31 | Refuse overwrite | MANIFEST; test file removed afterward | 1 / PASS negative check | `probe-cli.log` |
| Real CLI malformed/missing/expired manifest and invalid-config checks | Within `npm test` | Reject without writes or secret output | Expected MANIFEST/EXPIRED/CONFIGURATION; no connection attempted | Expected 1 / PASS | `verification.log`, test source |
| Mocked write-existing → separate reader boundary, duplicate insert, two verifies, cleanup, two missing verifies | Within `npm test` | Duplicate fails, reads never write; unrelated row survives | Expected results; mock pool closure and sanitized failures pass | Test 0 / PASS | `verification.log`, test source; NOT a live restart |
| `node artifacts/local/01a-free-host/check-staging.mjs` | 04:37:20 | Exact documented Node staging preserves bytes; missing source redacted | Identical synthetic bytes; staged CLI VALIDATED/0; missing stage MANIFEST_STAGE_FAILED/1 | 0 / PASS | `staging.log`, `check-staging.mjs` |
| `git diff --check`; unchanged app/schema/adapter/package/skills diff check | Final review | No whitespace errors or out-of-scope edits | Both exit 0 | 0 / PASS | final review in `identity.json` |
| Hosted write, verify-only settings deployment, actual Restart service twice, cleanup, missing verify and restoration | Not run | Same ID/expiry across actual hosted restart; fixture removed and normal service restored | PM execution required; no hosted operations authorized in worker chat | NOT_RUN | Exact Free-runtime procedure in runbook |

**Verification incidents/limits:** first non-PTY lint invocation stalled for several minutes with only its header; stopped only that invocation/process tree and reran with a terminal (PASS). See `stalled-lint.json`/`lint.log`; no successful exit is attributed to that attempt. An optional combined PowerShell CLI-check helper was rejected by automatic approval review before execution (tool returned only blocked-by-policy); a smaller direct CLI invocation completed safely. The ignored staging verification helper initially had a wrong relative import (MODULE_NOT_FOUND/1); corrected locally and reran successfully, without product-code changes. No required product check remains failed. Browser tests were unnecessary for operator-only changes. POSIX private-mode checks and the shell composition on Render/Linux remain unexecuted here; the actual staging JavaScript was checked on Windows. No new live connection/TLS result is claimed. No `npm ci` or migration was needed.

**Acceptance mapping:** (1) prepare/validate local CLI and filesystem tests pass; write-existing rejects bad/expired handles before DB configuration, retains legacy write behavior; (2) separate mocked readers and repeated missing checks demonstrate verify-only behavior; original cleanup isolation tests plus new unrelated-row case pass; (3) all 22 tests pass with sanitized duplicate/operational errors, no real DB target; (4) runbook gives exact Secret File upload, private staging, temporary write/verify startup, actual Restart service, repeated verification, cleanup/missing and normal-start/Secret-File removal steps. It warns that settings saves can already deploy and requires event inspection before manual dispatch; (5) default application/build/install/start and server-only/TLS/pool/atomic-delete safeguards remain unchanged, with no endpoint/dependency/provider budget.

**Remaining PM work:** review/commit/publish/deploy this correction, prepare a fresh handle just before the hosted sequence, upload it privately as `td01a.json`, execute the Free-runtime runbook within its original TTL, and retain same ID/expiry/reviewed commit plus deploy/build/restart event identities. Restore normal startup and remove only diagnostic Secret File/configuration, then confirm HTTPS shell. The brief's hosted gate is NOT_RUN, not blocked on buying access. Physical iPhone shell PASS remains as recorded; exact device/version/reload and full audio/Android checks remain separate. Step 01 stays IN_PROGRESS and Steps 02–14 PENDING. Worker stops at proposed READY_FOR_REVIEW; PM owns completion.
