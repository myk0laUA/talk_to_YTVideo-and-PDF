# Task 10E — real local application check

**READY_FOR_REVIEW — partially completed; live acceptance BLOCKED at credential preflight.** Existing ignored `.env` has the database URL and OpenAI server key, but no `VISITOR_COOKIE_SECRET`; the inherited process also has no signing secret. Task 10E permits only existing credentials. No secret was generated, substituted, printed or written. The actual owned upload/text configuration requires that secret, so the worker stopped before upload or provider acquisition. This is a configuration prerequisite, not an observed adapter failure. PM owns resolution and acceptance; original Steps 02/07/10 remain open.

Arrival: clean `main`, HEAD **`f5e02a03f0544773697b767db1dd906f89f98d41`**. Delivery: same HEAD, dirty/uncommitted documentation only. New local application build **`G9m5MN0-jgjCbrVDV-c7v`**, Node **24.22.0**, npm **11.19.1**. No commit, push, deployment, migration, database query/mutation or application correction. The 10D injected-provider and 07F protocol evidence remain separate; neither proves this live application flow.

Changed files: this report, `PROJECT_STATE.md` and `TESTING.md`. Scripts, PDF, screenshots and evidence are ignored under `artifacts/local/10e/`. `changed-files.sha256.json` identifies the three delivery files; `audit.json` checks protected inputs, unchanged build inputs, private files, links, whitespace and shutdown. No runtime/dependency/lock/schema/original handoff edit.

## Verification

Commands used `.tools/node-v24.22.0-win-x64/node.exe`; npm used its adjacent `node_modules/npm/bin/npm-cli.js`. Exact instrumented UTC/exits/cwd are in `commands.jsonl`. The initial uninstrumented failure is separately retained in `initial-preflight-attempt.json`; its exact UTC was not captured.

| Check / command | UTC on 20 October 2026 | Expected / observed | Result / exit | Evidence under artifacts/local/10e |
| --- | --- | --- | --- | --- |
| `node artifacts/local/10e/setup.mjs` → `npm run build` | 21:18:48.095–21:19:34.562 | Actual tracked application built without `.env`, real credentials or reachable DB | PASS / 0 | `build.log`, `baseline.json` |
| Bundled Python `artifacts/local/10e/author.py`; bundled Poppler `pdftoppm -scale-to 900 -png artifacts/local/10e/lantern-garden.pdf artifacts/local/10e/fixture` | Command UTC uninstrumented; artifact timestamps in audit | Three authored pages; strict independent pypdf extraction; all three renders visually inspected, legible/no clipping | PASS / both 0 | `fixture.json`, PDF, `fixture-{1,2,3}.png` |
| Initial `node artifacts/local/10e/live.mjs` | Exact UTC uninstrumented, before logged preflight | Stopped at missing signing secret, before server/browser/upload/provider acquisition | BLOCKED / 1 | `initial-preflight-attempt.json`; later runner code UNEXECUTED |
| `node artifacts/local/10e/preflight.mjs` | 21:22:05.494–21:22:05.580 | Database/key present; signing secret absent; original text gate off | BLOCKED / 1 | `preflight.json`, `preflight.log` |
| `node artifacts/local/10e/disabled.mjs` | 21:22:05.582–21:22:07.813 | Real unavailable UI; four routes503/no-store; browser external requests0; private files unchanged; browser/server closed and port rebound | PASS / 0, 11 checks | `disabled-results.json`, `default-disabled.yml`, `default-disabled.png` |
| `node artifacts/local/10e/contracts.mjs` | Exact UTC in ledger | Current official model/pricing Markdown fetched, both HTTP200 | PASS / 0 | `contracts.json`, `official-{mini,pricing}.md` |
| `node artifacts/local/10e/audit.mjs` | Exact UTC in ledger | 462protected tracked files unchanged; 464original build inputs match; 88links valid; private files unchanged; no owned listener/process | PASS / 0 | `audit.json`, `changed-files.sha256.json` |

Build used a fresh tracked-file copy at `artifacts/local/10e/application`, reused dependency junction, empty real credentials, unusable loopback database and existing build-only network guard. The disabled production server used **no preload, provider/Prisma injection, interception, seeded endpoint or developer protocol harness**. It read existing private settings into its child environment without rewriting `.env`, bound only `127.0.0.1:3130` and retained the original absent/off text gate. A fresh Chromium156.0.8078.4 context observed the real application. Next emitted a multiple-lockfile workspace-root warning; build passed. Poppler emitted optional-font warnings; the used Helvetica text rendered legibly on all pages. Neither warning is hidden or presented as a product fix.

Disabled matrix: `POST /api/text-sessions`, `POST /api/text-sessions/question`, `POST /api/text-sessions/stop`, `GET /api/text-sessions/{fresh UUID}/stream`: **503 / cache-control:no-store** for all. Start, composer and Send unavailable in the inspected screenshot. Server103620 ended on explicit SIGTERM (`code:null`, `signal:SIGTERM`); owned-port rebind passed. Browser/context closed. No enabled process or provider socket had been created; this shutdown check does not prove live-session cleanup.

## Fixture and acceptance mapping

Deterministic invented3page fixture: **3,022bytes**, PDF SHA256 **`a593fb961f3a9bfa7775df5433ba8443dc9df45ff05d3d47c3131433dd1be7e8`**. First predetermined question asks for project codename/recorder(page1); second follows the same project to tile inventory(page2) and delivery location/time(page3). Exact synthetic facts/questions/expected answers and independent page extraction remain only in ignored `fixture.json`. No private document. Source ID/stored-source hash/application-preview hash: **NOT_AVAILABLE**, because no upload occurred. No answer correctness assertion.

| Task10E criterion | Evidence / disposition |
| --- | --- |
| 1. Identity, pinned runtime, pricing, private process-only setup | Build/identity/rates verified. Existing signing-secret prerequisite BLOCKED enabled process before upload. |
| 2. Authored multi-page PDF, actual parser/repository upload and complete preview | Authoring/independent extraction/raster review PASS. Actual application parsing/storage/preview NOT_RUN. |
| 3. Actual source ACK readiness, two streamed accurate answers/follow-up | NOT_RUN; no source/session acquired. Earlier synthetic/protocol successes are not substitutes. |
| 4. Same-origin high-level stream, credentials/media boundary, Stop retaining2+2/preview, provider cleanup/normal delete | NOT_RUN for live session. No source existed to remove; other visitors untouched. Disabled browser external requests0 does not prove active text media/security behavior. |
| 5. Shutdown/default-disabled UI/routes/private-file preservation | PASS for the only server/profile created, plus final preservation/shutdown audit. Enabled overrides never installed. |
| 6. UTC/model/attempt/usage/cost accounting | Exact mini/structuredB/512output/minimal/text-only policy inspected. **0sessions/0responses/0uploads/0provider acquisitions**. Actual tokens/charge unavailable; dashboard unconnected, no observer added. |

Official [mini model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) and [pricing](https://developers.openai.com/api/docs/pricing) pages were searched/opened before the attempted live check. Text rates remain **US$0.60/M input, US$0.06/M cached input, US$2.40/M output**. US$0.25 allocation/session limits unused. Prior recorded project estimate remains **US$0.00638484**; actual cumulative billing unreconciled. No new measured usage or actual zero-charge claim. Connected browser inventory had no dashboard tabs; no login/purchase/credit change.

## PM handoff

Resolve the missing signing secret privately for the intended process/database, or explicitly authorize a different secret-provisioning scope, before reassigning this bounded check. Do not copy synthetic signing secrets from tests. Preserve real `.env` and default-disabled/public gates. No evidence warrants deployment or compatibility changes.

Resume with the authored fixture and [10D PM procedure](OWNED_TEXT_INTEGRATION_10D.md#pm-runbook--bounded-real-application-check-not_run-by-worker), applying10E's predetermined questions,45second response deadlines, explicit Stop, normal test-owned delete and disabled verification. Review actual answers against beginning/middle/end facts; retain synthetic Q/A and numeric usage only. Second session still requires the concrete failure/correction or evidence gap permitted by the brief. Ignored `live.mjs` is preflight-only attempted evidence, not a verified reusable live harness.

No lint/typecheck/full-unit/affected synthetic suite rerun: runtime did not change, and10E permits evidence-only work without repetition. Fresh build/narrow disabled checks are new evidence. Phone/WebRTC, hosted live text, live YouTube acquisition, full evaluation and live application Stop/removal **NOT_RUN**. No later task started. PM decides acceptance; proposed **READY_FOR_REVIEW** with live prerequisite blocker.
