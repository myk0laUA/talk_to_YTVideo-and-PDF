# Project state — Talk to a Document

**Snapshot:** 18 October 2026, Toronto time. Step 01 is DONE. Tasks 02a and 02b are accepted for local implementation and mocked verification. PM fresh 93/93 unit tests pass; worker six disabled smoke checks and ten mocked voice browser checks pass. Accepted application revision `716e120aff0823952fd0255f2a86a9877e5c6db6` is not deployed. Single next worker task: 02c microphone-free text transport proof. API funding/key remain pending. Bootstrap history: `docs/BOOTSTRAP.md`.

**Current phase:** Step 02 — accepted local server boundary and WebRTC lifecycle; next implement the small microphone-free text transport proof. Real database authorization is the earliest unfinished PM check and does not require API funding. Live voice/text and physical audio remain unverified; funding/key and a bounded test allocation are required for provider checks.

**Historical PM update before provisioning (superseded by evidence below):** User has signed into Render and reached the new Web Service form. GitHub remote was confirmed empty with `git ls-remote --heads origin` (exit 0, no refs). PM reviewed all 01a operator code/tests and accepted the local probe portion; fresh `npm test` passed 18/18 (exit 0) and `git diff --check` passed. The free-tier hosted execution correction remains outstanding, so the full live Step 01 gate is not accepted. Preparing the reviewed shell/probe for the first GitHub publication; deployment is not yet verified. No application implementation changed in this PM review.

**Historical first publication result (superseded by evidence below):** Reviewed shell/probe and planning updates committed as `ef3f98bf48745f03d647fabcda678c4ad81718d9` and pushed to `origin/main`; commit and `git push -u origin main` exited 0. `git ls-remote --heads origin main` independently returned that exact SHA; working tree was clean after publication. The repository is no longer empty. User then attached Browser; the in-app Render tab opens at `/login`, so its separate session needs the user's OAuth login before PM can configure the free service. No service creation/deployment or billing change has occurred. This subsequent update is documentation only.

**Single worker assignment:** `02c` — `docs/WORKER_TASK_02C.md`, microphone-free Realtime text transport with mocked verification. 02b is accepted at `716e120aff0823952fd0255f2a86a9877e5c6db6` for its local/mock scope. Application implementation stays in the separate worker chat; no live API spending or Step 02 completion is implied.

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

- **18 October 2026 user constraint: FREE HOSTING ONLY.** Hosting and database use free tiers; no paid plans, upgrades, paid add-ons or chargeable overages are authorized. Render Free web service plus Free PostgreSQL were created with both creation forms explicitly showing $0/month. No billing information was added. The database has a 30-day lifetime and the web service has idle cold starts. API budget is separately capped at the user-stated $50 overall (currency unspecified); funding/key are pending, so live calls remain on hold.
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
| 01 | Foundation and HTTPS deployment | DONE | Clean build/migration, physical iPhone shell, exact source across two actual hosted restarts, fixture cleanup and normal configuration restoration all pass; final HTTPS 200. |
| 02 | Realtime voice proof | IN_PROGRESS | 02a/02b accepted locally: 93 unit tests, six disabled smoke checks, ten mocked voice browser checks. Next worker: 02c text transport. Real DB ownership, live provider/phone voice/Stop and live text remain NOT_RUN. See PM acceptance below. |
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
| Actual project repository, branch and HEAD | Origin `https://github.com/myk0laUA/talk_to_YTVideo-and-PDF.git`, branch `main`. Accepted 02b application revision `716e120aff0823952fd0255f2a86a9877e5c6db6`; later PM docs use current git HEAD. Deployed revision remains `c5351228857e1c2620c932e1ce08a0940a03d613`; 02a/02b are not deployed. |
| Public app URL and hosting plan | `https://talk-to-document-4pre.onrender.com/`; Render Free Node, Ohio, service `srv-dba4fuvbtjjs73dong50`, project `prj-dba4furbc2fs73a1gfl0`. Source `c5351228857e1c2620c932e1ce08a0940a03d613`; normal startup restored in `dep-dba4vstg1s2s73aq2h7g`. Final Secret File removal deployment `dep-dba505u1egvs739cpn7g` Live at 00:51:41 EDT; public shell reload and HTTP 200 verified. Public Git Repository source; manually deploy future code pushes. |
| PostgreSQL, migration and source lifetime | Render Free `talk-to-document-db`, Ohio, ID `dpg-dba4g98m7kps73fepv90-a`, PostgreSQL 18, 1 GB. UI expiry: November 16, 2026. Migration `20261018031000_initial` applied; `db:status` up to date. Local live write/read/fixture cleanup passed. Private internal URL saved only in service environment; external TLS `sslmode=verify-full` URL saved to ignored local `.env`. Hosted exact-record persistence passed across two actual restarts. Both probe fixtures cleaned up. Proof ownership/expiry enforcement is implemented and mock-tested in 02a, but not live/deployed verified; application TTL cleanup remains unimplemented. |
| OpenAI project/model access and live voice | Key absent; client funding pending. User states $50 total API ceiling, currency unspecified. No live provider test or spend yet; use mocks for 02a. |
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
| Database persistence probe | `npm run db:probe -- <prepare/validate/write/write-existing/verify/cleanup> --manifest <absolute-private-file>` | PASS local and hosted. Prepared file staged privately from Render Secret File; hosted WRITTEN, VERIFIED, two actual restart VERIFIED results, REMOVED, ALREADY_ABSENT and expected MISSING/1. Exact command composition is in `docs/DB_PERSISTENCE_RUNBOOK.md`. |
| Focused unit tests | `npm test` (`node --conditions=react-server --test tests/unit/*.test.ts`) | PASS 93/93 in fresh PM 02b review, exit 0; includes server policy and voice lifecycle. Database/provider/media/RTC are mocked. |
| Prepared-manifest operator path | `npm run db:probe -- prepare --manifest <absolute-private-file>`; `npm run db:probe -- validate --manifest <same-file>`; `npm run db:probe -- write-existing --manifest <same-file>` | Prepare/validate PASS without DB/configuration access; overwrite rejection PASS. Hosted insert uses the existing create boundary; duplicate/error behavior mocked, actual hosted runtime NOT_RUN. See revised runbook. |
| Browser checks | `npm run browser:install`; `npm run test:smoke` | Worker PASS 6/6 on 02b build: shell, disabled routes and disabled voice page in desktop/mobile Chromium. Browser already installed; no live/physical-audio claim. |
| Isolated voice browser checks | `npm run test:voice` | Worker PASS 10/10 on production build `H8OefkVNjEG3leIZd2G1D`; synthetic config, fake media/RTC/audio, intercepted HTTP, port 3101 teardown verified. Build first. |
| Browser CLI | `npm run browser:cli -- <command>` | PASS; version 0.1.22, dev open/resize/snapshot/console exercised |
| Forced provider / cache bypass | TO ESTABLISH | NOT_RUN |
| Render service settings | Build: `npm ci --include=dev && npm run build`; start: `npm run start -- --hostname 0.0.0.0 --port $PORT`; health `/`; branch `main`; `NODE_VERSION=24.22.0`, `PORT=10000` | Normal start restored, Live 00:50:18 EDT on 18 Oct. Diagnostic Secret File removed; final normal deployment Live at 00:51:41 EDT. Private local test manifest removed after cleanup verification. Private `DATABASE_URL` remains configured, value omitted. No paid plan change. |

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

## PM acceptance — Free-host correction and Step 01 complete

18 October 2026, Toronto. Reviewed the six-file worker diff and all changed-file hashes (zero mismatches), original safeguards and retained-manifest tests. Fresh PM `npm test`: 22/22, exit 0; `git diff --check`: exit 0. Reviewed worker lint/typecheck/schema/build/staging evidence; did not rerun unchanged full checks. Published reviewed correction `c5351228857e1c2620c932e1ce08a0940a03d613` (`git commit` and `git push origin main`, exit 0). Application UI/schema/lockfile unchanged. Worker local build ID `tvgDeSrGJF-lHxucvJ_qQ`; hosted Next build ID not exposed/captured, so deployment identities below are authoritative hosted evidence.

All hosted operations used the existing Ohio Free web service and Free PostgreSQL listed above, the same reviewed commit, and retained synthetic Source `5dbf89d3-93a1-4e65-8a42-5d1c2657f76a`. Created at `2026-10-18T04:43:03.562Z`, expiry `2026-10-18T06:43:03.562Z` remained unchanged. Private manifest/owner hash never entered evidence; `/etc/secrets/td01a.json` was staged into a mode-0600 temporary file outside the checkout. Only explicit operator startup commands invoked the probe. All times below UTC (Toronto EDT = UTC minus four hours).

| Check / command or UI action | UTC result | Deployment / runtime evidence | Result |
|---|---|---|---|
| Normal correction deployment | 04:42 | `dep-dba4s1rbc2fs73a2ov4g`, source `c535122`; clean install/build then ordinary startup | PASS |
| `npm run db:probe -- prepare --manifest <private-file>`; `validate` | 04:43:03 / 04:43:04 | Local separate commands PREPARED/0 and VALIDATED/0; no DB access. `artifacts/local/01a-free-host/pm-prepare.log` | PASS |
| Save retained Secret File, ordinary startup | 04:44 | `dep-dba4sqjrjlhs738tr200` Live; no row write yet | PASS |
| Runbook explicit `write-existing` startup | 04:45:17.011 | `dep-dba4tk7btjjs73dq7hng`, instance `fk22w`, WRITTEN then normal app start; `&&` establishes exit 0; Live 04:45:27 | PASS |
| Runbook verify-only startup | 04:46:04.987 | `dep-dba4tvrrjlhs738tv0rg`, instance `k6npg`, VERIFIED then normal app start; Live 04:46:14 | PASS |
| Dashboard Manual Deploy → Restart service, first | 04:46:44.273 verification | Events: Service restarted by you at 00:46 EDT. Same deploy/commit/configuration, new instance `pmq42`, VERIFIED with original ID/expiry, app ready 04:46:48 | PASS |
| Dashboard Manual Deploy → Restart service, second | 04:47:56.676 verification | Events: Service restarted by you at 00:47 EDT. Same deploy/commit/configuration, new instance `j4shh`, VERIFIED with original ID/expiry | PASS |
| Explicit cleanup twice before normal app start | 04:48:47.873 / 04:48:51.886 | `dep-dba4v8nbtjjs73dqdrt0`, `fxk7z`: REMOVED/0 then ALREADY_ABSENT/0; Live 04:48:58 | PASS |
| Verify-only startup after cleanup | 04:49:34.569 | `dep-dba4vkjbc2fs73a34ke0`, `pvlnt`: FAIL/MISSING; host explicitly reports exit status 1 and Deploy failed. Expected negative test, immediately restored | PASS negative check |
| Restore normal start command | Live 04:50:18 | `dep-dba4vstg1s2s73aq2h7g`, ordinary startup only | PASS |
| Remove diagnostic Secret File and redeploy | Live 04:51:41 | `dep-dba505u1egvs739cpn7g`, ordinary startup only. Environment UI confirms no `td01a.json`, DATABASE_URL retained, plan Free | PASS |
| Public reload; direct `Invoke-WebRequest` | HTTP check 04:52:25.873 | HTTP 200 and expected heading; browser shows honest disabled imports and disconnected conversation. Private local test manifest then removed | PASS |

Evidence: ignored `artifacts/local/render-2026-10-18/` files `correction-normal.txt`, `hosted-write.txt`, `hosted-verify-startup.txt`, `restart-events.txt`, `restart-runtime.txt`, `restart-verifications.txt`, `hosted-cleanup.txt`, `hosted-missing.txt`, `normal-start-restored.txt`, `final-restoration.txt`, `final-environment.txt`, `final-http-check.json`, `final-public-shell.png`. Events UI exposes restart timestamps but no separate restart IDs; the two new runtime instance markers and exact verification timestamps distinguish actual restarts from settings deployments. Same fixture and unchanged expiry across all successful verifies. Successful probe exits are established by the chained app start; negative missing exit 1 is directly reported by the host. No provider API use, key exposure, paid upgrade, public diagnostic route or application behavior was added by this PM work.

**Completion:** Step 01 DONE based on clean build/migration, prior physical iPhone evidence, exact real source persistence across actual restarts and preserved server-only boundaries. Full voice/mobile/audio/ingestion behavior is still NOT_RUN. Task 02a issued in `docs/WORKER_TASK_02A.md`; Step 02 remains IN_PROGRESS, with real API calls pending client funding/key and a PM test allocation within the stated $50 total ceiling. No other implementation task is active.

## Blockers and next actions

**18 October PM 02a acceptance:** Reviewed all seven server proof modules, both POST routes, shared DTO, test/script/config changes and boundary document. Checked every worker input hash: zero mismatches. Fresh pinned-runtime `npm test` passed 55/55, exit 0 (`artifacts/local/02a/pm-test.log`); `git diff --check` exit 0. Reviewed actual worker logs/identity for lint, typecheck, schema validation, production build and four browser smoke checks, all exit 0. Exact local build `Tn8hoEcU_zXvKqC_hRHRP`; database/provider mocks and disabled production routes only. No full check rerun beyond the focused suite was needed; no application code changed during PM review.

Provider request/response fields and TTL were cross-checked against the [official client-secret reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create), searched/opened 18 October 2026. Source-scoped admission, signed cookie, source expiry checks, no-store DTOs, timeout/redaction and disabled defaults meet the bounded task acceptance criteria. No blocking defect found. Preserve the documented limitations: all callers share one conservative network bucket; counters reset per process; no live PostgreSQL upsert/race proof or hard spend cap; client-secret TTL does not end an established session.

Accepted implementation committed as `eae9444e520707a427602b88b535feb2b2135686` (commit exit 0). No deployment, live database mutation, OpenAI request, new secret or spending in this PM review. Current hosted source remains `c535122`. Task 02b is dependency-ready for mocked client development while PM live ownership/expiry checks and funding remain open. Its brief explicitly retains those checks before live voice acceptance. Step 02 remains IN_PROGRESS; Steps 03–14 PENDING.

Latest PM gate: Step 01 DONE; 01a and local/mock scope of 02a accepted and closed. Task 02b is the only issued implementation assignment. Older worker reports remain historical evidence, including their then-pending statuses.

- PM provisioning/migration/local live probe are complete. Keep secrets in ignored `.env` and Render environment only. The service uses the provider's internal same-region URL; local verification uses the external URL with certificate verification. No permanent credential was printed or committed.
- Worker returned only the bounded free-host correction in `docs/WORKER_TASK_01A_FREE_HOST.md`; proposed READY_FOR_REVIEW. PM reviews the code/evidence, then configures the retained Secret File and temporary startup, deploys/restarts and restores normal settings per the runbook. No subsequent worker task started.
- Physical-phone shell gate accepted from the user's iPhone report and screenshot. No further human action is needed for this narrow shell-access check; full physical-device workflow/audio coverage remains for later steps.
- OpenAI key and client funding pending; user stated a $50 overall API ceiling (currency unspecified). No purchases or calls now. Supadata/ScrapeCreators credentials and physical Android availability remain unverified. Step 02 live voice and Steps 03–14 remain unproven.
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

## Worker 02a — proposed READY_FOR_REVIEW

**Outcome / boundary:** implemented anonymous ownership, bounded synthetic proof creation/reuse and protected Realtime client-secret issuance with mocked provider/database tests. PM owns acceptance. Step 01 DONE is preserved; Step 02 remains IN_PROGRESS and Steps 03–14 remain PENDING. No WebRTC client, ingestion, UI redesign, account, deployment, live database operation or paid provider request was performed. No other chats were messaged.

**Build identity:** clean arrival on `main`, HEAD `1482d4c2cda18cde3700c39f8a2ea9e898dd0b18` (newer PM documentation preserved). Final working tree dirty; no commit/push. Local production build ID `Tn8hoEcU_zXvKqC_hRHRP`. Changed-file SHA256 inventory and identity are recorded in ignored `artifacts/local/02a/input-files.sha256` and `identity.json`. This is not the deployed revision. No dependencies or lockfile/schema/migrations changed.

**Changed files / behavior:** `src/server/proof/{config,visitor,admission,source,provider,handlers,runtime}.ts` implement pure policies, signed opaque cookies, minimal source services, process-local admission, injectable fetch and runtime wiring. `src/app/api/proof-source/route.ts` and `src/app/api/realtime/client-secret/route.ts` expose only the guarded POST handlers. `src/shared/proof.ts` contains public DTO types. `tests/unit/proof.test.ts` adds policy/handler/provider tests; `package.json` adds the Node `react-server` condition to the existing test command. `tests/smoke/proof-disabled.spec.ts` and `playwright.config.ts` add real disabled-route checks with explicit disabled feature flags. `.env.example`, `docs/TESTING.md`, this tracker and `docs/REALTIME_PROOF_BOUNDARY.md` document configuration, contracts, checks and limitations. Existing UI, DB client, operator probes and all original handoff/step IDs are preserved.

**Contracts and decisions:** see [complete boundary contract and PM procedure](REALTIME_PROOF_BOUNDARY.md). One-hour HMAC-signed random visitor cookie; Secure/HttpOnly/SameSite=Strict, host-only, absolute nonrenewing expiry. Only a domain-separated irreversible marker is stored as owner. A deterministic primary key plus non-updating upsert prevents duplicate source rows per visitor without a schema change. The source contains only fixed clearly synthetic text, not operator-probe content. All POST outcomes are no-store with generic errors. The adapter uses the current `/v1/realtime/client_secrets` contract, configurable explicit model, 60-second TTL, 8-second abort deadline, zero retries and a separate hashed safety identifier. Browser JSON is limited to proof `{id,title,text,expiresAt}` or credential `{clientSecret,expiresAt}`.

**New configuration:** `PROOF_ENABLED=false`, `REALTIME_ISSUANCE_ENABLED=false`, `APP_ORIGIN=http://localhost:3000` (development only; production HTTPS), empty `VISITOR_COOKIE_SECRET` (PM securely supplies 32 random bytes in 64-hex encoding), `OPENAI_REALTIME_MODEL=gpt-realtime` as an example with unverified account access. Existing `OPENAI_API_KEY` and `DATABASE_URL` stay private. No key requested or generated. `.env` was not read or edited; build/Prisma load their usual configuration internally. Verification explicitly forced both feature flags false and supplied an empty OpenAI key in the command environment. The shell/build need no OpenAI credentials; an existing database URL does not imply a database operation.

All final checks ran locally on Windows x64 with checkout-local Node v24.22.0/npm 11.19.1, selected by prepending `.tools/node-v24.22.0-win-x64` to PATH. The initial inherited shell was Node 26.5.0/npm 12.0.1; no acceptance command used that runtime. All timestamps below are UTC on 18 October 2026. Exact fractional timestamps/exit codes are in `artifacts/local/02a/checks.json`; command logs are in that same ignored directory.

| Command/check | UTC start–end | Expected | Observed / exit / result | Evidence |
|---|---|---|---|---|
| `node --version`; `npm --version` with pinned PATH | Runtime capture in `identity.json` | Pinned versions | v24.22.0 / 11.19.1, exit 0 / PASS | `runtime.log`, `identity.json` |
| `npm run lint` | 04:59:03–04:59:49 | No warnings/errors | Exit 0 / PASS | `lint.log` |
| `npm run typecheck` | 04:59:49–05:00:05 | Prisma/type generation and TypeScript pass | Exit 0 / PASS | `typecheck.log` |
| `npm test` | 05:00:05–05:00:08 | Existing tests plus boundary cases pass | 55/55, zero skipped, exit 0 / PASS | `test.log` |
| `npm run db:validate` | 05:00:08–05:00:09 | Existing schema remains valid | Exit 0 / PASS; no database connection | `db-validate.log` |
| `npm run build` | 05:00:09–05:00:17 | Shell and both Node routes compile with no OpenAI key | Exit 0 / PASS, build ID above | `build.log` |
| `npm run test:smoke` | 05:00:17–05:00:23 | Existing disabled shell preserved; new routes safely disabled | 4/4, exit 0 / PASS | `test-smoke.log`; shell screenshots in `test-results/` |
| `git diff --check` | Final identity capture | No whitespace errors | Exit 0 / PASS | `identity.json` |
| Real DB two-visitor ownership/upsert/concurrency/expiry checks | Not run | Actual persisted authorization behavior | NOT_RUN, PM-owned live mutations not authorized | Procedure in boundary document |
| Live OpenAI client-secret/connection/expiry check | Not run | Funded, bounded PM live allocation | NOT_RUN, key/funding pending; no spend | Procedure in boundary document |
| Deployment, physical phone/audio/WebRTC/Stop/text transport | Not run | Actual live/device behavior | NOT_RUN; next task/PM scope | No emulation claim |

**Acceptance / expected–observed mapping:** test names below are in `tests/unit/proof.test.ts`; each named case passed with its expected observation. Counts include 19 named policy subtests.

| Requirement | Test evidence | Expected and observed |
|---|---|---|
| Strong bounded visitor cookie, no client owner trust | `real cookie round-trip is signed, random, bounded, HttpOnly, Strict, host-only and Secure`; `owner injection` subtest | Unique random bearers; exact cookie flags; tamper, wrong key/name, duplicate, invalid encoding, future/expired cookie reject; caller owner input rejected |
| Fixed proof DTO, one active record, restart reuse | `proof reuses one fixed source; two anonymous visitors are isolated; issuance DTO is minimal`; `proof creation concurrency is bounded and deterministic identity survives handler restart` | Same visitor gets same ID/content/expiry; mock has one row per visitor; concurrent same-visitor request is 429; fresh handler still reuses existing mock row |
| Every requested policy rejection precedes provider | `every credential policy rejection makes zero provider calls` (19 subtests); `source expiry during database await prevents provider invocation` | Missing/forged/expired cookie, origin/metadata, malformed/extra/large input, missing/other-owner/expired/pending/failed/non-proof/altered source all reject with zero mint calls; expiry rechecked after await |
| Safe feature/config boundary | `proof config is opt-in, HTTPS in production, and fails closed for missing or public secrets/model`; `disabled/missing config fails before database or provider access` | Missing/disabled/bad config rejects, no store reads or provider calls |
| Bounded admission before provider | `proof rejects arbitrary input/origin and caps creation with spoofed forwarding headers`; `handler issuance visitor and shared-IP limits reject before provider and DB`; `admission bounds global, IP, visitor, lifetime, window and concurrency independently`; `concurrent issuance is bounded; failure releases slots but consumes attempts` | Exact creation, visitor, aggregate network, global, lifetime and concurrent bounds; rejected attempts never invoke provider; spoofed forwarded headers do not bypass; failure releases slots |
| Minimal public credential and verified provider request | `mock HTTP provider uses verified contract, 60-second TTL, safety header, no retry and minimal response`; successful handler test | Explicit configured model/TTL/safety header, fixed HTTPS endpoint, one fetch, only credential/expiry returned; raw session discarded |
| Timeout, failures, late results and cache boundary | `mock HTTP upstream errors, malformed response, long TTL and timeout are redacted without retry`; `database failures and provider timeout stay generic with no-store; expired late issuance is withheld` | Abort/timeout, status/network/JSON/token/expiry failures sanitized; no retry; expired late result withheld; all checked POST failures and successes no-store |
| Default production routes and shell | `production proof endpoints fail closed with no-store when disabled`; existing shell smoke | Real local Next server returns 503/no-store/no cookie and GET 405 at both routes; 1440×1000 and 390×844 shells retain disabled controls/focus/no overflow/no browser errors |

**Mock versus real:** crypto, cookie parsing/serialization, Web Request/Response, fetch-request construction, timeout behavior, Node tests and local production Next/Chromium execution are real. Unit source storage is an in-memory mock and upstream HTTP is an injected mock; they prove neither PostgreSQL authorization nor a working OpenAI session. Production smoke only exercises disabled routes, deliberately preventing database/provider access. Existing operator tests remain mocked as previously documented. `npm ci`/browser installation were unnecessary because dependencies and installed browser did not change. Harmless Playwright NO_COLOR/FORCE_COLOR warnings appeared; no required check failed. An earlier exploratory 53-test run passed before two additional race/error tests; the final 55-test run supersedes it.

**References / review:** official OpenAI client-secret, WebRTC and safety documentation searched and opened 18 October 2026; exact links and consulted version-matched Next.js guides are in `docs/REALTIME_PROOF_BOUNDARY.md`. Applied only relevant Vercel server-boundary rules, OpenAI Docs and selected Playwright guidance; no visual redesign/audit or delegation.

**Remaining limitations / PM actions:** all IPs deliberately share a conservative untrusted-network bucket; no forwarded-IP trust assumption. Issuance is 3/visitor/hour, 10/shared-network/hour, 20/global/hour, 50 attempts per process lifetime, two concurrent globally/one per visitor. Proof has 6/visitor/hour, 20/shared-network/global/hour, 100 attempts per process lifetime and the same concurrency bounds. Fixed-window/process-local counters reset on restart and are not multi-instance controls; cookie clearing creates a new visitor but cannot escape aggregate limits. Expired rows are not deleted. Database operations can occupy slots until the driver completes. Real PostgreSQL upsert/race behavior remains untested. Ephemeral TTL does not end sessions, guarantee single use/source binding or impose the user's $50 spending ceiling. PM must review, deploy/configure securely, run two-browser real DB checks, then only after funding authorize a bounded live provider check, and disable proof/issuance afterward. Physical audio, microphone/Stop lifecycle and genuine text transport are separate future work. Return at this boundary; proposed READY_FOR_REVIEW, never Step 02 DONE.

## Task 02b worker evidence — 18 October 2026

Implemented `/proof/voice` with default-disabled server gating, the existing owned-source/cookie/credential contracts, real WebRTC calls transport and an injected controller tested for Start/Stop races. Proposed **READY_FOR_REVIEW**, not PM acceptance. Step 01 stays DONE; Step 02 stays IN_PROGRESS. Full changed-file list, acceptance mapping, cleanup behavior, exact official-documentation URLs, screenshots and PM-only runbook: [02b handoff](VOICE_PROOF_02B.md).

Identity: branch `main`, HEAD `6f7fcda9d9bbb58b033c62d6b3328b46ca14848c`, dirty working tree; no commit/push/deploy. Local build `H8OefkVNjEG3leIZd2G1D`. Public deployment remains `c535122`. Ignored `artifacts/local/02b/identity.json` and `changed-files.sha256.json` identify the exact dirty files. All acceptance execution used checkout-local Node v24.22.0/npm 11.19.1 via pinned PATH. Database URL was overridden with a synthetic loopback value for CLI checks; no private `.env` value was inspected or used for a connection.

| Actual command | UTC on 18 October 2026 | Exit / observed result | Safe evidence under `artifacts/local/02b/` |
|---|---|---|---|
| `npm run lint` | 05:29:01–05:29:05 | 0 / PASS | `lint-final.log` |
| `npm run typecheck` | 05:29:05–05:29:09 | 0 / PASS | `typecheck-final.log` |
| `npm test` | 05:29:09–05:29:12 | 0 / PASS, 93/93 | `test-final.log` |
| `npm run db:validate` | 05:27:27–05:27:29 | 0 / PASS, schema only | `db-validate.log` |
| `npm run build` | 05:27:29–05:27:36 | 0 / PASS | `build.log` |
| `npm run test:smoke` | 05:27:46–05:27:51 | 0 / PASS, 6/6 at desktop/mobile widths | `test-smoke.log` |
| `npm run test:voice` | 05:28:00–05:28:08 | 0 / PASS, 10/10 at desktop/mobile widths | `test-voice-final.log` |

Exact fractional timestamps and exits, including the initial browser startup failure, are in `checks.json`. Initial isolated browser startup failed from Windows preload-path escaping (exit 1); fixed to forward slashes before the passing run. An exploratory typecheck found recursive inferred mock types; fixed before final checks. The first 85-test run passed; eight further boundary checks brought the final total to 93. Application code did not change after the recorded production build; later changes were tests/config and documentation. Six success/error/ended screenshots were visually inspected; `desktop-*.png` and `mobile-*.png` contain only synthetic source/transcript text. Port teardown check found no listeners on 3100/3101. No retained credential/SDP trace or raw audio.

Mock boundaries: unit DB/provider/media/transport are injected fakes; real local Next production pages and Chromium exercise UI with browser fake media/RTC/audio, intercepted source writes/mints/OpenAI calls, blocked other external HTTP and a server external-fetch blocker. `npm run test:voice` owns port 3101 startup/teardown and supplies synthetic child environment only. Existing smoke still forces both proof flags false on port 3100. No production mock mode, debug endpoint, dependency upgrade or lockfile change. No live API spend, real DB mutation, secret creation, Render configuration change or deployment.

Cleanup covers pending source/permission/mint/offer/local/SDP/body/remote operations, late tracks/events, double Start, explicit retry, autoplay rejection/pending playback, unmount/pagehide, peer failure, 25-second startup deadline and exact 60-second ready-session deadline. Tracks stop, channel/peer close, requests abort, timers/callbacks detach, audio pauses/resets and credential/resource references clear. Native permission prompts cannot be cancelled; late granted tracks are stopped. Browser timers/ephemeral TTL are not provider-enforced spending caps, and client abort cannot undo server work already admitted. Transcript is a bounded diagnostic, not finished Steps 08–09.

**NOT_RUN:** 02a real PostgreSQL ownership/reuse/expiry/concurrency, deployed 02a/02b HTTP, live OpenAI negotiation/response, physical iPhone microphone/playback/Stop, and the separate microphone-free text transport proof. Funding/key absence is expected. PM must review, complete the real DB checks, authorize a bounded funded live test, privately configure/deploy to the existing Free service, verify the lighthouse spoken answer and Stop on phone, then disable proof/issuance. No Step 02 completion or next implementation task is proposed.


## PM acceptance — Task 02b and next assignment

18 October 2026, approximately 05:35–05:41 UTC (01:35–01:41 Toronto). **02b DONE for the assigned local/mock implementation scope**; Step 02 remains IN_PROGRESS. Reviewed source/client/provider changes and unit/browser tests against WORKER_TASK_02B.md. No blocking finding in the assigned scope. Accepted application commit: `716e120aff0823952fd0255f2a86a9877e5c6db6`. Worker report above remains historical evidence of its review submission.

| Check | Build/environment | Observed result |
|---|---|---|
| Runtime, changed-file identity | Local Windows, worker build `H8OefkVNjEG3leIZd2G1D`; pre-review HEAD `6f7fcda` plus worker diff | Node 24.22.0/npm 11.19.1; SHA256 verifier matched all 17 manifest entries, zero mismatches. |
| Fresh PM `npm test` | Same application files, mocked database/provider/media/RTC | 93/93 PASS, exit 0; ignored `artifacts/local/02b/pm-test.log`. |
| Worker verification review | Same build; subsequent changes limited to tests/config/docs | lint/typecheck/schema/build exit 0; smoke 6/6 and voice 10/10 exit 0. Initial Windows preload failure fixed and retained in historical evidence. Reviewed logs/checks; full commands not rerun by PM. |
| Visual inspection | Saved Chromium 390 px mock screenshot | `artifacts/local/02b/mobile-success.png` opened: readable controls/transcript, no horizontal clipping. No new browser run or physical-audio evidence. |
| Source and contract review | Local code and official OpenAI documentation | Stop invalidation precedes cleanup; late media disposed; all 8 pending startup stages tested. Session audio fields and current text/audio transcript naming checked against official sources linked in worker handoff and 02c brief. |
| `git diff --check`; implementation commit | Local git | Both exit 0; application implementation was produced in worker chat. PM made no application changes. |

**Single next worker task:** `docs/WORKER_TASK_02C.md`, microphone-free WebSocket text proof, mocked only. This is dependency-ready preparation while API funding/key are pending, not a waiver of live gates. Earliest unfinished PM check is real PostgreSQL ownership/reuse/concurrency/expiry with injected mint stub and fixture-only cleanup; it does not require API funding. Deployed HTTP authorization and live spoken/text answers remain separate checks. No deployment, live API call, API spend or real database mutation occurred in this review. Public source remains `c535122`. Both hosting plans remain Free.

## Task 02c worker evidence — 18 October 2026

**Implemented; proposed READY_FOR_REVIEW, not PM acceptance.** Added separately gated `/proof/text`, typed question/streamed answer/Stop, a cancellable injected browser WebSocket controller, shared credential mode handling and denial-to-text navigation. Step 01 stays DONE; Step 02 stays IN_PROGRESS; no later step advanced. Full changed-file list, acceptance-to-test map, public DTO/mode contract, official documentation and PM-only procedure: [02c handoff](TEXT_PROOF_02C.md).

Arrival was clean `main`, HEAD `c8a6d19eef43d6ce1c86cbce5318b31407718a3b`, preserving later PM documentation and accepted 02b application `716e120`. Return is dirty, no commit/push/deploy. Final local build **`_rff5qjjMIHVm9LkxqVld`**; public deployment remains `c535122`. Exact changed-file SHA256 inventory, tracked diff hash, runtime, HEAD/build and teardown evidence are in ignored `artifacts/local/02c/{changed-files.sha256.json,identity.json}`. No dependency, package-lock, schema or migration changes.

All commands used checkout-local Node **24.22.0**, npm **11.19.1** via pinned PATH. CLI database validation/build/typecheck used a synthetic loopback URL, not a real DB target. Private `.env` values were not read or edited. Build flags were false and API key overridden empty. Browser servers supply isolated synthetic child environments. No API key requested, paid tool, live provider call, actual database mutation, secret creation, service configuration, deployment or messaging another chat.

| Actual command | UTC start–end, 18 October 2026 | Exit / result | Evidence under `artifacts/local/02c/` |
|---|---|---|---|
| `npm run lint` | 05:48:01–05:48:03 | 0 / PASS | `lint-final.log` |
| `npm run typecheck` | 05:48:03–05:48:06 | 0 / PASS | `typecheck-final.log` |
| `npm test` | 05:48:06–05:48:08 | 0 / 126 of 126 PASS | `test-final.log` |
| `npm run db:validate` | 05:46:57–05:46:58 | 0 / schema PASS; no connection | `db-validate.log` |
| `npm run build` | 05:50:02–05:50:06 | 0 / PASS, final build above | `build-verified.log` |
| `npm run test:smoke` | 05:50:06–05:50:10 | 0 / 8 of 8 PASS | `test-smoke-verified.log` |
| `npm run test:voice` | 05:50:10–05:50:16 | 0 / 10 of 10 PASS | `test-voice-verified.log` |
| `npm run test:text` | 05:50:16–05:50:24 | 0 / 10 of 10 PASS | `test-text-verified.log` |

Exact fractional timestamps/exits and prior runs are in `checks.json`. Initial exploratory typecheck literal inference and config-fixture expectation were fixed before these passes. First text browser run was 8/10, exit 1: validation locator also matched Next's route announcer; fixed test selector, retained historical log. Whitespace-only EOF cleanup preceded the final build/browser run; no application behavior changed after the passing unit/type/lint checks. `git diff --check` passes after that cleanup.

Acceptance summary: new server tests prove explicit gate, strict allowlist, voice-default compatibility, fixed text-only session, minimal model DTO, shared alternating-mode quota/concurrency, ownership/expiry; existing 02a checks remain passing. Socket tests cover real event shapes, readiness, finals/deltas/identity, duplicate Start/Send, follow-up, bounded validation/retention, source/mint/connecting/answer Stop, old callbacks, retry/dispose, three deadlines, expired credentials and source/mint 401/403/404/429/503. Browser checks cover default off/no automatic requests, absent/denied media, keyboard send/busy controls/focus/390 px overflow, synthetic streamed/final success, Stop/retry/error/pagehide/navigation. All are mocks except real local Next/Chromium, request validation/crypto and execution itself.

Browser isolation: port 3102, both proof POSTs intercepted; all external HTTP blocked; all real WebSockets routed to close plus an injected fake constructor; no peer/audio/media construction in text. Synthetic-only server config and existing preload block upstream fetch. Voice remains isolated on 3101; smoke 3100 keeps existing false flags and explicitly false text flag. Trace/video disabled; only six deliberate synthetic screenshots under `artifacts/local/02c/`: desktop/mobile success/error/ended. All six visually inspected: readable, no clipping. Playwright teardown left no listeners on 3100/3101/3102. No retained credential or handshake trace. Mobile viewport is not a physical-phone proof.

Official OpenAI WebSocket, client-secret, conversations and server-event contracts rechecked **18 October 2026**, with exact URLs in the handoff. Session configuration preserves configured model/source/256-token output bound/60-second TTL; text output with null turn detection. Browser credential is a sensitive subprotocol, never URL/log/DOM/storage. Only text credential JSON adds validated non-secret `model`; no configuration object crosses the boundary. Both modes retain shared process-local admission. Client cleanup/TTL are not spending caps, and cancellation cannot reverse admitted server work. No cross-tab coordination or production conversation history.

**PM-only NOT_RUN:** 02a real PostgreSQL two-visitor/reuse/concurrency/ownership/expiry checks first (provider stub, fixture-only cleanup); deployed authorization; funded bounded live text answer/follow-up and physical-phone microphone-denied/Stop/navigation; separate 02b spoken answer/Stop. PM owns secrets, funding, deployment and acceptance. After authorized live checks, disable text/proof/issuance flags. No API funding allocation is implied by the stated $50 overall ceiling. Stop at this task, proposed READY_FOR_REVIEW; do not mark Step 02 DONE.
