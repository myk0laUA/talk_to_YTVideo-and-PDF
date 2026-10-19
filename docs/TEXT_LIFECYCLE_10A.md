# Task 10A — scripted microphone-free text lifecycle

**Current PM10A review:** scripted microphone-free text lifecycle accepted in e416874; build VxITBUcDZTwGOLrzLPgZK, all seven hashes match, fresh90focused/919unit PASS. No blocking scoped finding. Next single task `docs/WORKER_TASK_10B.md`: text composer/recovery UI using isolated browser fixtures. No keys/spend/public activation; full live gates and actual07 budgeting remain open. Public03eb7d8 unchanged.

Worker outcome: **implemented; proposed READY_FOR_REVIEW**, PM acceptance pending. Parent Step 10 remains open. Local only; no public composer, socket implementation, credential endpoint, model selection, paid call, service, deployment or mode-switch work.

Arrival: clean `main`, HEAD/base `ac9a5250f1a8b07d7d3fd4d5115a93b0c1b85e0a`, including PM-accepted 09B. Delivery: dirty/uncommitted on that same branch/HEAD. Final local production build **VxITBUcDZTwGOLrzLPgZK**; **Node 24.22.0/npm 11.19.1** from `.tools/node-v24.22.0-win-x64`. Machine defaults 26.5.0/12.0.1 were inspected only. Commands ran 19 October 2026 UTC / 18 October Toronto.

## Official protocol references

OpenAI Docs applied before implementation. Full official client/server pages were fetched on **19 October 2026 UTC** into ignored `artifacts/local/10a/official-client.html` and `official-server.html`; readable extractions, fetch timestamps and SHA256 are retained alongside them. These are schema references, not provider execution evidence.

| Official reference | Fields/semantics consumed |
|---|---|
| [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events) | `conversation.item.create`: client `event_id`, `item.id`, message/user role, one `input_text` content part and `previous_item_id`. `response.create`: `event_id`, `output_modalities:["text"]`, bounded `max_output_tokens`, and `metadata.text_turn` for request/response correlation. Creating an item does not itself request inference. |
| [Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events) | Finalized user `conversation.item.done` confirms exact item ID/content/status and predecessor. `response.created` carries response ID, conversation ID, status, modalities and echoed metadata. Output item/content/text events use response/item IDs and output/content indexes. `response.output_text.done` can also occur for incomplete/cancelled output; `response.done.status` determines generation completion. Final output is reconciled through 09A. |
| [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) | Text input item precedes a separate text-only response request. Existing 07B configuration remains text output with automatic turn detection disabled. |

No unsupported token count or real model mapping is inferred from these pages. They do not establish tokenizer/framing support or account access. Source readiness still uses actual 07B's complete initial configuration → source item final ACKs → distinct final configuration → settled writes barrier.

## Changes and contracts

`src/shared/text-lifecycle.ts` adds `TextLifecycle`, `TextAdapters`, `TextConnection`, safe status snapshots and a narrow turn proposal/permit contract. `tests/priming/text-harness.ts` composes real 07B and 09A with synthetic preparation/transport/clock and test-only positive subclasses. `tests/unit/text-lifecycle.test.ts` supplies 90 focused cases and an emitted-runtime dependency audit. `package.json` adds `npm run test:text-lifecycle`. PROJECT_STATE, TESTING and this runbook record the bounded handoff. Lockfile, dependencies, existing shared modules, server/model/DB policy, proof controllers, public UI/routes and gates are unchanged.

An explicit `start(sourceId)` creates exactly one source/run/connection identity. Active Start is rejected. Preparation must bind every priming source fragment to that source and use text mode. Actual default 07B admission runs on an inert data bridge **before** acquiring a connection; synthetic/unavailable input acquires zero connections. Positive priming overrides are confined to tests. `productionReady` is always false.

`setQuestion(text)` changes a bounded memory-only draft; `submit(text?)` accepts a nonempty question of at most 1,000 UTF-16 code units. `trim()` is only an emptiness check: submitted Unicode, combining marks, spaces, tabs and line breaks are retained exactly. A true return means accepted for processing, not sent/delivered/answered. All in-flight duplicate submits return false without changing the proposal or adding a queue. A later deliberate repeat after a completed answer is a new question.

`admitTurn(proposal, signal)` is the **trusted per-turn boundary**, deliberately unavailable in the default class. The constructor exposes no admission callback, estimates or verified flags. A proposal freezes exact text, source/run/connection, history revision, draft revision, item ID and selected model/tokenizer/policy/capacity/history/output/framing reserves. Positive overrides live only under `tests/`. Object identity binds a returned permit to the exact proposal; that binding is not a token measurement. A future supported server implementation must account the full source/current history and exact question, freshly authorize the source and reserve output/framing before returning a permit. 10A does not implement or claim that accounting. Default turn refusal sends zero user items/responses even after test-only successful priming.

After awaited admission, the coordinator rechecks active identity, current source readiness, history revision, exact text and draft revision (including change-away-and-back). It requires a matching permit and a positive integer output limit no greater than the selected output reserve or schema cap. It sends one uniquely identified user item, waits for its exact finalized ACK **and** write settlement, then requests one text response with matching metadata/output limit. Added-item events and successful local send promises cannot open this gate. No failed/uncertain write or ACK causes automatic retransmission.

Only the matching response metadata can establish the response ID; subsequent output must match that response and known assistant items. Explicit foreign conversation envelopes are ignored. Unknown/foreign/old callbacks cannot complete the submit or add text. The coordinator projects documented text events into the actual 09A store; source priming remains excluded. Final-before-delta, duplicate finals and aggregate final authority use 09A semantics. Completed status alone is insufficient if output is missing, malformed or transcript ordering remains incomplete. Cancelled/failed/incomplete responses preserve received text and stay visibly incomplete. Stop on connection/protocol failure preserves received drafts as unfinished.

Status phases distinguish connecting, priming, ready, admitting, sending, awaiting-response, responding, ended and failed. Status excludes raw provider errors, source payloads, credentials and pending question text; the separately exposed frozen transcript contains only 09A safe projections. A later UI can render these data snapshots; 10A renders nothing.

## Ownership, cancellation and limits

Preparation owns no connection. Adapters own partial acquisitions until successful return and must release them on rejection/abort; successful return transfers exclusive connection ownership. `connection.close()` is the sole underlying resource closer and must release transport-owned bindings, even if other cleanup throws. `subscribe()` owns partial registration if it throws before returning its disposer. The coordinator owns the sole returned event subscription/disposer, not a second transcript subscription. 07B borrows a bridge whose close releases that subscription and its one pending initial configuration, without closing the real connection. Each returned connection is closed once, including late returns after timeout/Stop. Abort alone must not separately close an already transferred connection.

Stop invalidates the attempt before aborting/releasing resources and observers. It clears timers, listeners, pending question/proposal/IDs and policy, closes the connection, and preserves the bounded received transcript. Reset/source replacement performs Stop plus immediate transcript/draft erasure. Dispose permanently clears the store and disables Start. Retry or same-source restart requires a deliberate new Start and begins empty. Voice history is never transferred. Mode-switch UI/orchestration is outside 10A.

Bounds: 1,000 code units per question; one pending submit; no retransmission/queue; one fixed 30-second deadline spanning turn admission through final response and settled writes; 25-second preparation/priming and 15-second connection defaults; all deadlines validated at 1–120,000ms. At most 32 turns/session, 16 known output items/pending response, 80,000 UTF-8 bytes per received parsed event, and 128 attempts/controller. 09A separately caps transcript items/parts/text/event IDs/responses/pending entries. Limits terminate the attempt without dropping source text into the transcript. An adapter must bound raw frame/parsing size before invoking the parsed-event subscription. No persistence or automatic idle work is introduced.

## Synthetic acceptance and failure matrix

All new tests use actual 07B + 09A, authored PDF/YouTube fixtures, fake clock and scripted protocol events. External fetch throws and reports **providerCalls=0**. Positive source/turn accounting is synthetic and is never imported at runtime.

| Criterion/scenario | Expected and observed result | Evidence |
|---|---|---|
| 1: default source admission/unavailable preparation | No connection, no questions, timers cleared; PASS | focused tests; matrix `default-source-unavailable` |
| 1: no microphone/peer/audio/DOM/socket dependency | Complete scripted exchange under throwing getters for navigator, Audio, MediaStream, RTCPeerConnection, WebSocket and document: 0 accesses; PASS | `complete-exchange-denied-media-sentinel` |
| 1: withheld initial/item/final ACK or final write | No submit before complete actual 07B barrier; PASS | focused withheld-priming cases |
| 2: exact item → ACK → response | One item, no response on added-only/local-write-only; one inference request after exact final ACK plus settlement; duplicates add nothing; PASS | `item-ack-write-response-order` |
| 2: invalid/bounded/exact text | Empty/whitespace/overlimit rejected; exact 1,000-unit question and Unicode/whitespace preserved; PASS | focused validation and exact-text cases |
| 3: default/invalid/stale turn admission | Default/no permit/copied proposal/overreserve/zero/NaN/rejection deny sends; changed draft/revision/run cannot use late permit; PASS | `default-turn-unavailable`, admission/race cases |
| 4: correlation/finals/error honesty | Foreign item/metadata/response/conversation ignored; matching malformed ACK fails; final-before-delta/duplicate finals reconcile once; cancelled/failed/incomplete text retained; PASS | focused correlation cases; response status traces |
| 4: bounds | Missing item/response/write/admission confirmation times out, no retransmission; text/output/32-turn caps fail closed; safe immutable snapshots; PASS | focused timeout/limit cases |
| 5–6: pending-phase cancellation | Stop/reset/dispose/source A→B at preparation, connection, priming, admission, item and responding phases; late preparation/connection/permit/event cannot revive/leak; once-only close/unsubscribe; PASS | 24-case cancellation matrix and `source-A-to-B-late-answer` |
| 5–6: acquisition/errors/reentrancy | Rejected setup, wrong source/mode, synchronous closure during subscribe, throwing cleanup, send throw/reject/closed, explicit retry/new-source empty; PASS | focused ownership/failure cases |
| 6: boundary/gates | Five-module emitted runtime graph contains no media/voice/provider/server/test/environment/storage runtime dependencies; no public import/wiring; baseline server/proof/UI/lockfile unchanged; PASS | dependency trace; `identity-audit.json` |

## Reproduction and command evidence

Run in PowerShell 7 at repository root. Existing pinned runtime and dependencies are sufficient; no installation, credentials or real database is needed. `artifacts/local/10a/run-checks.ps1` prepends the pinned runtime, supplies unusable loopback DB/empty provider keys and disables public gates. It records exact UTC start/end/exits and full logs to `commands.jsonl`. Optional `TEXT_LIFECYCLE_EVIDENCE_PATH=artifacts/local/10a/lifecycle-matrix.json` writes only authored synthetic text/state/count traces.

```powershell
$env:TEXT_LIFECYCLE_EVIDENCE_PATH = 'artifacts/local/10a/lifecycle-matrix.json'
./artifacts/local/10a/run-checks.ps1 test:text-lifecycle lint typecheck test test:priming test:budget test:transcript test:lifecycle test:interruption build test:smoke test:voice test:text
```

Build precedes browser tests. Smoke uses the actual production build with disabled gates on loopback3100. Existing voice/text proofs run that same build on3101/3102 with explicit synthetic providers/credentials, fake media/peer/socket, unusable DB and server external-fetch guard; browser external requests are blocked. These suites check regressions in unchanged proof flows; they do **not** exercise the new coordinator through a UI. Chromium desktop1440px/390px viewport tests are emulation, not physical phone/audio evidence. Existing proof screenshots are written under their original02a/02c paths; copied10A browser logs preserve the current build/timestamps.

Initial development failure: focused test command at01:36:24.1560419–01:36:24.8468002UTC exited1 before tests because Node strip-only mode rejects TypeScript constructor parameter properties. Replaced them with ordinary fields; 76/76 passed at01:36:38.6529642–01:36:39.8878939UTC. Added missing setup-timeout/malformed-response/ownership cases; final90/90 passed. Final `git diff --check` initially exited2 for an extra blank line at package.json EOF; removed that whitespace and reran it. Only documentation/evidence and package EOF whitespace changed after the final build. No failing check is omitted from `commands.jsonl`. Earlier lint/typecheck passes are retained with their original identities.

Final command table (all local, pinned runtime; expected result: exit0 with the indicated checks passing):

| Command | Start–end UTC, 19 October 2026 | Observed/exit | Log under artifacts/local/10a/ |
|---|---|---|---|
| `npm run test:text-lifecycle` | 01:40:41.8014986Z–01:40:43.0738746Z | 90/90, exit0 | test-text-lifecycle-014041808.log |
| `npm run lint` | 01:40:43.1162023Z–01:40:48.1064746Z | PASS, exit0 | lint-014043116.log |
| `npm run typecheck` | 01:40:48.1111544Z–01:40:51.6939335Z | PASS, exit0 | typecheck-014048111.log |
| `npm run test` | 01:40:51.7030566Z–01:40:55.0590762Z | 919/919, exit0 | test-014051703.log |
| `npm run test:priming` | 01:40:55.0702401Z–01:40:56.3108727Z | 75/75, exit0 | test-priming-014055070.log |
| `npm run test:budget` | 01:40:56.3217873Z–01:40:57.0213852Z | 42/42, exit0 | test-budget-014056321.log |
| `npm run test:transcript` | 01:40:57.0324154Z–01:40:57.9638069Z | 63/63, exit0 | test-transcript-014057032.log |
| `npm run test:lifecycle` | 01:40:57.9753364Z–01:40:58.9822698Z | 63/63, exit0 | test-lifecycle-014057975.log |
| `npm run test:interruption` | 01:40:58.9924714Z–01:41:00.0303142Z | 62/62, exit0 | test-interruption-014058992.log |
| `npm run build` | 01:41:00.0446742Z–01:41:05.8053762Z | VxITBUcDZTwGOLrzLPgZK, exit0 | build-014100044.log |
| `npm run test:smoke` | 01:41:05.8152011Z–01:41:10.1239231Z | 14/14, exit0 | test-smoke-014105815.log |
| `npm run test:voice` | 01:41:10.1340841Z–01:41:17.5613585Z | 10/10, exit0 | test-voice-014110134.log |
| `npm run test:text` | 01:41:17.5717634Z–01:41:26.4076453Z | 10/10, exit0 | test-text-014117571.log |

## PM review and limitations

Compare seven changed-file SHA256 values in `artifacts/local/10a/changed-files.sha256.json`; inspect correlation, trust boundary, once-only ownership and transcript projection. Rerun focused/default-admission tests and required regressions using the command above. Review matrix traces for the zero-media success, exact ACK order, unavailable budgets and late A→B events. No human key, purchase or phone action is required for this scoped review.

**NOT_RUN:** real sockets/provider answers, uploaded-source grounding, actual token accounting, source-session issuance, public composer/mode switching, physical browser/device/phone/audio behavior and deployment. Real 07C model/tokenizer/framing remains **BLOCKED**; default source and turn admissions fail closed. No source/voice/proof gate was enabled for ordinary public use. Public03eb7d8 remains PDF-only. No 10B/later work started; original Step07–10 dependencies/full completion gates and 11A SQL/scheduling remain open. PM owns acceptance and next assignment.
