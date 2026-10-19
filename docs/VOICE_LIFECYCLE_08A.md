# Task 08A — simulated voice lifecycle runbook

Worker outcome: **READY_FOR_REVIEW**, for the assigned preparatory controller only. PM decides acceptance. Original Step 08 and its Step 07 dependencies remain open. No source-session credentials, public UI, provider transport, interruption/truncation, transcript or text switching is implemented here.

## Contract and readiness

`src/shared/voice-lifecycle.ts` exports `VoiceLifecycle`, injected `VoiceAdapters` and resource/status interfaces. It has no React, DOM, environment, network, authorization or persistence dependency. An actual caller must establish source ownership/expiry outside this coordinator; IDs and structurally verified budgets do not authorize a credential. No current app/page/route imports it.

Call `start(sourceId)` only from an explicit user Start action. It returns false while active or disposed. Each accepted Start creates fresh source/run/connection identity; Stop then Start is a deliberate retry. Source replacement must call Stop before starting the replacement. Navigation/unmount must call Dispose. Caller retains source selection and preview; terminal status clears source identity/basis and resource references, without changing preview.

Preparation supplies a voice `PrimingInput` for this exact run/source, or `budget_unavailable`. The existing 07B `PrimingController` performs admission, manifest validation, effective configuration ACK, every complete item ACK and final configuration ACK. A private inert bridge holds only the first configuration write until a connection is returned. No connection is acquired unless actual 07B Start admits the input. Production instantiates ordinary 07B and rejects offline/synthetic/unverified budgets; actual 07C remains unavailable. The only synthetic override is a test subclass in `tests/priming/voice-harness.ts` constructing the existing 07B test subclass. There is no injected admission flag, environment bypass or synthetic implementation in runtime code. Provider protocol is unchanged.

| State | Meaning / questions / media |
|---|---|
| idle | No attempt or resources |
| connecting | Preparing or waiting for connection; no microphone, questions disabled |
| priming | Connected, waiting for 07B complete ACK barrier; no microphone, questions disabled |
| ready + microphone pending | Protocol ACK complete; exactly one media request pending, questions disabled |
| ready + microphone available | Owned live tracks attached disabled first, then enabled only while current and unmuted |
| ended / failed | Attempt invalidated, pending waits cancelled, owned resources released; retry requires Start |

`productionReady` always remains false, including scripted success. `basis` distinguishes synthetic test readiness. `canSendQuestions` is a logical permission getter, not a question sender or proof of provider/audio success. No `response.create` is sent by the coordinator. Playback has separate none/pending/available/blocked states; a successful injected play promise does not establish audible playback or generation completion. Mute only disables outgoing local tracks and leaves playback state unchanged. No automatic media reacquisition, reconnect or text transport runs on failure. Permission/track errors offer retry or selecting text fallback **when available**; no usable text mode is claimed.

## Ownership and cancellation

| Resource | Owner / release contract |
|---|---|
| Partial adapter acquisition | Adapter until successful return. On rejection/abort it must release every partial resource. Tests exercise connection and media partial failures. Never close a successfully transferred resource from a later adapter abort handler. |
| Returned connection | Coordinator alone calls playback.release and connection.close independently, once. Connection.close owns actual peer/channel/transport closure and any adapter-internal listeners. |
| 07B subscription/setup timer | 07B owns them through borrowed bridge. Bridge.close never closes real transport. Thus 07B failure/Stop cannot double-close outer connection. |
| Returned microphone tracks | Coordinator disables and stops each unique track once, separately from media.release. Tracks must initially be disabled. End listeners are disposed before track stop. |
| Media bindings | media.attach is synchronous, cannot enable tracks or acquire more resources. media.release releases non-track bindings independently of track.stop. |
| Playback binding | playback.release must synchronously revoke/pause/unbind playback, including pending play work; late promise completion must not restart playback. This is an adapter contract, not an actual browser audio result. |
| Late successful connection/media | Coordinator releases returned resources immediately, never binds/attaches them to a newer attempt. Late rejections are consumed. |
| Timer/abort listeners | Per-wait timer and listener removed on success, rejection, timeout or Stop, even when underlying work never settles. |

Stop invalidates identity before invoking abort/cleanup; cleanup exceptions cannot skip independent resources. Start is rejected during teardown, and Dispose also rejects observer-triggered Start. After teardown, a subsequent deliberate Start is fresh. State observers are isolated and may synchronously Stop; every async/binding boundary rechecks the attempt. Adapter callbacks may not create unreported resources; a cleanup that throws before actually releasing its own resource cannot be repaired by an outer coordinator. Tests throw after each owned release to prove the other releases still occur.

Default preparation/connection/media waits: 25s/15s/30s. Existing 07B fixed 25s priming deadline starts at admission, includes the connection wait, and never extends on ACKs. Consequently the remaining post-connection ACK budget may be shorter than 25s. Playback play wait uses media deadline; timeout marks playback blocked without failing an otherwise ready attempt. Each configured deadline must be an integer in 1–120000ms. Tests use deterministic 100/200/1000/300ms preparation/connection/priming/media limits.

## Repeatable local verification

Use ignored `.tools/node-v24.22.0-win-x64` first on PATH: Node 24.22.0 / npm 11.19.1. No package installation or lockfile edit is needed. Set empty provider keys, a synthetic unusable loopback DATABASE_URL and all issuance/import/proof gates false as in ignored `artifacts/local/08a/run-checks.ps1`. No real `.env` database or key is used by these checks.

1. `npm run test:lifecycle` — 63 deterministic tests, actual 07B and scripted transport/media/clock. Global fetch sentinel throws on attempted provider access; observed calls 0. Writes sanitized counts/state traces to `artifacts/local/08a/lifecycle-matrix.json`. Scripted transport validates the existing 07B event subset; no question/response sends are allowed by that harness.
2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:priming`, `npm run test:budget` — focused and retained unit contracts, no live DB/provider.
3. `npm run build`, then `npm run test:smoke` — actual Next production shell with all gates off, Chromium desktop/390px viewport. Port 3100 must be free. This is unrelated shell regression coverage, not a new voice UI test.
4. Read `artifacts/local/08a/commands.jsonl` for exact UTC commands/exits and log paths. `identity.json`, `audit.json`, `dependency-audit.json`, and `changed-files.sha256.json` identify the dirty build and source boundaries. No commit, push or deployment is authorized by this runbook.

No proof/shared runtime contract changed: retain voice/text 10/10 each on 07B build `2md7yaSuVz21TjLpuplBd`, 18 October 2026 UTC 22:51:25.088–22:51:32.793 and 22:51:32.803–22:51:42.212, respectively. These are prior fake-media/socket browser results, not fresh 08A results. Audit verifies those files and priming/admission/manifest are unchanged.

## Acceptance / state-resource matrix

| Task criterion / scenario | Observed evidence |
|---|---|
| Single attempt / explicit identities / fresh retry | Active Start rejected; four Start→Stop cycles use different run/connection IDs and reset mute; source/run/mode mismatches rejected before connection. Terminal state has no identity/context payload. |
| Default admission before resources | Actual 07C budget-unavailable preparation, plus synthetic/estimated/unverified production inputs: connections0, microphone0, question sends0, timers0. |
| Actual 07B barrier | Configuration ACK withheld, one source item withheld, final ACK withheld: microphone0; timeout fails and closes once. Complete configuration + all items + final ACK: exactly1 media request. Partial item.added/ACK semantics remain in unchanged 07B suite75. |
| Successful Start→Mute→Unmute→Stop | Sanitized named trace: one preparation/connection/media, two fake tracks each stopped1, attach1, media release1, playback release1, connection/transport close1, unsubscribe1, final timers0/listeners0/question sends0. Mute preserves playback availability. |
| Stop/sourceA→B at preparation/connection/priming/media/ready | Ten replacement cases consume late resolve/reject and stale ACK/close/track callbacks, with no A send/media/state revival. B has only B source items, starts unmuted/unready and completes its own barrier. Pending media success is immediately stopped; pending connection success immediately closed/unbound. Delayed-source traces contain source labels A/B, not source body/credentials. |
| Pending 07B configuration/item/final write | Six late resolve/reject cases through the actual composition; no old send/media after Stop, B independent. Final ACK alone cannot overcome pending final write. |
| Cancel/dispose/navigation | Pending preparation, connection and media plus ready disposal cannot revive; never-resolving preparation leaves abort listeners0/timers0 immediately. |
| Partial/rejected acquisition and cleanup exceptions | Preparation/connection rejection, partial connection/media failure, closed return, subscribe/send throw, empty/ended track, attach/listener failure, and throwing track/listener/media/playback/connection cleanup. Independent owned releases still run once; raw error text excluded. |
| Mute and microphone recovery | Setup mute persists to delayed tracks; ready mute/unmute toggles only live current tracks; stopped/ended tracks stay disabled. Denial/unavailability ends safely with actionable future-text guidance and no fallback invocation. |
| Playback, transport close and deadlines | Rejection/timeout marks playback blocked separately; late play success cannot change stopped state. Close at priming/media/ready releases once with no reconnect. Preparation/connection/media fixed deadlines consume late resolve/reject; withheld ACK deadlines remain owned by 07B. |
| Source/secret boundaries | No source bodies or credentials in state/evidence; only priming consumes source payloads in memory. No new network/media implementation, environment flag, credential path, server import, persistence or runtime synthetic bypass. No app or proof wiring changed. |

PM review: inspect ownership and bridge admission order, compare changed-file hashes, rerun `npm run test:lifecycle` and review the successful/muted/replacement/unavailable traces. Required work after this task remains separately assigned: real model/tokenizer/framing binding, source issuance/reauthorization, real WebRTC/media adapter/UI, audible playback and interruption/truncation, transcript, genuine text fallback, provider grounded answers, network and physical iPhone/Android testing. All are **NOT_RUN** here; model binding remains **BLOCKED**. No human key, purchase, phone or deployment action is required to review the simulated work.
