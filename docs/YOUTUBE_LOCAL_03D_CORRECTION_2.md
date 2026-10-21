# 03D correction 2 — setup fixed; citation grounding still blocked

**Proposed READY_FOR_REVIEW for the bounded correction, not full 03D acceptance.** The initiating setup failure is confirmed as the local priming deadline. Lossless text-only caption packing resolves readiness on the same video. Both real answers completed and survived Stop, but their timestamps fail source verification. PM owns acceptance and any further grounding task; no further provider attempts were made.

## Identity and scope

- Local Windows, Node **24.22.0**, npm **11.19.1**, branch `main`, starting HEAD `3f1075ef14859ad1d0dfd67f3b64e2b85e622923`; dirty working tree, no commit/push/deployment.
- First observed build: `p7vnXBBqeh5AIWrL171RJ`. Corrected observed build: `bqZ5CU0IK1qC7r8hiuWSs`.
- Both built in ignored `artifacts/local/03d-correction-2/offline-checkout`, without private environment files, with fake database configuration, blank real keys and external-network denial for synthetic checks. Dependencies reused through a junction.
- Real verification used the production build on `http://127.0.0.1:3133`, a fresh owned visitor, real PostgreSQL and direct uncached captions. Only the task-owned child received private credentials and text/YouTube flags. Public voice remains enabled and public YouTube disabled; no hosted, phone, audio, voice or managed-caption verification.
- Observer statements were inserted **only into the isolated copy** before building. No inspector/debugger, runtime diagnostics endpoint, production observer flag or committed runtime telemetry. `instrument.mjs` and `observer-edits.json` preserve exact insertions in priming/lifecycle/registry/socket modules. They forward scalar counts/categories to the test-only `SetupObserver`; bounded in-memory offsets and first reason are flushed at cleanup/close, not per event. Caption XML capture is separate, before setup. Subsequent verification copies restore isolated source files; the named `.next` builds retain the documented observation statements.

## First-cause evidence and deadline ownership

The initial controller status exposes `failure: timeout` before `TextLifecycle` maps it to generic `priming`. Capturing before notification/cleanup preserves the initiating reason even when later Stop or socket closure occurs.

| Owner | Existing bound / close route | Finding |
|---|---|---|
| Registry | 5s stream attach; 120s idle; 600s absolute capped by visitor/source expiry; 10s authorization watch | Stream abort/cancel, ownership change, expiry, failed lifecycle or explicit Stop closes the entry. No initiating registry close in session 1. |
| Lifecycle | 25s preparation; 15s connection; 25s priming; 30s response | Priming begins before acquiring the connection. Failed priming notification finishes the lifecycle, aborts acquisition/socket and stops controllers. |
| Priming controller | Fixed absolute 25s deadline, including connection acquisition and admission work | Valid ACKs do not renew it; duplicates do not increase its set. Session 1 first terminal category is `priming_failure/timeout`. |
| Text socket | 10s handshake; queued command age 25s; bounded FIFO and frame/native/queue guards | All 428 native source writes completed at ~1.425s; no write failure preceded the priming timeout. Later close 1006 is cleanup evidence, not the initiating cause. |
| HTTP/browser | Browser 30s liveness watchdog refreshed by snapshots; EOF/failure calls automatic Stop | Server emits watch snapshots during setup. Browser cleanup follows server failure; it did not initiate this timeout. |

Monotonic offsets in milliseconds from the first configuring status (after admission; therefore slightly less than 25,000 at timeout):

| Milestone | Session 1: accepted representation | Session 2: packed text |
|---|---:|---:|
| Initial settings ACK | 1304.295 | 803.178 |
| Final native source write completion | 1425.348 | 823.045 |
| First unique source ACK | 1376.257 | 957.477 |
| Last unique source ACK | 21953.674 | 1275.296 |
| Unique / expected ACKs | 248 / 428 | 7 / 7 |
| Final settings send | absent | 1275.329 |
| Final settings ACK | absent | 1514.165 |
| Ready | absent | 1514.176 |
| First terminal | timeout at 24988.856 | explicit Stop, registry close at 24944.921 |
| Priming cleanup | 24989.490 | 24945.657 |
| Later socket close 1006 | 24991.027 | 24949.030 |
| Cleanup count | 1 | 1 |

Evidence: `session-1-trace.json`, `session-2-trace.json`. This confirms ACK/deadline cutoff on this run; it does not establish a universal provider throughput rate. The previous inspector's timing effect remains unknown.

## Correction and preservation

`src/shared/priming-manifest.ts` now packs consecutive section fragments only for **provider text + YouTube + structured variant B**. It retains source metadata once per message and each fragment's section index/count, exact locator, part, offset, last flag and text. Instructions explain array reconstruction and retain untrusted-source treatment. Oversized sections split without breaking surrogate pairs. Empty sections remain explicit. Event, total-wire and item limits remain unchanged; deadlines, FIFO, source authorization, model and provider policy remain unchanged.

The earlier one-caption-per-provider-item boundary was an encoder choice, not a requirement of source ownership or the ACK controller. The controller still validates every actual packed item's identity, content, previous-item relationship and final settings. Admission regenerates the exact manifest from the complete variant; the old unpacked manifest is rejected. Server preparation provenance, ownership/expiry checks and source identity bindings remain in place.

Real source: `Ks-_Mh1QhMc`, language omitted by UI → **sq**, 428 sections, 3,292 words, 18,822 characters. One uncached extraction only; session 2 reused the same owned source. Full XML → saved source → preview equality passed. Full text SHA-256:

`b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`

Packing changes 428 items / 313,622 wire bytes to **7 items / 105,418 wire bytes**, maximum event exactly **16,384 bytes**. There are 429 lossless fragments because one caption crosses a message boundary. All 428 original locators, texts, order and boundaries reconstruct exactly. Eight real-source voice comparisons (A/B, two bounds, ordinary/UUID run IDs) are byte-identical to HEAD's encoder. A committed synthetic voice hash regression also passes. See `preservation.json`, `packed-preservation.json`, `packed-proof.mjs`.

Supporting changes:

- `tests/priming/setup-observer.ts` and `tests/unit/priming-setup-timing.test.ts`: bounded first-cause observer and deterministic before/after deadline, missing ACK, duplicate ACK, malformed ACK, Stop and actual socket-close ordering checks.
- `tests/unit/text-caption-packing.test.ts`: exact reconstruction, Unicode, empty sections/delimiters, oversized section, timestamp precision, byte bounds, stale bindings, ACK identity/content/previous mismatch and unchanged voice bytes.
- `tests/priming/many-sections.ts`: retains 428 independent items using authored PDF sections for existing FIFO stress/cancellation coverage; explicit YouTube fixture tests packing separately.
- `scripts/lib/full-source-text.ts`, `tests/unit/provider-admission.test.ts`, `tests/text-relay/server.mjs`: verification reconstruction understands packed fragments while retaining complete-source equality checks.

## Verification

All commands below use the pinned executable and npm CLI, orchestrated by `node artifacts/local/03d-correction-2/verify.mjs ...`. Full argv, UTC start/end, exit, environment and log filename are in `commands.jsonl`. No real provider/database access occurred in these checks.

| Check / exact npm command | Result | Evidence under `artifacts/local/03d-correction-2/` |
|---|---|---|
| Pre-fix packing regressions against HEAD encoder | Expected exit 1; absent fragment arrays and 428-item overhead reproduced | `packing-red.log`, `red.mjs` (initial voice-hash placeholder also failed before baseline was recorded) |
| Initial deterministic/focused Node tests | Exit 0; later focused batch 224 tests | `focused-2026-10-21T22-28-55-845Z.log`; command label omits packing filename, actual argv in `verify.mjs` includes it |
| `npm run lint` | Exit 0 | `lint-2026-10-21T22-34-21-869Z.log` |
| `npm run typecheck` | Exit 0 | `typecheck-2026-10-21T22-34-29-320Z.log` |
| `npm test` | Exit 0, **1643/1643** | `test-2026-10-21T22-34-33-280Z.log` |
| `npm run build` | Exit 0, corrected build above | `build-2026-10-21T22-30-24-348Z.log` |
| `npm run test:owned-text` | Exit 0, **417** checks | `test-owned-text-2026-10-21T22-31-07-805Z.log` |
| `npm run test:owned-voice` | Exit 0, **125** unit + **392** built HTTP checks | `test-owned-voice-2026-10-21T22-31-24-566Z.log` |
| `npm run test:voice-adapter` | Exit 0, **113** unit + **571** checks / 48 scenarios | `test-voice-adapter-2026-10-21T22-31-45-004Z.log` |
| `node --conditions=react-server artifacts/local/03d-correction-2/packed-proof.mjs` | Exit 0, real-source exact round trip and eight unchanged voice comparisons | `packed-preservation.json` |
| Browser `npm run browser:cli -- -s=task03dc2 run-code --filename=...` | Exit 0 for import, source capture, session 1, session 2, follow-up and cleanup; answers assessed separately below | Corresponding `.log` files and browser scripts |
| Cleanup audit (`node --conditions=react-server artifacts/local/03d-correction-2/audit.mjs`) | Exit 0 | `cleanup.json`, `answer-checks.json` |

Intermediate failures are retained: three unit failures and the initial owned-text timeout came from verification decoders assuming one top-level fragment. Updating those decoders to reconstruct the array restored all checks; assertions were not removed. An initial observer preload had an incorrect relative path and the server exited before browser/provider use; corrected before session 1. A final unsupported CLI `network` command exited 1 and produced no network evidence; browser close succeeded. No live retry resulted from either tooling error.

## Real answers and remaining blocker

Session 2's browser became ready at `2026-10-21T22:33:10.281Z`. Summary sent at `22:33:10.289Z`, complete by `22:33:12.563Z`. Follow-up sent at `22:33:32.182Z`, complete and stopped by `22:33:34.135Z`. Each used a bounded 45s observation; no automatic retry. The UI showed four finalized turns, zero updating. Full received text is in `session-2.log`, `followup.log`, `answer-checks.json`; screenshot `answers-after-stop.png`.

- **Summary: partial content, failed citations.** Ninety words, broad posture/self-perception theme and speaker attribution present. It omits the requested expectation's explicit two-minute recommendation. Its cited 154.307 seconds is about silent doctor/patient clips, 238 seconds about dominance, 316 about complementary nonverbal behavior and 365 about classroom observations; these do not support the associated hormone or “fake it” claims. Relevant source sections include 141/144 at 433.706/441.009, 153/154 at 469.083/475.285, 401/402 at 1164.251/1168.335 and 408/409 at 1186.231/1189.379 seconds.
- **Follow-up: correct fact, failed citation.** Answer says the Princeton talk lasted **20 minutes before 20 people**, matching section 355. It cites approximately **354.117 seconds**, but section 355 begins at **1040.594 seconds (17:20.594)**. Captions near the returned time concern students entering a classroom. The returned answer must not be presented as fully grounded.

**Exact remaining blocker:** readiness is resolved, but the real model's source citations are inaccurate. The task's two-session allowance is exhausted; a further prompt/grounding correction and verification require a new bounded PM brief. No further model request or unverified prompt change was made. Hosted, physical-phone and YouTube-voice gates remain unverified.

## Cost and cleanup

Official [pricing](https://developers.openai.com/api/docs/pricing) and [model documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) checked this turn: text input $0.60/M, cached input $0.06/M, output $2.40/M; 128,000 context window. The unchanged application output cap is 512. Conservative per-call reservation is `(128000 × .60 + 512 × 2.40) / 1e6 = $0.0780288`, rounded up to $0.079.

New ledger closed at **$0.237 reserved / $0.25 maximum**, **2 sessions**, **2 actual questions/responses**, **1 extraction**. Retained $0.079 for the failed first setup, then reserved $0.158 before session 2's two responses. Actual token usage and billed cost are **UNKNOWN**, not zero; this observer did not collect provider usage. See `ledger.json`.

Explicit Stop retained both questions and both answers; preview remained byte-for-byte unchanged. Malformed replacement URL generated zero API requests. Only the task-owned source was deleted through the normal UI/API: DELETE 200, subsequent owned GET 404. Browser `task03dc2` and task-owned server stopped; port 3133 bind probe passed. Private `.env` hash unchanged; 117 other runtime inputs unchanged. Microphone permission remained `prompt`, not a claim of physical audio testing. Public configuration was not modified. Changed-file SHA-256 inventory, including this report and trackers, is `changed-file-hashes.json` in the evidence directory.

## Acceptance mapping

| Criterion | Status |
|---|---|
| Exact first setup failure without debugger overhead | PASS: priming timeout precedes cleanup/1006 |
| Bounded delivery, ACK identity, cancellation and stable first reason | PASS: FIFO preserved; deterministic regressions and integrated checks |
| Lossless, admitted text-only correction; unchanged voice format | PASS: exact source reconstruction and byte comparisons |
| Same-video readiness and two answers | PASS for transport/completion; **FAIL for citation grounding** |
| Bounded cost/extractions, source removal, process/private-file cleanup | PASS; actual billing unknown |
| Full 03D completion | **BLOCKED**, pending PM review and citation correction scope |
