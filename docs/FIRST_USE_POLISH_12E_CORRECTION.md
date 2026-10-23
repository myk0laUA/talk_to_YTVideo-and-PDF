# Task12E continuation — F05 status clipping

**READY_FOR_REVIEW.** F05 is corrected and the targeted rendered regression passes. PM acceptance remains separate. This continuation makes one product change: the first-start status rule wins over the general loaded-workspace status cap. Welcome/import composition, centered idle start, full status wording, controllers, backend, models, limits and themes are unchanged. No deployment or later-task advancement.

Local main HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, with accepted dirty work preserved. Baseline build `MjvI85J5WVXbfrEnWKCkx`; corrected production build **`wJ_EUQCGyDbjGCabxha5E`**. Node **24.22.0**, npm **11.19.1**. Completed22October2026 Toronto time (command timestamps are23October UTC).

## Correction and scope

In `src/app/globals.css`, change `.text-start .text-session-status` to `.has-source .text-start .text-session-status`. Its existing `max-height:none; overflow:visible` now has greater specificity than the later `.has-source .text-session-status` cap. No `!important`, global status reset, text removal or truncation. Normal active text/voice status constraints and the existing small-height/viewport-constrained natural-flow fallback remain intact.

Added `scripts/verify-ui-12e-correction.mjs`, reusing the existing isolated12E UI/adapters. The four text-regression support files only redirect output from `artifacts/local/12e/regression/10b` to `artifacts/local/12e-correction/regression/10b`: `scripts/verify-text-session.mjs`, `playwright.text-session.config.ts`, `tests/text-session/prepare.ts`, and `tests/text-session/text-session.spec.ts`. Assertions and production runtime are unchanged by that redirection.

All new output is under ignored `artifacts/local/12e-correction/`. Prior12E evidence is intact: **2450/2450 evidence hashes match**, and the other four12E product files match their previous hashes. The previous report, manifest, captures and logs are not rewritten. PROJECT_STATE/TESTING receive new entries above historical evidence.

Applied local Impeccable polish guidance to the narrow cascade defect, adapt guidance to the specified viewport/text-size matrix, and harden guidance to complete recovery copy and reachable actions. Read craft-floor immediately before the CSS edit. Existing Taste composition is preserved. Context was already loaded once in this conversation; no repeated art-direction, audit, reviewer-score or design-system cycle. The active Impeccable hook reported no deterministic issue for the CSS edit.

## Rendered regression and acceptance mapping

The new assertion requires the exact existing pending/failure text. It compares `scrollHeight` with `clientHeight`, measures actual text-line rectangles with a DOM Range, checks clipping bounds through ancestors, rejects overlap with the heading/action, checks normal-viewport reachability, and hit-tests the action after scrolling it into view. Horizontal overflow is also rejected. A merely visible element does not pass this check when its text is clipped.

| Criterion | Evidence and result |
| --- | --- |
| Detect the original defect | Real pre-fix run `before` exits1: **12/16 status checks fail**. Both pending and failed states fail at390/768/1440 in each theme.320px/200% natural flow already passes. Preserved baseline CSS with settled voice fixtures reproduces the same12failures. |
| Complete status and recovery copy | Final `after-settled` exits0: **16/16 status geometry checks pass** across eight viewport/theme scenarios. No nested status scrolling, clipped line, overlap or unreachable action detected. |
| Measured example |390px light: both pending/failure previously had51px content inside42px available height (`max-height:25%; overflow:auto`). Corrected:51px content/51px available (`max-height:none; overflow:visible`). Full wording is unchanged. |
| Viewport and reflow coverage |390×844,768×1024 and1440×900 in light/dark;320×600 with200% root font size in light/dark. Normal captures use viewport screenshots. Only the intentionally flowing320px/200% cases use full-page capture. |
| Idle and explicit readiness | At all six normal sizes/themes the single idle Start chat remains centered, at least52px high and inside the first viewport. Double Enter starts once; initial composer is hidden. Explicit retry/readiness exposes an editable composer and focuses it in all eight scenarios. No automatic start after import. |
| Active text dock/scroll | Six normal cases render a long synthetic answer, scroll the transcript180px, retain that position through two theme toggles, and keep the dock below the transcript and inside the viewport. Geometry and scroll position exactly match the settled baseline. |
| Voice preservation | Wait for actual fixture microphone readiness, render the synthetic completed exchange, then compare transcript/dock/status/button geometry and relevant styles with the baseline. All six normal cases match exactly. No voice product code changed. |
| Focused existing regression | `npm run test:text-session`:108passed, exit0, on corrected production build. Includes lifecycle/receipt/retry/draft/reset/scroll/production exclusion checks with synthetic boundaries. |

The first corrected run stopped on a **test synchronization defect**, not a product regression: a baseline voice snapshot had been measured before microphone readiness and React rendering settled. The baseline status was visible and controls hidden, whereas the corrected snapshot was ready. The harness now waits for the visible Mute microphone control, Listening state and two rendered transcript turns before measurement. Initial files/logs remain untouched; `before-settled` uses the preserved original CSS, and `after-settled` uses current CSS. This rerun resolves a failing verification step within the same targeted correction batch; it does not introduce another design correction. The initial harness is retained as `initial-harness.mjs` for traceability.

`before/results.json` names the original build and CSS. `before-settled/results.json` names the then-current build but explicitly records `cssOrigin: artifacts/local/12e-correction/prior-files/globals.css`; it is a controlled baseline-CSS fixture, not the corrected production app. Both baseline CSS hashes are `e9e4a7b6178aa353938aa57f68dce39280eb9e55b65622e4e92ffc0adffff773`. Final CSS is `b1314a852aa5f6523050b1fb68d2457ddf1a3db3de5c10f4e59ed0dfb69b69b3`. All fixture JS bundles retain SHA256 `f89ec1cc5ca38381f0e6ca4e210821938067ee7d71eb1fd07e4d654be0f2b4db`, supporting the CSS-only product boundary.

## Screenshots

Final34PNGs comprise16pending/failed states plus six each of idle, active text scroll and active voice. All six final contact sheets were opened, covering every final capture, with full-size mobile pending, tablet failure and320px/200% failure inspected separately. Pre-fix mobile failure and tablet pending were also opened full-size. No new visual defect was found in this targeted inspection.

| State | Before | After |
| --- | --- | --- |
| Failed start, dark390 | [Clipped](../artifacts/local/12e-correction/before/failed-dark-390.png) | [Complete copy](../artifacts/local/12e-correction/after-settled/failed-dark-390.png) |
| Pending start, light768 | [Clipped](../artifacts/local/12e-correction/before/pending-light-768.png) | [Complete copy](../artifacts/local/12e-correction/after-settled/pending-light-768.png) |
| Failed start, light1440 | [Clipped](../artifacts/local/12e-correction/before/failed-light-1440.png) | [Complete copy](../artifacts/local/12e-correction/after-settled/failed-light-1440.png) |
|320px/200%, dark | [Failure baseline](../artifacts/local/12e-correction/before/failed-dark-320-200.png) | [Failure](../artifacts/local/12e-correction/after-settled/failed-dark-320-200.png) · [Pending](../artifacts/local/12e-correction/after-settled/pending-dark-320-200.png) |
| Preserved interaction areas | — | [Idle390](../artifacts/local/12e-correction/after-settled/idle-dark-390.png) · [Active text390](../artifacts/local/12e-correction/after-settled/active-text-scroll-dark-390.png) · [Voice390](../artifacts/local/12e-correction/after-settled/voice-active-dark-390.png) |

All-width/theme overview: [sheet1](../artifacts/local/12e-correction/after-settled/sheet-01.png), [sheet2](../artifacts/local/12e-correction/after-settled/sheet-02.png), [sheet3](../artifacts/local/12e-correction/after-settled/sheet-03.png), [sheet4](../artifacts/local/12e-correction/after-settled/sheet-04.png), [sheet5](../artifacts/local/12e-correction/after-settled/sheet-05.png), [sheet6](../artifacts/local/12e-correction/after-settled/sheet-06.png).

## Commands, exits and reproducibility

The existing evidence runner was copied into the correction directory before execution and its destination changed. Every command below uses this prefix with the table's arguments:

```powershell
.tools/node-v24.22.0-win-x64/node.exe artifacts/local/12e-correction/run.mjs <log-name> <node|npm> <arguments>
```

The runner places `.tools/node-v24.22.0-win-x64` first on PATH and invokes npm through that runtime's `node_modules/npm/bin/npm-cli.js`. Exact executable/argv/UTC completion/exit are in [commands.jsonl](../artifacts/local/12e-correction/commands.jsonl).

| UTC completion | Runner arguments / log name | Exit / result |
| --- | --- | --- |
| 2026-10-23T00:06:54.178Z | `before node scripts/verify-ui-12e-correction.mjs before` | 1; expected12geometry failures |
| 2026-10-23T00:07:26.719Z | `build npm run build` | 0; PASS |
| 2026-10-23T00:07:27.521Z | `lint npm run lint` | 0; PASS |
| 2026-10-23T00:07:44.496Z | `typecheck npm run typecheck` | 0; PASS |
| 2026-10-23T00:07:50.944Z | `after node scripts/verify-ui-12e-correction.mjs after` | 1; fixture readiness mismatch |
| 2026-10-23T00:08:12.785Z | `text-session npm run test:text-session` | 0; 108passed |
| 2026-10-23T00:09:07.632Z | `before-settled node scripts/verify-ui-12e-correction.mjs before-settled` | 1; expected12geometry failures |
| 2026-10-23T00:09:20.918Z | `after-settled node scripts/verify-ui-12e-correction.mjs after-settled` | 0; PASS |
| 2026-10-23T00:09:50.792Z | `lint-final npm run lint` | 0; PASS |
| 2026-10-23T00:10:29.758Z | `preservation node artifacts/local/12e-correction/verify-preservation.mjs` | 0; PASS |

Supporting commands: pinned `node artifacts/local/12e-correction/contact-sheets.mjs after-settled` exit0 (34captures/six sheets); scoped `git diff --check` and linked-file validation recorded in `documentation-check.log`. No install, historic broad-suite rerun, provider/DB command or deployment. Lint was repeated only after correcting the test's readiness synchronization. Product code did not change after the single CSS correction/build.

Before rerunning a named stage, preserve its directory; the harness refuses an existing destination. `before-settled` requires the saved pre-fix CSS. `after-settled` compares against that baseline's results. The harness also reads the existing deterministic10C input fixture, uses local test-only adapters and mocks source endpoints. It blocks/counts external requests and native WebSocket/RTC/Audio/microphone entry points; each scenario records zero. Existing text-session tests run a separate default-disabled production instance with their no-provider guard and report zero forbidden calls. These are local browser/UI/controller checks, not live enabled-provider evidence.

## Hashes and gaps

[FIRST_USE_POLISH_12E_CORRECTION_HASHES.json](FIRST_USE_POLISH_12E_CORRECTION_HASHES.json) contains SHA256s for the nine changed/new task files and correction evidence. Product delta is one selector in `globals.css`; `scoped-diff.patch` compares the preserved pre-correction files so accepted earlier dirty work is not attributed to this continuation. Preservation results are in [preservation.json](../artifacts/local/12e-correction/preservation.json).

No remaining F05 defect or unrelated blocker was observed. Physical phone/audio, native browser zoom/keyboard and deployed/live-provider behavior remain **NOT_RUN**, as scoped.200% coverage is root-text scaling in Chromium. PM owns overall12E acceptance and subsequent release sequencing. READY_FOR_REVIEW; no later task started.
