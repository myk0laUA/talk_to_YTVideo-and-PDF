# Task 05a — PDF import UI and PM runbook

Worker outcome: **implemented; proposed READY_FOR_REVIEW**. PM decides acceptance. Step 05 remains IN_PROGRESS; its YouTube/context/conversation gates are unchanged.

## Review identity and changes

Branch `main`, base HEAD `67c03591084cb480f522bd6aad685eb37ae40243`, dirty working tree; no commit, push or deployment. Final production build `GG-G88bXofP0QTLRgDfdX`, Node **24.22.0**, npm **11.19.1**. Ignored evidence is under `artifacts/local/05a/`.

| Files | Purpose |
|---|---|
| `src/app/page.tsx` | Request-time server rendering (`connection`, checked against bundled Next 16.4.2 docs); serialize only a safe `pdfAvailable` boolean derived from the existing gate/config validator. |
| `src/app/source-workspace.tsx` | Native single-file chooser, one source, replace/remove confirmation, expiry, full ordered page reader/warnings, anchor navigation and truthful disabled conversation/YouTube controls. |
| `src/app/use-pdf-source.ts` | Explicit operation states, signed-cookie retry, owned GET/DELETE, abort/generation guard, bounded uncertainty checks and authored contract recovery. |
| `src/app/globals.css` | Existing paper/green/serif identity extended with wrapping, source actions, reader, status and 360/390 px layout. No UI library. |
| `playwright.source-ui.config.ts`, `scripts/verify-source-ui.mjs`, `tests/source-ui/source.spec.ts`, `package.json` | New `npm run test:source-ui`; owned production server on 3107, 3 viewports, mocked failure/ordering checks and actual parser/synthetic repository journeys. |
| `docs/PROJECT_STATE.md`, `docs/TESTING.md`, this file | Worker evidence, acceptance map and runbook. |

`changed-files.sha256.json` lists exact dirty-file byte hashes. `identity.json`, `audit.json`, `commands.jsonl`, `browser-results.json` and `integration-boundaries.json` carry build/runtime, commands/UTC/exits, browser counts, worker exits and teardown evidence. Backend extraction, source service/repository/handler/config, proof authorization, schema, dependencies and package-lock are unchanged.

## State, retry, cancel and reload policy

- `idle → importing → loading → loaded`; separate `removing`, `checking`, `error`, `uncertain` states. A ref locks each operation before state renders; event handlers start requests, never an effect. Unmount aborts and invalidates the generation. No polling, progress percentages or provider calls.
- Client checks the decimal **25,000,000-file-byte** cap and `.pdf` extension. Server still validates size/content/multipart authoritatively. A local Unicode filename stays as escaped React text in memory. FormData always uses ASCII `document.pdf`, exactly one `file` part. Browser same-origin credentials and native POST/DELETE Origin are used.
- POST 401 retries **once** with the same selected file so a new HttpOnly visitor cookie can take effect. A second 401 stops. No other automatic upload retry. After 201 the ID is kept before GET; extraction success is displayed only after owned content arrives. Failed GET offers **Retry text**, which uses that ID and never reuploads.
- Known precommit rejection preserves the prior source. Replacement never pre-deletes it. Network loss, timeout, cancellation, storage failure and 409 are uncertain. One bounded GET of a known prior ID may establish that it is readable **now**, or clear it on generic 404/visitor expiry. It cannot discover the ID of an unknown committed upload; the UI explains that a deliberate new choice replaces it. No current-source lookup endpoint was invented.
- **Cancel import** uses AbortController and invalidates the operation generation. The UI explains that commit may already have happened and pending work may still replace a readable prior source. Mutation controls stay disabled through reconciliation. A subsequent deliberate attempt can receive the server's busy response while cancelled server work settles. Late responses cannot replace newer UI state. Requests have a 55-second local ceiling; reconciliation has its own 10-second GET ceiling.
- Remove needs an inline confirmation and calls authorized DELETE. 200 or generic 404 clears the view. Network/503 does not claim confirmed deletion; the last known ID is checked once. **Check source** is an explicit owned GET and clears an expired/unavailable source. Readability does not authorize conversation use.
- **Reload policy:** no browser persistence, including no source UUID. Reload clears the UI; choosing a PDF again atomically replaces the previous temporary upload belonging to that visitor. No raw files/text/cookie values/owner hashes/tokens are placed in localStorage or sessionStorage. An unknown committed source remains bounded by existing server ownership/TTL until replaced; general cleanup is still unimplemented.

## Verification and acceptance mapping

All routine commands used the checkout-local pinned runtime and a synthetic loopback DATABASE_URL. Exact UTC starts/ends and exit codes are in `commands.jsonl`; logs use the script name with colons replaced by hyphens. Every command below exited **0**.

| Check | Expected / observed | Context and evidence |
|---|---|---|
| `npm run lint` | PASS, no warnings | Local static check; `lint.log`. |
| `npm run typecheck` | PASS, Prisma/type generation + TypeScript | Local, schema generation only; `typecheck.log`. |
| `npm test` (`npm run test`) | **265/265 PASS**, no skipped tests | Mocked/injected backend/proof unit boundaries; `test.log`. |
| `npm run build` | PASS; final ID above | Default-off production build; `build.log`. No real DB/provider use. |
| `npm run test:smoke` | **14/14 PASS** | Final build, desktop/390 Chromium; disabled shell/proof/source routes, skip link and no overflow; `test-smoke.log`. |
| `npm run test:source-ui` | **75/75 PASS** | Final build; 72 mocked checks and 3 integrated journeys, 1440×1000 / 390×844 / 360×780 Chromium; `test-source-ui.log`, browser JSON and screenshots. |
| `npm run test:sources:http` | **6 scenarios / 51 checks PASS** | Final build, actual PDF worker / synthetic Prisma transaction boundary, ownership/expiry/replacement/removal/limits and shared admission; `test-sources-http.log`; detailed existing harness output in `artifacts/local/04b/http-results.json`. |
| `npm run test:voice`, `npm run test:text` | **10/10 each PASS** | Preceding UI build `2H102dLtdTDa_bSgcK-tW`; fake media/RTC/socket/provider. Subsequent UI changes only hide the source chooser, focus its reader and remove source-page rendering optimization; no proof styles or code changed. `test-voice.log`, `test-text.log`. |
| `git diff --check`, trace/client/lockfile/port audit | PASS | `audit.json`; test setup absent from production traces; all owned listeners released. |

| Requirement | Supporting observation |
|---|---|
| 1 — gate/chooser/limit/filename | Default-off smoke; native chooser exercised in each real-parser journey; mock request asserts `document.pdf`, Origin, Unicode escaped filename, exact 25M accepted and 25M+1 rejected client-side. Source HTTP retains authoritative real-byte proof. |
| 2 — handshake and bounded retry | Real journey observes `[401, 201, 201, 422]` for bootstrap, upload, replacement and corrupt replacement; mocked second 401 stops at exactly one retry. Reload generates no upload/GET. |
| 3 — full owned preview, metadata, no readiness claim | Real 12-page GET asserts every one of **384 lines**, per-page order and final marker; warnings/whitespace/script text safety and expiry display checked with mocks. All pages remain rendered and scrollable. Conversation controls stay disabled. |
| 4 — mobile/navigation/one mutation/source preservation | All 3 viewport journeys; native anchors focus their headings; Inspect focuses reader, close returns focus; controls are disabled during import; corrupt real replacement preserves the prior 12-page source. |
| 5 — uncertain recovery and new-ID read retry | Controlled lost committed response + old-ID 404, 409, timeout, cancellation with deliberately abort-ignoring late fetch, network/503 removal, and failed content GET followed by explicit GET retry; POST counts asserted. |
| 6 — authorized remove/reload | Real DELETE and subsequent old-ID 404; mocked repeated removal returns404 and clears; 503/network never confirms removal; storage remains empty and reload policy is visible. |
| 7 — authored errors/a11y/YouTube | Fifteen distinct contract failures, plus second401/network/unavailable; raw mocked parser/SQL messages never displayed. Semantic native controls/labels/status, keyboard, 3px focus, wrapping, no horizontal overflow. YouTube unavailable. |

## Browser, parser and repository boundaries

Mocked tests intercept source HTTP for precise order/error conditions; the late-response test uses an explicitly identified browser fetch adapter that ignores abort. Their dummy bytes are not parser evidence. Expected synthetic HTTP401/422/network errors are distinct from unexpected JavaScript/console errors; success/keyboard journeys have zero unexpected errors.

Integrated journeys use **real built Next HTTP routes, signed HttpOnly cookie, actual multipart reader and pdf-parse workers**, with the existing test-only Node preload providing `SyntheticSourceDatabase`. Each viewport imports small.pdf, replaces with multi.pdf, rejects corrupt.pdf, inspects all pages and removes the source. Nine actual parser workers are created and exit; zero external server fetch attempts. This proves neither PostgreSQL durability/locking nor hosted transport. No real `.env` database URL, provider credentials, paid calls, HTTP mock endpoints or production mock selectors were used. The harness owns its server and releases 3107 after every run.

Fixture bytes/hashes are checked by the existing source HTTP harness against `artifacts/local/04a/fixtures/manifest.json`. Browser fixtures remain ignored synthetic artifacts. Parser limits and authoritative 25 MB tests are retained from 04a/04b, not reimplemented in the UI. `test:pdf:http` and caption suites were not rerun because those implementations are untouched; their prior accepted evidence remains separate.

## Visual and accessibility observations

Captured and inspected desktop, 390 px and nearby 360 px screenshots. The paper/green typography, single source and honest conversation placeholder remain. Chooser, state and actions wrap inside each width, long unbroken source text stays within the reader, all pages scroll with the document, and the close action returns to Inspect. Touch controls have the inherited 48 px minimum. Source text is ordinary escaped text, outside live announcements; only concise status copy uses `role=status`. No custom gesture, modal trap, animation or remote font was added.

The first capture exposed a blank final-page paint from content-visibility/intrinsic sizing. Removed that optimization from source pages and confirmed the corrected reader. Native chooser is hidden behind the named Upload/Replace button to avoid a duplicate control showing “No file chosen” beside a loaded source. Reader opening now moves focus to its heading. Final captures include `desktop`, `mobile390`, `narrow360` prefixes with `-integrated-loaded.png`, `-integrated-first.png`, `-integrated-final.png`, and `-mocked-reader.png`.

Focused review applied the selected local skills and [current Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) to the changed surface: native buttons/anchors, labels, focus/return, status without color alone, visible file limit, remove confirmation, authored recovery, local date formatting and text wrapping. This is a bounded worker review, not a broad redesign/accessibility certification. Screen-reader speech and physical touch/Files behavior remain human checks.

## Runbook and remaining gates

1. Select Node24.22.0/npm11.19.1. On this checkout: `$env:PATH = (Join-Path $PWD '.tools/node-v24.22.0-win-x64') + ';' + $env:PATH`. Do not use the host-default Node26/npm12. Install with existing `npm ci` only if dependencies are absent.
2. Generate synthetic PDFs if missing using `scripts/generate-pdf-fixtures.py` and its recorded Python dependencies. Build with synthetic loopback DB config and gates false, then run `npm run test:source-ui`. The command supplies isolated server configuration, blocks external server fetch, starts/stops 3107, and saves evidence. It does not offer a production testing endpoint. Do not launch its Playwright config alone: its parent owns server lifecycle.
3. For repeatable checks, run the normal lint/type/unit/build/smoke/source HTTP commands. Keep ports3100/3101/3102/3106/3107 free. Screenshots/logs and the optional private PowerShell command wrapper stay ignored under `artifacts/local/05a/`.
4. **PM HTTPS/database check — NOT_RUN:** after review, PM deploys the UI through the existing authorized workflow with the existing Free PostgreSQL and ingestion configuration. Use synthetic small/multi files; inspect first/middle/final marker, replace, reject corrupt replacement, remove, confirm foreign/expired access still fails, narrowly clean synthetic fixtures, then restore intended gates. Record exact deployed build and runtime. Worker did not deploy or mutate the real database.
5. **Physical iPhone — NOT_RUN:** only after PM supplies an available deployed build, open it in Safari, choose a synthetic PDF from Files, inspect first/final pages, close/reopen, replace and remove. Record model/iOS/browser, zoom/scroll/focus/tap outcomes. Do not ask a human to test the currently disabled deployment. No microphone/audio is needed for05a.

Other explicit NOT_RUN gates: physical Android, screen-reader announcement quality, large/complex-layout physical-device rendering, live providers, grounding/context readiness, real voice/text answers. PDF extraction can reorder complex layouts; there is no OCR. Unknown committed IDs cannot be recovered without choosing another PDF; the bounded contract intentionally has no discovery endpoint. PM owns acceptance and any next brief.
