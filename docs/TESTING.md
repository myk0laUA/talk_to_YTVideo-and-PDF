# Testing and evidence — Talk to a Document

These are engineering acceptance checks derived from the supplied assessment and the user's higher quality/deployed-YouTube targets. They are not claims that tests already ran. See `IMPLEMENTATION_PLAN.md` for architecture, source citations and Step 01–14 dependencies.

## What counts as evidence

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

### Local bootstrap checks now available

Use Node 24.22.0 / npm 11.19.1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:validate`, `npm run build`, `npm run browser:install`, then `npm run test:smoke`. The smoke command starts the production build on port 3100 (must be free) and stops it when done. `npm run dev` serves development on port 3000; `npm run start` serves the built app.

Four Node tests exercise optional/missing database configuration, accepted PostgreSQL URLs, rejection with redacted errors, and public-secret configuration. Two Playwright checks cover 1440×1000 and 390×844 Chromium viewports, HTTP 200, shell labels, disabled future controls, skip-link focus, horizontal overflow and browser errors. Screenshots are in ignored `test-results/*/shell.png`. No provider mocks or fixtures are presented as working integrations. There are no ingestion/lifecycle tests yet because those features do not exist.

`npm run db:validate` and offline SQL generation do not establish a working database. Once a real target is configured, use `npm run db:deploy` and `npm run db:status` and capture the migration/persistence evidence below. Cleanup has no command yet. Keep these live acceptance checks open.

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
