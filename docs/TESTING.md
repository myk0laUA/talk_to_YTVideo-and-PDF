# Testing and evidence — Talk to a Document

**Latest06A PM review:** application03eb7d8/local buildg-qTkOYGZcWIx5RNCe1BH. Fresh unit328 and built cache4scenarios/53checks PASS; real PostgreSQL two-client upsert,1599ms lock failure, expiry, handler miss/hit ownership, after-create rollback and exact cleanup PASS. Hosted bypassed direct trial21:11:56–21:12:05UTC returned502blocked, so real provider-populated hosted cache hit remains NOT_RUN. See PROJECT_STATE's appended PM review for exact commands/contexts/restoration. Next06B coalescing; these backend checks require no human phone/key action.

These are engineering acceptance checks derived from the supplied assessment and the user's higher quality/deployed-YouTube targets. They are not claims that tests already ran. See `IMPLEMENTATION_PLAN.md` for architecture, source citations and Step 01–14 dependencies.

**Latest05b evidence,18October2026:** applicatione3908e6/local buildgAnL8_ZqbnIBxM4j9Hc5l;12manifest entries match, fresh PM99browser checks PASS. Actual hosted direct502blocked; UI recovery preserves all384PDFlines/removal, nooverflow/JSerrors. PDF-only restored; full liveYouTube/physical phone remain unproven. Next06a cache. Worker final regression/build distinctions and PM exact results in PROJECT_STATE/YOUTUBE_UI_05B.

## What counts as evidence

Task **06a** adds `npm run test:captions:cache` after build (owns3110). It uses the actual built HTTP handlers, cache adapter/unique upsert and source repository over explicitly synthetic upstream/Prisma boundaries, plus two isolated Chromium390px contexts. Final local build `g-qTkOYGZcWIx5RNCe1BH`: 4scenarios/53checks, complete ordered fractional captions, distinct owned UUIDs/visitor expiries, foreign access denial, isolated replacement/removal, no TTL renewal, original managed provenance, server-only bypass, uncached proof/shared quotas, authored cache IO failures and no extraction repeat after Source failures. `npm test` now passes328, including40 focused cache tests. Existing smoke14/YouTubeHTTP59/YouTubeUI99/sourceHTTP51/PDFUI75/caption31 pass; all384PDF lines remain checked. See [06a policy, exact command UTC/exits, acceptance map and PM-only synthetic-key PostgreSQL/deployment procedure](CAPTION_CACHE_06A.md). Evidence is under ignored `artifacts/local/06a/`; SQL concurrency/deployment/live providers remain NOT_RUN by worker. Existing forced-provider HTTP/UI journeys explicitly bypass cache. Voice/text retain their earlier named-build evidence; no06a live/phone/conversation result is implied.

Task **05b** adds `npm run test:youtube-ui` after build (owns port3109; output under ignored `artifacts/local/05b/`). Final local build `gAnL8_ZqbnIBxM4j9Hc5l`: **99/99** Chromium checks at1440/390/360px, comprising96 explicitly mocked lifecycle/error/request-count cases and3 actual-route/direct-adapter/DTO journeys with synthetic upstream/Prisma and actual PDF workers. Each integrated journey verifies every caption segment, PDF↔YouTube replacement, all12PDFpages/**384lines**, prior-ID denial and confirmed removal. Exactly6 synthetic watch/player/timedtext sequences, no fallback/duplicate extraction, zero forbidden server fetch attempts;3 parser workers exit. Existing PDF UI75, unit288, smoke14, YouTubeHTTP9/59 and sourceHTTP6/51 pass on that build. Voice10/text10 pass on named earlier task build `AsjSZN96YnXMmiB9YUPRX` with identical proof code/styles. Interactive390px Playwright CLI source switching, blocked error, cancellation and Remove also observed against isolated production routes. [05b acceptance matrix, exact UTC/exits, boundaries, retry/reload policy and PM/phone runbook](YOUTUBE_UI_05B.md). PM accepted implementation/local UI and actual hosted failure recovery; real caption success/physical YouTube phone checks remain open. Fresh PM99of99 retained separately from worker results. Do not treat these synthetic tests as current hosted caption success or conversation readiness.

Task 03c adds `npm run test:youtube:http` after build (owns 3108): nine local production HTTP scenarios/59 checks through actual handlers/adapters/DTOs, synthetic upstream/Prisma boundaries and actual PDF workers. It checks owned YouTube import/read/delete, both PDF replacement directions, failed captions/transaction preservation, two visitors, independent gates, bounded/security cases and caption admission shared across built proof/import routes. All external server fetches are intercepted/blocked; no `.env` database/provider is contacted. Worker left migration NOT_RUN; PM subsequently applied it and verified real preservation/cross-kind races/rollback/constraints, as recorded in PROJECT_STATE. [03c config, migration ordering, acceptance and PM two-process runbook](SOURCE_YOUTUBE_03C.md). Final local build `OpZ8Pxv_gLlUxBYDMRUYr`: unit288, smoke14, PDF UI75, voice10/text10, caption8scenarios31checks, source6/51, PDF9/41 and new YouTube9/59 PASS; exact times/exits and the superseded browser setup failure are in PROJECT_STATE. UI test helper now opens the actual native chooser before setting files, avoiding a hidden-input change before hydration. No live/deployed/physical-device claim is made for 03c.

Task 04b adds `npm run test:sources:http` after build (port 3106), real synthetic PDF parsing through the production owned-source upload/read/delete handlers and a test-only Prisma repository preload. It checks two visitors, replacement, 384 lines, exact 25 MB fixed/chunked, rollback, expiry, disabled/security cases and admission shared with the diagnostic. It never connects to `.env`'s database. PM subsequently applied the migration and verified actual PostgreSQL concurrency/rollback/durability and deployed HTTPS 04b; see the PM addendum. Routine tests still use only synthetic repositories. See [04b runbook](SOURCE_STORAGE_04B.md), ignored `artifacts/local/04b/` evidence and the appended tracker report. Normal smoke/voice/text/caption/PDF harnesses explicitly disable the new ingestion gate.

Task 03b adds `npm run test:captions:mocked` after `npm run build` (port 3104). It runs real local production HTTP against eight isolated synthetic-upstream scenarios; the Node test preload blocks external fetch and supplies only checked fixtures. It proves adapter selection/guard wiring, not live Supadata availability. Setup, teardown, exact bounds and PM live prerequisites: [03b runbook](CAPTION_PROOF_03B.md). Its ignored reports are under `artifacts/local/03b/`. `npm test` also includes the managed adapter's mocked lifecycle/error/admission checks. The existing live direct command remains explicit-only and forces direct even with inherited managed settings.

Use PASS, FAIL, NOT_RUN or BLOCKED for each check. Record the date, task ID, branch/commit or dirty build identity, environment, fixture, actual provider, browser/device, expected result, observed result and artifact path. Never include keys, temporary credentials, database passwords, private source bodies or raw microphone audio in reports.

| Test mode | What it establishes | What remains separate |
|---|---|---|
| Unit/integration with provider mocks | Validation, normalized contracts, reducers, selected error and lifecycle behavior | Live caption availability and real OpenAI behavior |
| Browser automation / Playwright CLI | UI workflow, focus, element state, viewport behavior and observable application responses | Physical microphone/speaker behavior and untested device/browser combinations |
| Fake media or automated speech input | The tested event and UI path with that simulated input | Real permission prompts, acoustic interruption and actual device audio routing |
| Desktop mobile viewport | Layout at the tested width | iOS Safari behavior or the physical on-screen keyboard |
| Browser HTTP offline/throttling | Effects on requests covered by the browser tool | Full WebRTC media degradation or device network handover |
| Live local import | That machine's actual server caption extraction | Success from a cloud host's network |
| Live deployed import | The provider actually used from that deployment | Fee-free direct extraction unless forced and uncached |

A mocked failure case is useful and should be labeled. A screenshot or generated code is not enough to establish an unobserved integration result.

## Establish the commands in Step 01

Inspect the repository and fill the command registry in `PROJECT_STATE.md`: clean install, dev server, lint/type checks, production build/start, migrations, cleanup and focused tests. Pin a compatible runtime and preserve the package-manager lockfile. Do not present `npm test` or any other command as existing until it does.

Use targeted checks after a change. Run the final clean-install/build/migration/test gate on the exact submission build. Do not repeatedly run every test when a focused check resolves the remaining risk.

## Gate A — foundation and first real voice (01–02)

Task 02b adds `/proof/voice`, 38 injected lifecycle/availability checks in `tests/unit/voice-proof.test.ts`, and `npm run test:voice` with its own `playwright.voice.config.ts`. Build first, use pinned Node/npm and leave port 3101 free. The isolated config supplies synthetic server environment values, a loopback unusable database URL and a preload that blocks external fetch; browser routes mock both POSTs and all OpenAI requests, with fake media/RTC/audio and traces disabled. It starts and tears down the production server. The normal smoke config still forces both proof flags false on port 3100. See [02b evidence and acceptance mapping](VOICE_PROOF_02B.md); these tests do not establish live database/provider/phone or microphone-free text success.

Task 02a adds `tests/unit/proof.test.ts` to the existing `npm test` command, now using `node --conditions=react-server --test tests/unit/*.test.ts` so real server-only modules load in Node tests. It covers signed cookies, two-visitor ownership, source/configuration/input/origin rejection before provider calls, admission/concurrency, minimal no-store DTOs and mocked HTTP timeouts/redaction. Database and provider boundaries are mocks, not live acceptance. `tests/smoke/proof-disabled.spec.ts` checks real production route wiring with both feature flags forced false by Playwright; GET is 405 and POST is uncached 503. [Contracts, limits and PM live procedure](REALTIME_PROOF_BOUNDARY.md).

### Local bootstrap checks now available

Use Node 24.22.0 / npm 11.19.1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:validate`, `npm run build`, `npm run browser:install`, then `npm run test:smoke`. The smoke command starts the production build on port 3100 (must be free) and stops it when done. `npm run dev` serves development on port 3000; `npm run start` serves the built app.

Four environment tests exercise optional/missing database configuration, accepted PostgreSQL URLs, rejection with redacted errors, and public-secret configuration. Task 01a adds mocked persistence, altered/missing/expired row, bounded failure and restricted cleanup tests, plus real credential-free CLI/import/private-file checks. These do not connect to a database. Two Playwright checks cover 1440×1000 and 390×844 Chromium viewports, HTTP 200, shell labels, disabled future controls, skip-link focus, horizontal overflow and browser errors. Screenshots are in ignored `test-results/*/shell.png`. No mocks or fixtures are presented as working integrations. There are no ingestion or production conversation tests yet; the separate synthetic voice proof has the lifecycle tests described above.

`npm run db:validate` and offline SQL generation do not establish a working database. Once a real target is configured, use `npm run db:deploy` and `npm run db:status` and capture the migration/persistence evidence below. Task 01a provides fixture-only `write`, `verify` and `cleanup` modes: [exact command and hosted restart runbook](DB_PERSISTENCE_RUNBOOK.md). Start with `npm run db:probe -- --help`; all live modes require `--manifest <absolute-private-file-outside-checkout>`. Application TTL cleanup remains unimplemented. Keep live migration, two-process persistence, actual hosted restart and physical-phone checks NOT_RUN until observed; a mock cannot pass them.

1. Run the verified production build and migration. Open the public HTTPS shell on a phone. Write a temporary source on the server, restart the service through the authorized deployment workflow, and read it while still within its TTL. Expected: shared source state persists, with no permanent secret in client output.
2. In a fresh browser session, establish the anonymous visitor cookie. Use the small server-owned test source for the voice proof. Attempt token/source operations without a valid owned source and from a second visitor. Expected: source ownership is enforced without login or OAuth.
3. Tap Start, grant microphone permission, ask a question and hear a real spoken answer. Record the actual model, browser and live service result. Stop. Expected: microphone capture stops, audio and connection resources close, and a late event cannot restart the session.
4. Inspect token handling without exposing values. Expected: normal OpenAI key remains backend-only; token response is not cached; invalid origin/admission cases fail; no token in URLs, logs or persistent browser storage. TTL is a connection-admission setting, not a hard active-session/spending limit.
5. Perform the small text-only transport proof. Expected: a real typed question can receive text without `getUserMedia`. The finished user fallback is checked in Gate F.

## Gate B — three distinct YouTube checks (03, 06, 07, 13)

Use public videos that currently have accessible captions. Record canonical ID, caption language, caption type when actually known, approximate duration and a short expected fact near the beginning and end. Avoid storing personal or restricted videos as shared fixtures.

### B1. Local direct extraction

1. Start the complete application locally. Configure the direct adapter, disable managed transcript credentials, and bypass both application and extractor caches. Record the actual configuration names established by the implementation.
2. Import two different captioned videos through the application's server route. Prefer one manual and one automatic caption track when metadata confirms this. Inspect text from the beginning and end, language and plausible timing.
3. Confirm evidence identifies the direct adapter and a live outbound extraction rather than a fixture/cache. Do not log full captions unnecessarily.
4. In Step 07, use those real imported captions in the complete local conversation workflow and ask a source-grounded question. This finishes the local full-app check; it is deliberately not a dependency of the early Step 03 extraction proof.
5. Repeat uncached in Step 13 and record exact local setup/reserve commands in the README. A standalone Python demonstration that never reaches the app is insufficient for this project checkpoint.

### B2. Free direct extraction from deployment

1. Use the actual HTTPS deployment, explicitly force direct extraction, disable managed providers and bypass all application/extractor caches. Do not expose provider-selection controls as normal product UI.
2. Import the same two videos; verify relevant beginning/end text and timestamps. Record the actual deployed build, adapter, package version and result. No transcript-service credentials should be required for this run.
3. Timebox the initial hosted experiment to 30–45 minutes after the adapter exists. If blocked, record the observed status/error category without inventing the cause. Do not call every error an IP block.
4. Mark the experiment completed with its observed result; mark the free direct capability PASS only after live hosted success. Managed success, a provider's free trial, an app cache or local success does not establish this capability. Hosting and voice usage may still cost money.

### B3. Deployed managed retrieval and adapter reliability

1. Force Supadata in native caption mode with segments (`mode=native`, `text=false`), then verify the configured alternative where credentials are available. Record which adapter actually supplied captions. Missing credentials are a specific untested/blocking condition, not a second-provider pass.
2. Test automatic selection after the proofs. Repeated public captions may use the validated cache; a cache hit must create a separate visitor-owned Source. Force an uncached import to prove live retrieval again.
3. Use focused provider-response tests: pending job with bounded polling and no resubmission; no captions; empty/null captions despite success status; malformed timing; restrictions; timeout; invalid credentials; rate limiting versus exhausted quota; user cancellation; direct-adapter cooldown. Assert a total import deadline and one coordinated retry layer.
4. Verify direct seconds versus provider milliseconds are deliberately normalized. Cross-check a few timestamp links against the video. Keep language and manual/automatic metadata only when returned reliably.
5. Before submission, use five varied captioned videos, with short/long material and caption types/languages the app claims to support. Record cold versus warm import time and each provider outcome. A provider failure should offer an accurate recovery action and allow another source.

## Gate C — deployed PDF and preview (04–05)

Task 05a adds `npm run test:source-ui` (build first), which owns port 3107 and uses real built source routes/actual parsing with the existing test-only synthetic Prisma boundary. The 75 Chromium checks span desktop, 390 px and 360 px: 72 intercepted recovery/order cases plus 3 actual-parser journeys verifying all 384 lines/12 pages, chooser/401/GET, replacement, corrupt preservation and remove. No real database/provider access or production mock endpoints. Traces/videos remain off; screenshots and UTC/exits are ignored under `artifacts/local/05a/`. See [05a acceptance, boundaries, reload/cancel policy and PM/phone runbook](PDF_UI_05A.md). PM repeated 75/75 and separately passed the actual hosted UI journey through Free PostgreSQL. User subsequently confirmed the requested physical iPhone Files/preview/replace/remove workflow works; model/iOS/browser version unspecified. Source UI does not enable conversation readiness or complete combined Step 05.

Task 04a establishes the separately default-disabled `POST /api/proof-pdf` extraction proof. Generate deterministic synthetic fixtures with `python scripts/generate-pdf-fixtures.py` (reportlab 4.4.9, pypdf 6.10.0, Pillow 11.1.0), build, then run `npm run test:pdf:http`. This runs the actual production Node route with real parser, valid 25,000,000-byte and 25,000,001-byte PDFs, full 12-page coverage, unsupported fixtures, and separately identified injected CPU-worker lifecycle checks. No database/provider access is used. See [configuration, bounds, evidence and PM hosted procedure](PDF_PROOF_04A.md). Local extraction is not hosted acceptance, stored Source creation, preview or grounding. PM has executed these fixtures on Free Render through both extraction proof and production stored-source routes; see 04a/04b addenda. The PDF UI portion passed PM hosted testing and the requested physical iPhone flow passed by user report in 05a; see its runbook for evidence limits.

1. Upload a synthetic multi-page PDF containing distinctive beginning, middle and last-page markers. Verify all markers in extracted preview and preserve page/section boundaries where available.
2. Upload a valid PDF near the documented 25 MB boundary to the actual production endpoint. Record exact file bytes and the chosen MB definition. Multipart request allowance must include framing overhead. Check the accepted boundary and the next-byte/oversized behavior using valid fixtures where practical; do not use only a client-side size check.
3. Check missing file, wrong content despite a `.pdf` name, corrupt PDF, encrypted PDF and image-only/no-text PDF. Expected: useful distinct outcomes, no false claim of successful text extraction, no stuck spinner.
4. Inspect a mixed-layout or table-bearing PDF for readable ordering. Document extraction limits instead of adding OCR to this build.
5. At approximately 390 px, complete PDF and YouTube entry, preview open/close, failed-import recovery and source replacement. Cancel an import or replace it while it is pending. Expected: late results do not overwrite the current source; changing source stops the existing session.
6. Test unsupported context size separately from upload size. A valid upload can extract fully while exceeding the conversation context budget; disclose that state clearly and never silently drop source text.

## Gate D — grounding and context (07)

Prepare a fixed 12-question set with expected evidence: six direct facts spread through the source, two synthesis/comparison questions, two natural follow-ups, one answer absent from the source and one embedded instruction that must remain untrusted source content.

- Hold the behavior prompt constant while comparing plain full text (A) with lossless structured full text and stable section IDs (B). Record prompt/context version, coverage, accuracy, latency and errors. Record later prompt edits as separate iterations.
- Require the assistant to wait until all supported source content has been acknowledged before accepting questions. Stop must remain usable during connection and priming.
- Check facts near both ends of a source, missing-answer behavior, follow-up resolution, source A→B replacement and two-visitor isolation. Do not accept source contamination.
- Budget instructions, source, history and output explicitly. Do not treat chunk labels as token reduction or split raw JSON events and assume transport reassembly. Exercise the context-limit recovery path.
- If a concrete failure motivates lexical retrieval, timebox feasibility to 60–90 minutes and include the live Realtime tool request/result cycle, authorized source lookup, pending-response behavior and grounding tests. A database search query alone is not a completed retrieval feature.

## Gate E — live voice, transcript and lifecycle (08–09)

Use the deployed app with a real source. Ask a factual question, interrupt while audio is audible, then ask a relevant follow-up. Repeat mute/unmute, Stop and Start. Try Stop during connection/priming and replace a source during an active session.

Expected: one active connection, understandable status, prompt interruption, relevant follow-up, no stale source, no overlapping audio and no lingering microphone after Stop. Distinguish generation completion from audible playback completion. Inspect user and assistant draft/final conversation text for duplicates, out-of-order events, interrupted turns and scrolling behavior.

Use focused reducer/lifecycle tests for event reordering and late events. Record actual listening/playback observations separately. Measure several end-of-question→first-audible-response delays and interruptions; report median and worst along with device/network. Around three seconds first audio and one second interruption are provisional internal usability goals, not guaranteed provider service levels or rubric thresholds.

## Gate F — text mode, network and mobile (10–12)

1. Deny microphone permission before starting. Choose text mode, type a source question and receive a real streamed answer. Expected: no microphone acquisition and no successful prior voice session required. Switching modes has a clear history/session policy and only one active transport.
2. With a source loaded, disconnect and reconnect connectivity during setup and during a live conversation. On a physical phone, use an actual connection change when practical. Expected: accurate failure/retry state, preserved source where possible, fresh token/session on retry and no hidden second session.
3. Exercise bounded token/SDP/provider timeouts and cancellation with controlled failures. Text mode also needs an internet connection; the UI must not imply offline answers.
4. On available physical iOS Safari and Android Chrome, test mic permission, playback (including a user-tap recovery when blocked), interruption, mute/stop, text input with the on-screen keyboard and source preview scrolling. Record exact browser/OS/device; an unavailable platform remains NOT_RUN.
5. Use browser automation at 390 px and nearby widths for clipping, reachability, focus, accessible labels, disabled/status states and a complete source→conversation workflow. Status cannot rely on color alone. Check keyboard navigation and reduced motion where applicable.
6. Complete ownership, expiry, deletion/restoration, cache isolation, upload/concurrency limits and cleanup checks. Log categories and timings without sensitive payloads.

## Gate G — exact reviewer script and submission (13–14)

Run against the build intended for submission:

1. Paste an uncached captioned YouTube URL and inspect a real transcript.
2. Upload a multi-page PDF and confirm full extractable text, including the last-page marker; retain the deployed near-limit evidence for this build.
3. On mobile, start a live voice conversation, interrupt and follow up naturally.
4. Exercise poor connectivity and observe useful recovery.
5. Review modular structure, environment handling, source authorization and secret management.
6. Re-run local direct extraction and separately confirm/update the hosted direct result. Review the five-video and PDF fixture table and all material known failures.
7. Run verified clean install/build/migrations and focused tests. Recheck any affected gate after a fix; stale evidence from a materially different build does not pass the final build.
8. Have a fresh-reader setup check from the README. Verify public app, public repository and video links. Record the 10–15 minute walkthrough showing both source paths, voice, source text, controls/fallback, architecture, limits, testing and AI assistance.

The manager reviews all four rubric areas against evidence and keeps untested limitations visible. Protect verification and recording time before optional features.

## Copyable evidence row

| Check / task | Build | Environment / fixture / provider / device | Command or actions | Expected | Observed | Status / exit | Artifact / limit |
|---|---|---|---|---|---|---|---|
| Fill after running | Actual identity | Distinguish local/deployed and mock/live | Exact verified command or manual steps | Concrete outcome | Actual observation | PASS / FAIL / NOT_RUN / BLOCKED | Sanitized path; state gaps |

### Task 02c isolated text checks

Build first, use pinned Node 24.22.0/npm 11.19.1 and free port 3102, then `npm run test:text`. `playwright.text.config.ts` starts/tears down an isolated production server with synthetic config, loopback unusable DB and existing provider-blocking preload. Both proof POSTs are intercepted, external HTTP blocked, real WebSockets closed by routing and a fake constructor supplies controlled events. Media/peer/audio counters prove zero text-path calls even with denied or absent mediaDevices. Trace/video are off; deliberate synthetic screenshots go to ignored `artifacts/local/02c/`. Existing smoke flags remain false (including TEXT_PROOF_ENABLED); voice remains a separate port-3101 suite. Read [02c acceptance map and PM-only checks](TEXT_PROOF_02C.md). No live funding/key is required or authorized by these commands.


## PM local database verification — 18 October 2026

The ignored `artifacts/local/02c/pm-live-db.mjs` harness was run with pinned Node and `--conditions=react-server`, exit 0. It loads actual runtime handlers/Prisma against the existing real database while stubbing all provider fetches. Two visitors, reuse/no expiry renewal, same-process concurrency, cross-visitor/origin rejection, real not-ready/expired rows and voice/text shared admission passed; both fixtures were narrowly cleaned up. Safe evidence: `artifacts/local/02c/pm-live-db.log`. This closes that local runtime/DB subcheck only. Deployed HTTP/browser wiring, cross-process initial-upsert races, provider negotiation and physical audio still require separate evidence. Do not include live DB mutation in routine unit/browser commands.
