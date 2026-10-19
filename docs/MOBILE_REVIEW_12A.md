# Task 12A — local mobile usability and accessibility review

**Current PM12A review:** bounded local mobile/accessibility review accepted in `8af058e`; build `R_ixIZMDu1UXwpkBpA8ws`, all eight hashes matched. Fresh PM smoke16/source75/transcript32 PASS. Three reproduced fixes accepted; physical-phone/audio and full live gates remain open. Next single task: `docs/WORKER_TASK_13A.md`, clean-checkout verification and accurate reviewer instructions without keys. No deployment/spending. Older summaries below are historical.

Proposed **READY_FOR_REVIEW** for the bounded local task only. PM owns acceptance. Full Step 12 remains **IN_PROGRESS**; enabled, grounded physical-phone workflows are still required. No deployment, provisioning, shared database, paid call or live credential use occurred.

## Identity and boundaries

- Arrival: clean `main`, HEAD/base `aadea364c77c804e3c27b9c0b5d18edf1078f319`; accepted prior application `29aea9f`, historical PM build `RegFAc7qjDORKrhT0rWKn` retained.
- Delivery: dirty working tree, no commit or push. Baseline rebuilt locally as `xRpKtvgxLfVGGaEJbGAUR`; final production build **`R_ixIZMDu1UXwpkBpA8ws`**. Before observations use the baseline rebuild; corrected observations and browser regressions use the final build. No product edits after that final build.
- Checks use ignored `.tools/node-v24.22.0-win-x64` Node **24.22.0** / npm **11.19.1**. Initial shell discovery was Node26.5.0/npm12.0.1; those were not used for application verification. Playwright Test **1.64.1**, Chromium **156.0.8078.4**. Windows desktop viewport emulation only.
- Environment: unusable loopback `DATABASE_URL`, empty provider/public credential variables, generated temporary signing material, disabled production gates, existing server network blockers. No `.env` values were printed or used for live requests. No schema, dependency, lockfile, auth, context admission, factory, transport or lifecycle changes.
- Production: `http://127.0.0.1:3122/?fixture=voice&scenario=success`, no source, unavailable genuine-source conversation, inert query. Source UI: actual built page at `http://127.0.0.1:3107`, scripted source responses for supplementary inspection; existing source suite also exercises actual PDF extraction with synthetic Prisma. Composed fixture: separate test-only webpack bundle at `http://127.0.0.1:3121`, existing `tests/mode-switch/harness.tsx` and actual controllers/components, positive admission and transport/media/playback simulated. No new application entry or URL switch.
- Selected skills: project Impeccable4.6.0 focused adapt/harden (context launcher succeeded; historical PRODUCT/DESIGN claims defer to PROJECT_STATE), web-design-guidelines1.0.0, Playwright CLI0.1.22, React best-practices1.0.0 for the ref/focus change. Current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) were fetched on19October2026UTC. One consolidated scoped review; no redesign or new skill/dependency.

## Three reproduced findings and minimal fixes

| Finding / location | Failing-before observation | Change / corrected evidence |
|---|---|---|
| `src/app/globals.css:23`, `:53` — enlarged production heading/navigation overflow | 320px width, `document.documentElement.style.fontSize = "200%"`: document scrollWidth493px; Conversation link right369.67px. `before-observations.json`, `before-production-320-text200.png`. | Allow heading words and navigation rows to wrap. Final document width equals viewport at320/390/430/1440; required links fit and remain keyboard reachable. `after-production-320-text200.png`, review matrix, focused smoke regression. No overflow clipping workaround. |
| `src/app/globals.css:96` — sticky transcript navigation obscures reading | At320×400 and200% root font, toolbar height504.75px, top0: it covers the entire reading viewport. `before-transcript-320-text200-height400.png`. | At viewport heights≤600 CSSpx, navigation stays in normal page flow. On taller viewports it retains existing sticky behavior. In the same short/enlarged case it scrolls above the passage; incoming text preserves the reading anchor; keyboard Jump still focuses latest. `after-transcript-320-text200-height400.png`, focused existing transcript-suite regression. No transcript/controller/listener change. |
| `src/app/source-workspace.tsx:34`, `:90`, `:94` — Keep source loses keyboard focus | Open Remove confirmation, keyboard-activate Keep source; activeElement becomes BODY. `before-observations.json`, `before-keep-source.png` (DOM observation proves focus loss). | Store the existing Remove button ref and restore focus on explicit Keep source. No effect, automatic focus on streaming, or removal/request behavior changes. After keyboard activation, Remove is focused with3px outline. `after-keep-source-320.png`, source-suite focused assertion. |

All artifact paths in this report are relative to ignored `artifacts/local/12a/` unless specified. Before and after images were opened and visually inspected. Three fixes reached the task ceiling; no later implementation task was started.

## Reviewed state and width matrix

Supplementary existing-fixture review ran **104 geometry/state observations in12 fresh contexts**: each row below at320,390,430 and1440 CSSpx. Normal heights800px (desktop production/source1000px); reduced height400px. Detailed state/URL/width/height/geometry is in `review-matrix.json`. The new local-only command is **`node artifacts/local/12a/review.mjs`**; it supplements the established suites and is not a package script or production fixture.

| Surface / state | 320 | 390 | 430 | Desktop1440 | Evidence boundary |
|---|---|---|---|---|---|
| No source; unavailable text/voice; query cannot enable a session | PASS | PASS | PASS | PASS | Actual built production, default gates off |
| Ready source, long unbroken filename/title, complete eight-page preview; close/return; Keep source | PASS | PASS | PASS | PASS | Actual SourceWorkspace, scripted HTTP responses; established75-case source suite separately covers actual12-page/384-line parsing |
| Text idle, connecting/priming, multiline/unbroken draft, pending receipt, partial and long text, authored error/fresh Start | PASS | PASS | PASS | PASS | Existing composed synthetic adapters with actual lifecycle/priming/transcript components |
| Voice idle, connecting/priming, active, muted, generated answer, playback blocked/retry, explicit Stop | PASS | PASS | PASS | PASS | Simulated tracks/transport/playback; no sound or native acquisition |
| Offline stop, retained received text, online recovery requiring explicit fresh Start | PASS | PASS | PASS | PASS | Scripted navigator.onLine plus offline/online events; existing recovery suite separately covers pending boundaries |
| 200% root text; long content reflow; reduced available height | PASS | PASS | PASS | PASS | Browser DOM root font-size200%, setViewportSize(height400); viewport simulation, no real keyboard |
| Keyboard Start, Mute, speaker enable/retry, Stop, Jump; stable focus and earlier reading position during incoming text | PASS | PASS | PASS | PASS | Actual Tab traversal and Enter; computed focus outline3px; source skip-link/nav desktop pass separately |

Precisely, supplemental scaling sets `document.documentElement.style.fontSize="200%"`; this enlarges inherited control text and rem-based typography/spacing. It is not browser-toolbar zoom or OS text scaling. Established transcript/voice/text/mode/recovery suites retain their separately authored CSS `zoom=2` and/or root/body200% tests. Reducing viewport height simulates available space only. No physical mobile keyboard, Safari, Android, audible output or screen-reader session was tested.

To distinguish connection establishment from source priming, an additional **eight held-connection states in four fresh contexts** use the existing `hold-connection` scenarios at all four widths. Exact displayed text is captured in `connecting-matrix.json`; voice shows Preparing the connection and text shows Connecting. Console/page errors, external attempts and native access are0. `node artifacts/local/12a/connect-review.mjs` is a second explicitly local-only supplementary command. `after-voice430-connecting.png` was also visually inspected. Total supplementary coverage is112state observations/16contexts; the original104-row file remains unchanged.

Actions keep native semantic buttons/links/labels. Selected mode has `aria-pressed` and explanatory text; disabled and pending controls have authored guidance; errors provide recovery instructions beyond color. Source replacement/removal, one source/conversation and fresh-session history/draft clearing policies remain explicit. Streamed text list remains `aria-live="off"`, with one bounded transcript summary; deltas do not repeatedly announce full answer text. The first transition to unread intentionally announces Updates below once. Source preview has ordinary page scrolling, close returns focus, and transcript scroll-up/Jump/follow behavior is retained. Existing lifecycle suites verify cleanup, no automatic start/send/retry and one owner.

## Commands and observed results

Exact UTC starts/ends/exits, including failed supplementary attempts, are in `commands.jsonl`. `run.ps1` records the safe environment and commands; all are local, scripted/synthetic boundaries as above. Required npm script names were confirmed unchanged in package.json. All eight required browser suites are run because shared CSS changed; none is omitted. Expected result is exit0 with the stated assertions passing. Original PM/worker evidence identities are retained; pre-existing ignored evidence directories were copied to `prior-evidence/` before runner output was refreshed.

| Exact command | UTC start–end (2026-10-19) | Observed | Status / exit | Evidence under12a |
|---|---|---|---|---|
| `npm run build` | 04:06:57.1348544Z–04:07:03.0668874Z | Baseline rebuild xRpKtvgxLfVGGaEJbGAUR | PASS/0 | commands.jsonl; baseline log overwritten (explicit gap) |
| `npm run browser:install` | 04:08:50.8657584Z–04:08:51.5297168Z | Browser install command passed | PASS/0 | browser-install.log |
| `npm run lint` | 04:10:19.3143158Z–04:10:24.9470457Z | No errors | PASS/0 | lint.log |
| `npm run typecheck` | 04:10:48.9747696Z–04:10:53.4198749Z | No errors | PASS/0 | typecheck.log |
| `npm run test` | 04:10:59.2778368Z–04:11:02.6952631Z | 952 units | PASS/0 | test.log |
| `npm run build` | 04:11:03.2013226Z–04:11:13.1659800Z | Final production build | PASS/0 | build.log |
| `node artifacts/local/12a/review.mjs` | 04:12:41.1302445Z–04:12:52.1924121Z | Review-tool failure; see retained attempts | FAIL/1 | review-attempt1.log / .json |
| `node artifacts/local/12a/review.mjs` | 04:13:05.4613512Z–04:13:37.6020578Z | Review-tool failure; see retained attempts | FAIL/1 | review-attempt2.json |
| `node artifacts/local/12a/review.mjs` | 04:13:45.2509980Z–04:13:51.6938324Z | 104 observations /12 contexts | PASS/0 | review.log |
| `npm run test:smoke` | 04:14:10.9628429Z–04:14:15.6065801Z | 16 browser cases | PASS/0 | test-smoke.log |
| `npm run test:source-ui` | 04:14:16.0795847Z–04:14:58.6727642Z | 75 browser cases | PASS/0 | test-source-ui.log |
| `npm run test:youtube-ui` | 04:14:59.1185058Z–04:15:31.8849290Z | 99 browser cases | PASS/0 | test-youtube-ui.log |
| `npm run test:transcript-view` | 04:15:32.3566007Z–04:15:43.7814896Z | 32 browser cases | PASS/0 | test-transcript-view.log |
| `npm run test:text-session` | 04:15:44.2773664Z–04:16:12.7895653Z | 92 browser cases | PASS/0 | test-text-session.log |
| `npm run test:voice-session` | 04:16:13.3047177Z–04:17:18.4326814Z | 208 browser cases | PASS/0 | test-voice-session.log |
| `npm run test:mode-switch` | 04:17:18.9284372Z–04:18:49.0675887Z | 155 pass /1 fixture load timeout; ERR_NO_BUFFER_SPACE | FAIL/1 | test-mode-switch-first-failure.log; mode-first-failure/ |
| `npm run test:recovery` | 04:18:49.5266103Z–04:20:35.9750436Z | 248 browser cases | PASS/0 | test-recovery.log |
| `npm run test:mode-switch` | 04:19:45.0336319Z–04:20:58.9797360Z | 156 browser cases | PASS/0 | test-mode-switch.log |
| `node artifacts/local/12a/connect-review.mjs` | 04:21:37.5464639Z–04:21:39.9456209Z | 8 held-connection states /4 contexts; zero native/external/errors | PASS/0 | connect-review.log |

Production exclusion is checked by the existing composed runners: emitted JS/JSON and route manifests contain no positive fixture/factory markers or fixture routes, test paths return404, and query parameters cannot activate conversation. Supplementary `review-mode/identity-audit.json` inspected188JS/JSON files, provider calls0; source reviewer `review-source/integration-boundaries.json` reports forbidden external requests0 and port released. Final regression reports retain their own exact builds/timestamps. All12 supplementary contexts report pageerrors0, console errors0, external attempts0 and native microphone/peer/socket/audio access0 in `review-matrix.json`. Source API requests in the scripted review are intentionally intercepted; their success is not database/provider evidence.

Final evidence command: `node artifacts/local/12a/finalize.mjs`, PASS/exit0; exact UTC interval in `final-audit-command.json`. It verifies all required final command exits, eight changed files, unchanged package/lock/server/shared/lifecycle/controller/fixture-entry code, no application/test/script changes between accepted29aea9f and arrival HEAD, and successful rebind of all13 checked local ports. SHA256 of unchanged package-lock.json: `8298d67c21966e2e71103e3b773e1b54f491817364c54887302b99d65032abc8`. `git diff --check` passes; line-ending normalization warnings are informational. The audit command does not run further product tests or contact a service.

Development/setup failures retained:

- Node REPL importing top-level Playwright failed twice with module-default-export errors; no browser interaction occurred there. Exact start/end/exit are unavailable for those tool errors. Verification moved to the installed CLI and standalone pinned Node with `@playwright/test`.
- First standalone probe imported top-level `playwright`, which resolved to a different installed alpha version expecting absent revision1247; shell exit1, exact UTC interval not separately captured. `npm run browser:install` exited0. Explicit `@playwright/test` resolves the locked1.64.1/revision1248 already installed. No dependency/lockfile change or alternative browser result was substituted. The corrected probe passed and saved before observations at04:09:05UTC.
- Supplementary review attempt1 exited1 because its announcement equality incorrectly rejected the intended first Updates below transition. Attempt2 exited1 because a fixture-only select was hidden in collapsed Fixture controls. Only the ignored review script changed: compare stable turn-summary content and select the fixture scenario explicitly with force. `review-attempt1.json/.log`, `review-attempt2.json`; final104-row run passes. No product fix was made to suppress an intended announcement or expose fixture controls. The baseline build log filename was reused by the final build; its original command timing/build ID are retained, but that baseline log is not presented as an independent retained log.
- First mode-switch regression:155PASS/1FAIL, tablet rapid-switch case timed out in beforeEach before any product action. Its trace records `/fixture.js` failing with **`net::ERR_NO_BUFFER_SPACE`**, leaving no rendered main; the afterEach missing-main assertion also fails. Exact request timestamp04:18:13.913UTC and failed run interval are retained in `mode-first-failure/trace-summary.json`, complete trace/browser report and `test-mode-switch-first-failure.log`. This is a fixture-resource loading failure, not evidence that the rapid-switch product behavior passed in that attempt. No timeout/config/test/product change was made; the exact existing command is rerun on the same final build, with both results retained.
- The unchanged-command mode-switch rerun passes156/156; recovery passes248/248. All required final checks pass. The fixture loading failure above remains a recorded local runner limitation; it was not removed from the command ledger or hidden by configured retries.

## Acceptance mapping and remaining gates

| 12A criterion | Supporting evidence / status |
|---|---|
| 1. Target widths, desktop keyboard, requested states |104-row supplementary matrix plus8 held-connection observations,16 contexts total, seven composed/source regressions; production and synthetic boundaries explicitly separated. PASS locally. |
| 2. Overflow, long text/drafts,200% mechanism | Wrapped production header/nav, long filename/title/preview/transcript/draft matrix, focused smoke assertions, stated root-font/CSS zoom mechanisms; required controls fit. PASS for tested mechanisms. |
| 3. Keyboard/names/status/focus/explicit history and controls | Tab/Enter checks including Start/Mute/Stop/tap-to-play and Jump,3px focus, Keep source regression; existing pressed/disabled/status text and live-summary checks. PASS scripted/semantic review; actual screen reader/audio NOT_RUN. |
| 4. Scrolling, one owner, explicit recovery | Source final-page/return; short-height earlier anchor retained; Jump/latest focus and streaming focus retained; existing full ownership/recovery/cleanup suites. PASS local/scripted. |
| 5.≤3 reproduced fixes, before/final evidence | Three findings table, baseline JSON/screenshots, final-build images and focused assertions in existing suites. PASS; no new broad test framework. |
| 6. Production gates/live gates retained | Separate built production tests/query404/marker scans, factories unchanged, zero native/provider calls; public03eb7d8/PDF-only unchanged. Full Step12 remains IN_PROGRESS. |

Later PM/user check, **NOT_RUN here**: on the enabled grounded HTTPS deployment, record build, device, OS and browser versions for actual iOS Safari and Android Chrome. Import/replace/remove a source, inspect first/final preview passages, open the actual keyboard and send a multiline question; start voice, mute, interrupt a spoken answer, test playback recovery, deny microphone and use genuine text fallback; lose/recover connectivity and explicitly restart. Record audible outcomes and failures separately. Missing live keys/accounting/grounding/public integration, real phone/browser/audio, actual persisted BFCache, SQL cleanup/scheduling and other original gates remain open. This local review does not waive them and requires no user key/phone action to be reviewable.

Changed-file SHA256 and base/build/runtime/dirty identity: `changed-files.sha256.json`, `identity.json` under12a; manifest is generated after final documentation edits so it does not contain itself. PM should verify hashes, review these three fixes and evidence, then decide acceptance. No next assignment is proposed by the worker.
