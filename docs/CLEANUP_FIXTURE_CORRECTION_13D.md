# Task 13D — cleanup fixture correction and focused UI consistency

**READY_FOR_REVIEW — 22 October 2026 Toronto (23 October UTC).** Worker return under original Steps 11/13. PM acceptance is pending. Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`; accepted dirty work retained. Final local production build: **HfX60Nd257B0cbgUhRCYE**. No commit, push, deployment, provider call, Docker operation or database connection was performed for this task.

## Correction

The original PM PostgreSQL 18.6 run remains **FAIL / exit 1 in fixture setup**. Its diagnostic replay found SQLSTATE 23514 in the seed Source INSERT before any cleanup CLI ran. That result is not evidence of failed cleanup deletion. Original evidence and PM interpretation remain in [PM_SQL_VERIFICATION_13C.md](PM_SQL_VERIFICATION_13C.md), `artifacts/local/13c/pm-sql/` and `pm-sql-diagnostic/`. The corrected real SQL suite is **NOT_RUN** by this worker.

In `scripts/verify-cleanup-postgres.ts`, the future active PDF row (index 4) now has `READY` and `pdf-parse@2.4.5`; the replacement INSERT also supplies that provider. Both retain equal owner/active-slot values, null canonical origin through the existing nullable default, synthetic content/markers and future expiry. Indices 0–3 keep inactive FAILED/PENDING coverage, including index 2 exactly at the cutoff. The active ownership slot and unique-index assertions remain.

All three INSERT statements were reviewed against all three committed migrations. Source IDs and required fields are supplied; optional columns have valid defaults/nulls. Cache rows retain the 11-character synthetic video ID, required fields, default native mode and distinct per-run language-preference values. The replacement deletes this run's old Source IDs within its transaction before reusing the future ID/active slot. No additional concrete schema mismatch was found by inspection; SQL execution is still required.

Stage labels now identify seed teardown, inactive/active Source insert, cache insert, verification, individual CLI dry-run/execute/no-op, replacement insert/commit and final teardown verification. The catch still emits only fixed category/stage labels, never row content, owner hashes, URLs, credentials or raw driver errors. Every prior scenario and assertion remains: read-only dry run, execute/no-op, live-row equality, exact cutoff, refresh before/after selection, overlapping cleaners, replacement uniqueness, rollback, bounded lock wait, cancellation before/during/between batches, cancellation during lock wait and exact fixture teardown. Production cleanup, constraints, schema, dependencies and API behavior were not changed.

## UI changes

- Empty voice sessions derive their presentation from readiness and received turns. Initial idle, setup, failed/retry and empty-ended states use one centered invitation/status/action group sharing text mode's size, spacing and responsive rules. Ready sessions and any received turns keep the existing transcript/dock. Restarting a retained transcript still shows the data-loss warning; explicit start, cancellation and controller logic are unchanged.
- Removed the header's Early preview badge and the entire Voice help disclosure. Necessary setup recovery instructions now live in the relevant failure message. Offline guidance is visible even when admission/cooldown guidance also applies. Microphone permission, playback recovery, partial/interrupted text and controls remain available.
- The normal PDF reader retains its title, close action, filename, page headings and exact extracted content. Removed page-order, expiry/cookie/reload and Extraction notes boilerplate. Server warnings/metadata remain unchanged. YouTube caption/timestamp presentation and its warnings remain; only the shared expiry paragraph is removed there. Actual source/extraction/access errors remain contextual. Text inside a document is never filtered to remove apparent warnings.
- Updated `DESIGN.md` to describe centered empty voice entry while preserving the active dock. Removed obsolete badge/help CSS. Visible start statuses keep the 12E F05 unlimited-height rule; the rule now excludes `.visually-hidden` so it cannot accidentally override that utility's clipping and create horizontal overflow.

Generic voice interpretation belongs in evidence/documentation: speech text is an estimate, generated text does not establish audible playback, diagnostic timestamps are local observations, and unknown processing means unreported. No guarantee of answer accuracy or physical playback is added.

## Verification

All commands used Node **24.22.0** and npm **11.19.1** from `.tools/node-v24.22.0-win-x64`. Cwd was the original checkout. [The exact command ledger](../artifacts/local/13d/commands.jsonl) records executable, argv, UTC start/end, exit and log for every verification attempt. Its local runner overrides provider keys with empty values and uses an inert synthetic loopback database URL; browser suites inject storage/transport/media. No real SQL was run.

| Command | Result | Evidence under `artifacts/local/13d/` |
| --- | --- | --- |
| `node --conditions=react-server tests/ui-13d/prepare.ts` | PASS 0, inputs from committed synthetic fixtures | `prepare.log`, `inputs/inputs.json` |
| `npm run lint` | PASS 0, initial and final | `lint.log`, `final-lint.log` |
| `npm run typecheck` | PASS 0, initial and final | `typecheck.log`, `final-typecheck.log` |
| `npm run test:cleanup` | PASS 0, 52 tests | `cleanup.log` |
| `npm run build` | PASS 0 twice; final build above | `build.log`, `final-build.log` |
| `npm run test:voice-session` | PASS 0 twice, 208 tests each; final run records final build | `voice-ui.log`, `final-voice-ui.log`, `final-regression/12e/regression/08c/browser-results.json` |
| `npm run test:source-ui` | PASS 0, 87 tests | `source-ui.log`, `regression/12e/regression/05a/browser-results.json` |
| `node --conditions=react-server scripts/verify-voice-adapter.mjs` | PASS 0 twice; final 619 checks / 48 scenarios | `native-voice.log`, `final-native-voice.log`, `final-regression/12d/regression/08d/built-application.json` |
| `node scripts/verify-ui-13d.mjs confirmation` | PASS 0, 6 combinations / 108 states / 78 detailed start-layout measurements | `ui-confirmation.log`, `confirmation/results.json` |
| `node node_modules/eslint/bin/eslint.js scripts/verify-voice-adapter.mjs --max-warnings=0` | PASS 0 after final test-only marker-list edit | `final-changed-lint.log` |
| `git diff --check` | PASS 0; only existing line-ending warnings | Terminal verification; no whitespace errors |
| `npm run test:cleanup:postgres` | **NOT_RUN** — PM owns the disposable SQL rerun | Original PM failure retained, no replacement claim |

The first build was `qE-78Edtr0TkDmkNzeV7_`. Source tests ran against that intermediate build/isolated current source bundle before the final visible-status CSS restriction and empty-voice recovery wording; the PDF-reader code did not change afterward. The final rendered matrix rechecks PDF fidelity/focus on final source/CSS. Final voice/native suites and confirmation record `HfX60Nd257B0cbgUhRCYE`. The broad unrelated suite was deliberately not rerun.

Source regressions preserve actual PDF-parser plus synthetic-repository coverage, all 384 preview lines, keyboard containment/return, unreadable/empty extraction, expiry/unavailable access, replace/remove and theme behavior. Voice regressions preserve ACK-before-microphone, cancellation, no automatic restart, stale-session isolation, controls, partial history and reading focus. The built native suite retains all diagnostic sanitization/chronology assertions after removal of Voice help: a test-only pre-hydration React DevTools observer reads the existing safe controller projections. It adds no production hook. This observer depends on React's test-visible fiber structure; future React updates may require a test adapter update. Production client scanning confirms its marker is absent. Final built native evidence has zero forbidden network calls; the UI matrix has zero external/native-media calls and releases browser/server resources.

Existing voice/source runners and their Playwright configs, input preparation and screenshot consumers now honor `VERIFICATION_ROOT`, preserving the previous defaults. This directs task evidence into fresh 13D roots instead of overwriting historical outputs. The new focused runner reuses the 12E actual component/controller harness, adds only deterministic test actions, and prepares inputs from committed fixtures rather than ignored application data. It refuses an existing named output directory. No personal CV appears in the evidence.

## Rendered review and corrections

Inspected the confirmation's 18 contact sheets covering all 108 captures, plus full-size desktop idle/empty-ended/PDF-reader and narrow enlarged-text voice captures. Both themes were reviewed at **390×844**, **1440×900**, and **320×600 with 200% root text**. Normal screenshots are viewport captures; 320/200% uses full-page captures to show intentional vertical flow. This is browser reflow evidence, not native browser zoom or a physical phone test.

Text and voice idle actions have equal computed widths/heights, fonts, padding, group padding and invitation-to-action gap. Normal controls remain in the viewport. Enlarged text wraps into natural scrolling flow. Geometry checks inspect text-line rectangles, overflow ancestors, heading/action overlap, horizontal overflow, single-action count and pointer reachability. Visible failures/cooldown/offline remain unclipped. Ready microphone/playback controls remain in the dock, as do received-ended text and the restart warning. Reader section strings match the fixture exactly, including empty-page fallback, Unicode and literal hostile content; last-page scrolling, Escape and close-button focus return pass.

Representative final captures (the same names exist for both `light`/`dark` and all three sizes):

| Review | Captures under `artifacts/local/13d/confirmation/` |
| --- | --- |
| Idle comparison | `text-idle-light-390.png`, `voice-idle-light-390.png`, `text-idle-dark-1440.png`, `voice-idle-dark-1440.png` |
| Empty-ended comparison | `text-empty-ended-light-1440.png`, `voice-empty-ended-light-1440.png`, `text-empty-ended-dark-390.png`, `voice-empty-ended-dark-390.png` |
| Recovery and retained dock | `voice-pending-*`, `voice-failed-*`, `voice-cooldown-*`, `voice-offline-*`, `voice-reconnected-*`, `voice-permission-failed-*`, `voice-playback-blocked-*`, `voice-partial-*`, `voice-interrupted-*`, `voice-received-ended-*` |
| Reader/header and reflow | `pdf-reader-light-390.png`, `pdf-reader-dark-1440.png`, `voice-idle-dark-320-200.png`, `text-failed-light-320-200.png` |

All failed inspection attempts remain separate. `ui-inspection` exited 1 on horizontal overflow. `ui-inspection-complete` exited 1 because the new test compared the entire transcript container across End, including the legitimate status change from updating to unfinished; it was corrected to compare received text while asserting the terminal indicator. `ui-inspection-settled` completed all 108 captures and exited 1 with 10 overflow findings. The concrete CSS cause was `overflow: visible` overriding `.visually-hidden`. One product correction batch narrowed the unlimited-height status rule to visible elements and clarified empty-session failure wording. `confirmation` then exited 0 with no geometry findings. No failed attempt was deleted or regraded as a pass.

## Delivery identity and PM handoff

[CLEANUP_FIXTURE_CORRECTION_13D_HASHES.json](CLEANUP_FIXTURE_CORRECTION_13D_HASHES.json) contains exact SHA-256 values for every changed/new delivery file (including this report, state and testing), the arrival hashes for existing files, unchanged-baseline verification, build identity and evidence hashes. It excludes its own bytes to avoid a circular digest; an ignored `artifacts/local/13d/final-manifest.sha256` identifies the completed manifest. Arrival baseline is `artifacts/local/13d/baseline.json`. No existing file outside the enumerated task changes was modified; the 16 pre-existing deletions remain deletions. Package/lockfile, migrations, server implementation and voice controller/provider behavior remain at arrival bytes.

PM next: review the fixture/UI changes and manifest, overlay the reviewed harness into a fresh verification snapshot, then run the complete disposable PostgreSQL suite. Acceptance requires exit 0, every scenario passed, `ownFixturesRemaining: 0`, released resources and acceptance of the scoped UI corrections. Until then real cleanup/race validation remains **NOT_RUN for corrected 13D**. Production cleanup execution/scheduling, final hosted checks, physical phone/audio and final recording/access gates remain with PM/user under [RELEASE_CANDIDATE_13C.md](RELEASE_CANDIDATE_13C.md). Historical accuracy failures and Step 01–14 completion decisions are unchanged.
