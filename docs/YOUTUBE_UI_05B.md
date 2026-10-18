# Task 05b — YouTube import and source preview

**PM accepted implementation/local UI and observed hosted error recovery.** Fresh99browser checks pass. Actual hosted direct extraction returned502blocked; complete live YouTube preview and physical phone remain unproven. PDF-only configuration restored. Next single worker task06a cache; full03/05 remain IN_PROGRESS. Original worker-only evidence below is preserved; PM addendum records deployment and actual service checks.

## Identity and changes

Branch `main`, base/final HEAD `63b636012707c3db25b2645eb50c3c8993540c7f`, dirty working tree; no worker commit/push. Final local Next build **`gAnL8_ZqbnIBxM4j9Hc5l`**, Node **24.22.0**, npm **11.19.1** from ignored `.tools/node-v24.22.0-win-x64`. Host-default Node26/npm12 was inspected before work and was not used for npm checks. Exact SHA256 inventory, deletion entry and manifest digest are in ignored `artifacts/local/05b/changed-files.sha256.json` and `identity.json`.

| Files | Change / reason |
|---|---|
| `src/app/page.tsx` | Projects existing server configuration into independent PDF/YouTube availability booleans at request time. No configuration object crosses the client boundary. |
| `src/app/use-pdf-source.ts` → `src/app/use-source.ts` | Shared state for both source kinds; one mutation, one cookie retry, metadata→owned GET, saved-ID GET retries, replacement/removal/cancel/expiry recovery. Recovery reads have an owned controller even after the import deadline aborts. |
| `src/app/source-workspace.tsx` | Labeled native URL form, helpful validation/focus, one source card, honest metadata, complete caption preview, exact fractional seconds/zero durations, stable IDs, escaped text, close/focus return. Both conversation actions remain disabled. |
| `src/app/globals.css` | Scoped URL-input/failure styling, wrapping, tabular timestamps and deferred offscreen caption rendering; existing paper/green identity preserved. |
| `playwright.youtube-ui.config.ts`, `tests/youtube-ui/youtube.spec.ts`, `scripts/verify-youtube-ui.mjs`, `package.json` | Separate `test:youtube-ui` command, isolated output/port3109, 96 mocked browser cases plus three actual-route journeys. No dependency or lockfile change. |
| This file, `docs/TESTING.md`, `docs/PROJECT_STATE.md` | Acceptance, exact evidence, boundaries and operator/human handoff. |

No schema, backend handlers/adapters, limits, authorization or shared DTO changes were needed. Existing union DTOs suffice. The selected project Impeccable/React/Playwright/accessibility skills were read; existing PRODUCT/DESIGN context and installed Next16.4.2 `connection`/server-client documentation were used. The focused [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) review found no remaining scoped form/focus/wrapping issues after verification. No branding or design-system migration.

## State, retries and recovery

- The form appears only when `parseYoutubeSourceConfig(process.env) !== null`. The ordinary UI has no provider selector or keys. Disabled configurations show unavailable copy. Client checks HTTPS YouTube/youtu.be video URL shape and a 400-character limit; server validation remains authoritative. Submission sends `{video}` once, with exactly one additional POST after a 401 cookie handshake. Typing never starts retrieval. Submitted input remains in the form after failures.
- A 201 saves its UUID before fetching full owned content. POST metadata is not treated as complete preview content. Retry text/Check source issue only GET for that saved ID. Neither GET failures nor rerenders resubmit extraction.
- Successful replacement atomically uses the existing server transaction. There is no pre-delete. PDF→YouTube, YouTube→PDF and YouTube→YouTube share one card and operation guard. Known precommit errors preserve the previous visible source.
- Conflict, storage error, timeout, network loss, internal error and cancellation are uncertain outcomes. One bounded GET revalidates a known prior ID. A readable prior may still be replaced by pending work; its status says so. A 404/401 clears it. Unknown committed UUIDs cannot be discovered; recovery is deliberate re-import. There is no discovery endpoint.
- Cancel aborts the active browser request and increments its generation, then performs bounded reconciliation. Late success cannot overwrite a subsequent source. The 55-second client deadline and 10-second reconciliation controller are bounded and cleaned up on unmount. Cancel does not promise rollback.
- Preview uses every section in supplied order, without sorting, truncation or another milliseconds conversion. Starts such as `1.2505` display as `0:01.2505`, and `3601.000125` as `60:01.000125`. Scientific-notation values retain their exact numeric representation with an `s` suffix. Duration zero stays zero. Caption text is ordinary escaped React text outside live regions. The server supplies a generic title, selected language, optional automatic-track fact and expiry; no guessed title or player.
- Removal requires confirmation. Failed removal rechecks and does not claim deletion. Repeated/already-unavailable removal is handled. Reload clears the visible source; no source/text/ID/token browser persistence was added. Existing server TTL and cleanup limitations remain.

## Verification

All final rows below are **local**, exit **0 / PASS**. UTC dates are 18 October 2026. Exact start/end times, command history and superseded runs: ignored `artifacts/local/05b/commands.jsonl`. Logs are named below relative to that directory. Runtime reports Node24.22.0/npm11.19.1; commands run through the pinned Node/npm runner in `run.mjs`.

| Command / procedure | UTC start–end | Expected / observed | Evidence |
|---|---|---|---|
| `npm run build` | 20:12:45.783–20:12:50.554 | Production build succeeds; build gAnL8_ZqbnIBxM4j9Hc5l | `run-build.log` |
| `npm run lint` | 20:13:00.821–20:13:05.634 | Zero errors/warnings | `run-lint.log` |
| `npm run typecheck` | 20:13:00.816–20:13:05.048 | Prisma/type generation + TS succeed | `run-typecheck.log` |
| `npm test` | 20:13:00.847–20:13:04.010 | Existing backend/unit suite 288/288 | `test.log` |
| `npm run test:youtube-ui` | 20:13:00.805–20:13:38.417 | 99/99 Chromium tests: 96 mocked + three integrated, desktop/390/360 | `run-test-youtube-ui.log`, `browser-results.json`, `integration-boundaries.json` |
| `npm run test:source-ui` | 20:13:00.805–20:13:49.744 | Existing PDF suite 75/75, including all12pages/384lines, Unicode filenames and exact decimal25MB boundary | `run-test-source-ui.log`, copied `pdf-browser-results.json`, `pdf-integration-boundaries.json` |
| `npm run test:youtube:http` | 20:13:00.804–20:13:09.670 | Actual routes/adapters with synthetic boundaries: 9 scenarios/59 checks | `run-test-youtube-http.log`, copied `youtube-http-results.json` |
| `npm run test:sources:http` | 20:13:00.805–20:13:14.927 | PDF source/storage HTTP regression: 6 scenarios/51 checks | `run-test-sources-http.log`, copied `sources-http-results.json` |
| `npm run test:smoke` | 20:14:09.759–20:14:14.414 | 14/14, unavailable configuration fails closed, no horizontal overflow | `run-test-smoke.log` |
| `npm run test:voice` | 20:11:34.094–20:11:40.818 | 10/10 mocked proof lifecycle checks | `run-test-voice.log`; named build AsjSZN96YnXMmiB9YUPRX |
| `npm run test:text` | 20:11:44.443–20:11:53.152 | 10/10 mocked proof lifecycle/media-free checks | `run-test-text.log`; named build AsjSZN96YnXMmiB9YUPRX |
| Interactive Playwright CLI walkthrough | 20:14:09–20:16:13 | Real built URL→captions→12-page PDF→captions; inspect first/final text, blocked error, cancel and confirmed Remove;390px/no overflow | `manual-*.yaml`, `manual-console.log`, `manual-boundaries.json` |
| Trace/browser/secret/lockfile/teardown audit | Final UTC in report | 15 traces contain no test/preload/private paths; 13 browser chunks contain no checked server/test markers or configured secret values; lockfile identical to HEAD; diff check passes; ports3100–3109 rebind | `audit.json`, `identity.json`, `changed-files.sha256.json` |

Voice/text ran after the scoped CSS change on named build `AsjSZN96YnXMmiB9YUPRX`; only source-workspace timestamp handling and source-hook recovery copy changed before the final build. Proof layout/styles/code are unchanged since those passes. These are synthetic proof regressions, not live conversation/audio results. `db:validate`, extra PDF diagnostic/caption-proof commands and `npm ci` were not repeated: no schema/dependency change, and required unit/owned-route/parser/browser checks passed.

The first YouTube browser run had93 passes/3 failed assertions because a broad `role=alert` locator also matched Next's route announcer; narrowed to `#youtube-error`. Lint initially found two unused test-helper variables, subsequently removed. The first last-caption screenshot preceded deferred content painting; capture now waits for viewport visibility/actual painting. No product defect was inferred from those test-only failures. Initial and final exits remain in command history; initial failure logs retained as `run-test-youtube-ui-first.log`/`run-lint-first.log`. A test-helper copy path in the ignored audit script was corrected before the final audit. The interactive helper initially had closed stdin; only its identified owned processes were stopped, then it restarted with a PTY and shut down normally after the remaining checks. No production code hook was added.

## Acceptance map and observable evidence

| Task criterion | Evidence / result |
|---|---|
| 1. Safe availability, accessible form, authoritative server, no automatic requests/provider control | Enabled integrated form; disabled smoke/PDF harness; existing config unit cases and HTTP invalid-provider/missing-key cases. Label, URL input mode, native Enter, invalid/long/foreign/duplicate-v validation and focus checked. No POST while typing. |
| 2. Cookie retry, UUID→GET, no extraction retry, one mutation, preservation/uncertainty/cancel/stale guards | `native submit` records POST2/GET1 (one401); `second401` stops at two attempts for that submission; saved-ID retry POST1/GET2; cross-kind chain POST4/DELETE0; each precommit error POST2/GET1; uncertain failures POST2/GET2; stale/cancel test aborts signal and ignores late success after a new import; accelerated local-deadline test confirms prior GET after abort. Counts are `request-counts` attachments in browser JSON. |
| 3. Honest metadata, full captions, stable IDs/order/seconds, escaping/no live announcement |64-section mock verifies every text/ID in exact order, overlapping/backwards/zero/fractional/submicrosecond/hour-plus timing, malicious-looking text escaped. Three integrated actual-adapter journeys verify all three segments and timings per import, selected language, optional automatic label, expiry and generic title. |
| 4. One card/replacement/preview/focus/check/confirmed Remove/PDF preservation/mobile/reload | Both replacement directions plus same-kind chain; Remove/Keep/repeat404/failure/expiry cases; close focuses Inspect with3px outline;75 existing PDF checks pass, including384lines and25,000,000/25,000,001 bytes. No browser storage and no reload GET. No page JS errors in success/integrated journeys. |
| 5. Distinct authored recovery/conversation disabled |19 mocked server categories per viewport plus local invalid URL/network/deadline/cancel/deletion/expiry cases. Raw server messages hidden; no claimed fallback. Voice/text disabled in both loaded and empty states. |
| Integrated production journey / no live calls / teardown |99-suite actual portion:6 successful synthetic caption extractions, exactly6 watch +6 player +6 timedtext calls, zero fallback/duplicate calls, zero forbidden server fetch attempts,3 actual PDF workers created/exited. Each viewport POST statuses401,201,201,201; three content GETs, one DELETE; both previous IDs and removed ID become404. Source suite separately creates/exits9 parser workers. Servers stopped/rebind passed. |

Screenshots inspected at desktop/390/360: `*-loaded.png`, `*-first.png`, `*-final.png`, `*-failure.png`; final captures visibly show caption64 and `60:01.000125`, and integrated captures show first/final synthetic captions. Focus return is captured in `*-focus-return.png`; all384PDF lines are asserted, with the existing PDF suite's final-page captures retained separately. Long source words wrap, URL input scrolls internally without widening the page, controls remain touch-sized and keyboard reachable. Deferred captions remain in DOM and available to search/read. Browser emulation is not physical-device or screen-reader speech evidence.

Interactive actions used the locked Playwright CLI0.1.22 with a fresh in-memory browser session and the same explicit synthetic preloads. The observed native chooser accepted `multi.pdf`; snapshots show `FIRST`/`MIDDLE`/`LAST` caption markers. Test-only IPC switched the upstream to blocked/hold/success for observed recovery/cancel. Console entries were exactly the expected401 handshake/restart handshake and502 blocked response, with no JS exception. Browser and owned server closed. The second helper's report covers the error/cancel/removal portion after its restart; the earlier real-route source-switch snapshots are separately retained.

## Reproduce local review

Use the pinned runtime on PATH and existing04a synthetic PDF fixtures (`small.pdf`, `multi.pdf`, `corrupt.pdf`, `manifest.json`). If fixtures are missing, follow `PDF_PROOF_04A.md` to generate them with the existing generator; do not substitute private documents or connect a database.

```powershell
$env:Path = "$PWD\.tools\node-v24.22.0-win-x64;$env:Path"
node --version
npm --version
npm run build
npm run test:youtube-ui
npm run test:source-ui
```

`test:youtube-ui` owns port3109 and stops its server even after test failure. It runs the built application, actual direct adapter/DTO handlers, existing synthetic upstream preload and synthetic Prisma preload. All external server fetches are replaced/blocked, browser external traffic is blocked, credentials are blank, database points to unusable loopback, proof/issuance gates are off. The static synthetic fixtures are test data, not live-caption evidence. No test helpers enter app imports or production traces. Request counts/error outcomes are in JSON; trace/video recording is off. `test:source-ui` retains its separate05a harness/output on3107.

## PM and human gates — NOT_RUN here

1. PM reviews the diff and hash manifest, reproduces local checks, then decides Task05b acceptance. Full03/05 stay IN_PROGRESS. Deploy only through the PM's existing Free-service procedure with reviewed configuration; worker has not changed the public PDF-only service.
2. PM, after deployment: verify unavailable YouTube copy with its gate off. In a scoped authorized provider trial, check native URL entry, actual direct caption import or exact blocker, full preview/replacement/removal and owner-scoped cleanup. Record deployed commit/build, provider/category, timing and actual result. Latest pre-task owned direct attempt was504/timeout; this worker establishes no new live result. No silent fallback/cache should be inferred.
3. Managed live captions remain BLOCKED pending operator key/quota/spend authorization. Real database/provider/hostedUI checks in this worker task are NOT_RUN. No synthetic credential proof is enabled for real sources.
4. Only after PM supplies an available reviewed deployment: human opens Safari on a physical iPhone, pastes a public captioned URL, submits, checks language/expiry and first/final captions, closes/reopens, switches to a PDF and back, then Remove/Confirm remove. Report model/iOS/browser, build if shown, observable results and exact blocker. If import fails upstream, record that error instead of a preview pass. Do not request this check before deployment. New iPhone YouTube/Android/screen-reader speech/audio/grounding remain NOT_RUN; prior PDF iPhone confirmation is separate.

Known limitations: no source discovery after lost committed ID/reload, no browser persistence, no general TTL cleanup, per-process admission, live provider reliability unproven, physical keyboard/audio behavior untested. These are retained gates, not permission to implement later tasks. Return to PM with this implementation and evidence only.

## PM acceptance — 18 October 2026

05b accepted for implementation/local browser and actual hosted error recovery. Reviewed application `e3908e6f0fcd0bc645f31e6498b064b070773bec`, local build `gAnL8_ZqbnIBxM4j9Hc5l`.12manifest entries match; fresh PM99of99,20:33:37.487–20:34:19.091UTC, exit0. Exactly6 synthetic extraction sequences/3PDFworkers, zero forbidden fetches, server stopped/3109 released. Worker results above retained with their exact build distinctions.

Actual Free Render/PostgreSQL390px journey20:37:09.561–20:37:27.833UTC, exit0: PDF201/all384lines; one direct YouTube UI request502/blocked6739ms; authored recovery, priorPDF preserved/readable, remove and scoped cleanup404; nooverflow/pageJSerrors, diagnostic/credential gates503. UI handling PASS, live provider BLOCKED. Complete live hosted captions/preview/phone remain NOT_RUN. Evidence and restoration details are in PROJECT_STATE and ignored `artifacts/local/05b/pm-*.json/png`. No phone retest requested until successful retrieval is available. Next single worker task06a cache; no fallback/context implementation authorized by this handoff.
