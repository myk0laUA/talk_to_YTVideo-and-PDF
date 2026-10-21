# Task 08H — preparation timeout isolation

Proposed **READY_FOR_REVIEW (partial diagnosis)**. Hosted cause **NOT_REPRODUCED**; instrumentation is not a root-cause fix. Only Task08H was implemented. PM owns acceptance and any hosted observation.

## Identity and scope

Worker base `main`, HEAD `7fb83b6d36ef07c1fe12bf905b7bd0868fc682c3`; dirty delivery, no commit/push/deploy. Arrival already had modified START_HERE.md, PROJECT_STATE.md and TESTING.md plus untracked WORKER_TASK_08H.md. Those PM changes were preserved. No provider calls, real DB access, environment/secret edits, timeout increase, retries, policy/provider changes, UI changes or public activation. Original Step01–14 and earlier evidence remain intact.

Local build `8J0VB5pnQHv_7xf5I8eC5`, Node24.22.0/npm11.19.1. Checks run in `artifacts/local/08h/offline-checkout`, copied from tracked/nonignored inputs, with a dependency junction, no private .env, empty real provider keys, unusable loopback DATABASE_URL and the established network-denying preload. Built suites use their own isolated synthetic database/provider/browser guards. These are not deployed or physical-device results.

## First failing boundary and deadline map

The only hosted observation remains the user's Chrome row `preparation_http: timeout, 25002 ms`. In `voice-browser-adapters.ts`, that stage awaits fetch headers; response-body parsing would instead be `preparation_validation`. No response headers were observed before the lifecycle's 25-second preparation deadline. No credential request or microphone stage was reached. Device/OS/browser version and matching server log remain unavailable. A bad OpenAI key is not established: preparation checks configuration syntax but never calls the provider.

| Boundary | Code evidence and coverage |
|---|---|
| Browser, hosting ingress, process startup, module evaluation | Precedes handler entry. Neither body nor registry timer covers it. Static route imports transitively load runtime/database/provider/context modules. Runtime constructs the registry and handlers synchronously; repository creation is lazy, so it does not itself connect to PostgreSQL. No top-level await or network call found in this path. Dependency loading/startup delay is a hypothesis, not a reproduced cause. |
| Handler config/origin/cookie/admission | Synchronous before body. Config parsing and cookie HMAC/expiry validation have no asynchronous DB/provider await. Cookie parser caps header length at8192. No outer wall-clock deadline preempts synchronous work. |
| Request body | Existing 512-byte cap and2000ms abort timer; guarded read races abort. Finally cancels reader, removes listener, clears timer and releases lock. Stop's server cancel endpoint cannot identify a preparation before body validation, but browser Stop aborts the original request; body timeout is the fallback. |
| Registry admission | Starts5000ms preparation timer before first repository read; also bounded by visitor expiry. Initial authorization, full context preparation and final reauthorization all share this deadline. |
| Five repository reads | Initial registry authorization; context initial read; context final re-read; provider-projection re-read; final registry authorization. Every read is reached inside guarded-await coverage. Production repository uses lazy DB construction, pool connect timeout5000ms, transaction maxWait2000ms/timeout5000ms, SQL lock1500ms/statement3000ms limits. These are nested limits, not an excuse to sum waits outside the registry deadline. |
| Context/manifest/provenance | Source validation, A/B serialization, manifest encoding, admission validation, provenance hashes and repeated fidelity checks contain synchronous CPU work. There is an explicit setImmediate yield before projection encoding, but timers cannot interrupt synchronous sections. Wall-clock guards reject an expired result when control returns. Large-input CPU cost/event-loop contention remains a hypothesis; no user's private PDF was requested or used. |
| Response creation/delivery | Response.json serializes synchronously after registry success; no registry preparation deadline covers serialization/delivery. A ticket timer remains. Server exit means Response construction completed, not that headers reached Chrome. Reverse proxy/browser/network delay remains separate. |
| Abort/Stop/late work | Registry abort closes entry/timer, guarded-await stops waiting, command/preparation admissions release. Late resolve/reject is consumed and cannot publish a ticket. Underlying read-only database work is not forcibly cancelled by AbortSignal and can finish later within DB limits. Replay tombstones deliberately remain bounded, not refunded. |

A responsive event loop plus a stalled body/read did not reproduce the hosted25s no-headers failure. The instrumentation can distinguish these boundaries in a later observation; it cannot diagnose time before its own code runs.

## Diagnostic change

`src/server/voice/diagnostics.ts` supplies a server-only trace sink. Runtime creates one sink alongside the existing global handler singleton. Handlers mark entry, authorization, body, registry, response and exit. Registry marks initial authorization, context, final authorization and each repository start/end/failure through a per-preparation wrapper. Shared context/database/text code remains unchanged.

Each JSON line contains exactly `event`, `sample`, `stage`, `elapsedMs`, `status`. Event and stage are closed enums; status is an allowed numeric HTTP code or0; elapsed time is monotonic, integer, clamped0–300000ms. `sample` is a process-local wrapping numeric counter, unrelated to request/source/owner IDs and not returned to the browser. Server logging timestamps plus instance/build and one controlled request support correlation.

At most four traces are admitted per60-second monotonic window. Each has at most31 marks plus one reserved exit. Success currently emits19 rows. No per-owner/request map or timer is added; no credential/cancel tracing, raw exceptions, cookies, source/body text, identifiers, keys or SDP. Logging exceptions are swallowed. Finished traces reject late marks. Sampling can omit the target request; absence alone is never proof that the handler was not reached. Limits are per process and reset at restart; overlapping old traces can finish in a subsequent window.

Stage marks indicate entry to that stage. `repository_failed` only categorizes a rejected read; it does not claim a specific SQL fault. Exit404 can mean timeout, cancellation or authorization/source invalidation because existing response semantics are deliberately unchanged. A last repository_start followed by exit404 around5000ms supports a held read boundary; it does not alone establish the DB's underlying cause. Entry→response503 can mean configuration unavailable. Response→exit includes serialization; a long gap there suggests synchronous response construction.

## Acceptance and verification

22 new checks live in the existing owned-voice unit suite (116 total). They verify the successful five-read order; holding each read under deadline, request abort and owner Stop; late resolve/reject suppression; pre-registry body timeout/abort and reader/admission release; sentinel-bearing repository exceptions/auth input; synchronous CPU stall expiry; output schema/caps/sampling/clamping; and throwing log sink isolation. Preparation failure has zero minted credentials. Existing adapter/lifecycle checks separately verify no media on failed preparation and stale/late cleanup.

`artifacts/local/08h/commands.jsonl` records exact UTC start/end, commands, exits, runtime and context. Logs and controlled default-deadline observations are retained there. No new package command was needed. See the verification table below and `changed-files.sha256.json` for the delivery manifest.

## PM-only next observation — worker NOT_RUN

1. Review code, tests and hashes. Deploy only if accepted; record exact commit/build/instance. Keep voice contained until PM explicitly arranges this observation. Do not ask the user to retry the existing build.
2. Use a small authored PDF with known content in one affected Chrome session. Record device/OS/Chrome version and UTC. Ensure the log sink is available and allow a quiet sampling window (at least60s); record whether other preparation traffic may have consumed samples. Keep cookies, document bodies, source IDs and credentials out of evidence.
3. PM may temporarily enable the existing voice configuration for one **preparation-only** diagnostic request using the normal same-origin route and owned authored source. Do not press ordinary Start for a provider-free check: success would proceed to credential issuance. Use a controlled harness that sends only preparation and then the existing cancel request, retaining only HTTP status/duration and safe stage rows. An ordinary Start requires a separate PM live allocation; this worker brief grants none.
4. Correlate browser timing with server JSON rows using UTC/instance/sample. Entry absent is ambiguous between startup/ingress, sampling and missing logs. Entry with a last body/repository/context mark narrows work; timely server exit with client timeout points beyond handler completion. A long response→exit gap narrows serialization; no exit may reflect CPU stall/process termination/log loss. Do not infer cold start or DB failure without the matching evidence.
5. Stop at the first observed boundary, cancel any authored preparation, remove only the authored source through the ordinary owned flow and restore containment. Retain sanitized timing/status only. Working PDF/text must remain enabled. Physical microphone permission, WebRTC, human audible output and phones require separate verification.

Full Step08, hosted voice and release acceptance remain open. No follow-on credential/WebRTC/audio work was started.

## Final local commands —21October2026 UTC

All rows expected pass; all observed PASS/exit0. Synthetic/offline only. No failed command or rerun was needed.

| Command | UTC start–end | Observed | Exit | Evidence log under artifacts/local/08h |
|---|---|---|---|---|
| `node --conditions=react-server --test tests/unit/owned-voice.test.ts` | 04:57:39.805–04:57:46.216 | 116 unit checks | 0 | `owned-focused-2026-10-21T04-57-39-805Z.log` |
| `npm run test:lifecycle` | 04:57:46.233–04:57:47.432 | 63 lifecycle checks | 0 | `test-lifecycle-2026-10-21T04-57-46-233Z.log` |
| `npm run lint` | 04:57:47.436–04:58:25.155 | Clean lint | 0 | `lint-2026-10-21T04-57-47-436Z.log` |
| `npm run typecheck` | 04:58:25.157–04:58:34.165 | Types pass | 0 | `typecheck-2026-10-21T04-58-25-157Z.log` |
| `npm run test` | 04:58:34.167–04:58:41.347 | 1512 unit checks | 0 | `test-2026-10-21T04-58-34-167Z.log` |
| `npm run build` | 04:58:41.349–04:58:59.776 | Build 8J0VB5pnQHv_7xf5I8eC5 | 0 | `build-2026-10-21T04-58-41-349Z.log` |
| `npm run test:owned-voice` | 04:59:18.566–04:59:40.900 | 116 units +392 built checks | 0 | `test-owned-voice-2026-10-21T04-59-18-566Z.log` |
| `npm run test:voice-adapter` | 04:59:40.904–05:00:05.374 | 76 units +444 built checks | 0 | `test-voice-adapter-2026-10-21T04-59-40-904Z.log` |
| `npm run test:owned-text` | 05:00:05.376–05:00:21.459 | 417 built checks | 0 | `test-owned-text-2026-10-21T05-00-05-376Z.log` |
| `node --conditions=react-server artifacts/local/08h/observation.mjs` | 05:01:06.555–05:01:16.879 | Authored success and two default5000ms stalls | 0 | `observation-2026-10-21T05-01-06-555Z.log` |

Default-limit controlled observations: authored_success: HTTP201 at17ms, initial_read_deadline: HTTP404 at5008ms, context_read_deadline: HTTP404 at5011ms. Each minted0credentials; disposed entries/timers/pendingMints0; one deliberate replay tombstone remains. Late held reads did not add diagnostic events. This is synthetic read-stall evidence, not hosted latency. Built runtime logs in offline-checkout/artifacts/local/02d/*-server.log confirm production wiring emits the safe trace.

Documentation-only edit note: an initial Python edit exited1 on Windows default text decoding before updating either tracker; rerun with explicit UTF-8 succeeded. No application/test failure or evidence loss.
