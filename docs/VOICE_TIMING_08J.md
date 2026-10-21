# Task 08J — owned voice timing

Proposed **READY_FOR_REVIEW** for the bounded offline correction. PM owns acceptance and deployment. Parent Step 08 and all hosted/physical-audio gates remain open.

## Identity and scope

Clean arrival on `main`, HEAD `5729bef807fb83aafae59075af56372ff2907baa`. Delivery is an uncommitted dirty diff. Node **24.22.0**, npm **11.19.1**. Local application build **T2F-_Ar9QGcez-Ya4FExN** in `artifacts/local/08j/offline-checkout`. No deployment, host inspection, public flag change, secret change, real provider call, dependency change or shared database access. Public voice remains enabled according to the PM's last recorded state; this worker did not alter it.

## Changed files

| Files | Change |
| --- | --- |
| `src/server/voice/registry.ts` | Add version/timestamp to the two explicit owned response projections. |
| `src/app/voice-browser-adapters.ts` | Validate relative lifetimes, account for requests with monotonic deadlines, retain expiry through SDP/media/playback and use monotonic production lifecycle clock. |
| `tests/unit/voice-browser-adapters.test.ts`, `tests/unit/owned-voice.test.ts`, `tests/voice-adapter/fakes.mjs` | Deterministic expiry/malformed-contract/server-boundary regressions and monotonic fixture clock. |
| `scripts/verify-voice-preparation.mjs`, `scripts/verify-voice-adapter.mjs`, `scripts/verify-owned-voice.mjs` | Native skew/jump coverage, exact response shapes and existing browser regressions. |
| This report, `PROJECT_STATE.md`, `TESTING.md` | Evidence and PM handoff; original task IDs/history retained. |

## Timing contract and tradeoffs

Preparation and credential responses now have an exact, versioned envelope with `timingVersion: "owned-voice-time-v1"` and `issuedAt` (server epoch milliseconds sampled at projection). Existing preparation `expiresAt` stays milliseconds; provider credential `expiresAt` stays integer seconds. Provider request/response contracts, model, credential validation and TTL are unchanged.

The client computes `remainingMs = expiryMs - issuedAt`, validates its range, and sets `deadline = monotonicRequestStart + remainingMs`. Preparation is bounded to 30,000 ms, credentials to the existing 65,000 ms bound, and source validity to the current anonymous visitor maximum of 3,600,000 ms. Preparation cannot exceed source expiry. Client source expiry comes from the unchanged fidelity-validated source envelope and the same server timestamp. Credential expiry is explicitly converted from seconds once, with a safe-integer millisecond check.

Using request **start**, rather than response arrival, charges the complete round trip, body decoding and validation against the lifetime. This deliberately underestimates validity by request transit and server processing time. Slow or already-expired responses fail closed; no tolerance widening, new retry or clock adjustment is required. The source deadline is retained from preparation and is never reset by credential acquisition. Credential expiration bounds negotiation, not an established voice session; source expiration bounds that session.

The browser adapter and its production lifecycle/priming/diagnostic clock use `performance.now()`. Calendar clock offsets and forward/backward adjustments cannot refresh deadlines. SDP, peer readiness, source-expiry timer, microphone acquisition/attachment and playback admission use the same monotonic deadlines. Per-signal microphone eligibility is removed on connection cleanup. The timer still releases the active connection; checks at asynchronous setup boundaries prevent a delayed timer from admitting expired media. Browser scheduling/suspension is not a hard real-time revocation guarantee, and physical sleep/resume was not tested.

The server remains the authorization authority: registry ticket 30s, acquisition deadline, visitor/source expiry, ownership checks, single-use claim, final source reauthorization, policy, full-source fidelity and pre-microphone ACK barriers are preserved. A client lifetime is never proof of ownership or a substitute for server reauthorization. This correction addresses browser/server relative clocks; it does not change the existing server/provider clock contract.

## Cross-version behavior

Old tabs reject the new extra envelope keys before credentials/media. New tabs reject old responses with missing timing fields, unknown versions, malformed timestamps or extra keys. An old in-flight preparation followed by a new credential response also fails its exact envelope check. There is no legacy fallback that silently restores wall-clock trust. Reload after PM deployment to load the matching client/server contract. Rejected unclaimed preparations retain existing best-effort cancellation and server TTL cleanup.

## Acceptance evidence

1. **Red before / green after:** native Chromium, real adapter and JSON-serialized actual handlers/registry, authored PDFs and synthetic repository. Original HEAD rejects browser offsets -1s, -60s, -300s as `ticket_future` and +60s/+300s as `ticket_expired`; +1s passes. `baseline-all-offsets.json` records all six; the new success assertion exits 1 as expected. Updated preparation suite passes all six plus authored extraction/fidelity/invalid-response cases. Original 08I evidence remains untouched.
2. **Expiry and fail-closed boundaries:** unit coverage includes malformed/versionless preparation and credential envelopes, response-body delay, expiration before credentials, short/expired credential responses, seconds-vs-milliseconds errors, excessive credential lifetime, SDP expiry, source expiry before and during media, server source clipping and expiration at credential reauthorization. Existing tests retain foreign/missing/removed/replaced ownership denials, cancellation/late bodies, server denial, identity/policy/manifest mismatch, lost cancellation TTL and Stop cleanup. Invalid preparation never acquires credentials, peers or media.
3. **Downstream skew and cleanup:** built Chromium runs six offsets through real owned HTTP preparation/credential routes, synthetic provider issuance and synthetic peer/SDP/media. Each changes the calendar clock in the opposite direction while the offer is held, reaches full-source ACKs before microphone, then Stops with zero listeners/live tracks and one close per acquired peer/channel. A short-lived source with a one-hour backward clock jump still fails before SDP/microphone. External network attempts remain zero. Fake audio is not physical audio proof.
4. **Regressions:** full unit suite, owned-text built checks and PDF/source UI checks; no text/PDF implementation changed. Only authored fixtures were used.

## Commands and evidence

All npm verification runs are local in an `.env`-free isolated copy with empty real keys, an unusable loopback database URL and the established network-denial preload. Built browser scripts add their own request interception and synthetic repository/provider transport. Dependencies are reused by junction; production build and runtime use pinned Node/npm. Full UTC start/end, command, exit and log names are in `artifacts/local/08j/commands.jsonl`; the reusable runner is `verify.mjs`. Logs from failed development checks are retained.

| Command | UTC start–end (21 October 2026) | Observed result | Exit | Log under artifacts/local/08j |
| --- | --- | --- | --- | --- |
| `npm run lint` | 06:03:28.668–06:03:33.261 | Clean | 0 | `lint-2026-10-21T06-03-28-668Z.log` |
| `npm run typecheck` | 06:00:04.049–06:00:06.652 | Clean | 0 | `typecheck-2026-10-21T06-00-04-049Z.log` |
| `npm run test` | 06:00:06.653–06:00:13.143 | 1546/1546 units | 0 | `test-2026-10-21T06-00-06-653Z.log` |
| `npm run build` | 05:58:30.898–05:58:35.576 | T2F-_Ar9QGcez-Ya4FExN | 0 | `build-2026-10-21T05-58-30-898Z.log` |
| `npm run test:voice-preparation` | 06:00:13.145–06:00:15.142 | 35 native scenarios; credentials/media/provider 0; cancels 35 | 0 | `test-voice-preparation-2026-10-21T06-00-13-145Z.log` |
| `npm run test:voice-adapter` | 06:02:17.432–06:02:43.025 | 107 units + 526 built checks / 45 scenarios; external network 0 | 0 | `test-voice-adapter-2026-10-21T06-02-17-432Z.log` |
| `npm run test:owned-voice` | 06:00:15.145–06:00:33.070 | 118 units + 392 built checks | 0 | `test-owned-voice-2026-10-21T06-00-15-145Z.log` |
| `npm run test:lifecycle` | 05:59:19.270–05:59:19.958 | 63/63 | 0 | `test-lifecycle-2026-10-21T05-59-19-270Z.log` |
| `npm run test:priming` | 05:59:19.959–05:59:20.789 | 75/75 | 0 | `test-priming-2026-10-21T05-59-19-959Z.log` |
| `npm run test:owned-text` | 05:59:20.790–05:59:34.861 | 417 built checks | 0 | `test-owned-text-2026-10-21T05-59-20-790Z.log` |
| `npm run test:source-ui` | 06:02:42.527–06:03:27.775 | 75/75; actual authored PDF parser + synthetic repository | 0 | `test-source-ui-2026-10-21T06-02-42-527Z.log` |


An initial typecheck exited 2 because the new test accessed `serverRunId` before narrowing the adapter's union return type; an explicit assertion fixed it. The first optional PDF/source UI run exited 1 (72 passed, three integrated cases failed because ignored authored PDF fixtures were absent from the isolated copy). Copied `small.pdf`, `multi.pdf`, `corrupt.pdf` and `manifest.json` from the existing synthetic fixture set generated by `scripts/generate-pdf-fixtures.py`; the repeat passes 75/75. Fixture hashes are recorded in the audit. No application failure was hidden. The red baseline exits 1 intentionally. The first single-offset red run is retained as `red.log`/`red-results.json`/`red-browser.mjs`; all-offset baseline reproduction is `baseline.mjs` with `baseline-all-offsets.log`/`.json`.

Sanitized detailed browser/HTTP reports live beneath `offline-checkout/artifacts/local/08d`, `02d`, `08j`, and the existing source/text suite evidence directories. The fixture-copy setup and the direct first red attempt are recorded separately from the npm runner ledger; their output is preserved. Delivery file SHA256s are in `changed-files.sha256.json`; `audit.json` records build identity, unchanged lockfile, source hashes and released ports.

## Handoff and gaps

PM reviews this diff and evidence, then decides deployment. After deployment, the human should reload the affected Chrome tab, import one small non-private PDF, Start once, and report the exact diagnostic stage/category on failure. On success, permit the microphone, ask one short source question, and Stop. This later normal Start can issue a paid credential; no such live action was performed by this worker.

Hosted correction, real microphone permission, speaker playback, physical iPhone/Android behavior and real grounded voice remain **NOT_RUN** here. The user's actual clock offset is unmeasured. The earlier 25,002 ms preparation timeout remains a separate historical issue; this correction does not claim to resolve it. No later task started and no original Step 01–14 completion status changed.
