# Task 08B — scripted response, playback and interruption

Worker proposes **READY_FOR_REVIEW** for the bounded scripted scope. PM owns acceptance. Base `main` / `10b5a93f0a9b9f5d4d7aafee33e0e4fd8ac82397` includes accepted08A `ef903f81d9351d770d93e486682323ed8758ccaa`. Delivery is dirty, without commit/push/deployment. Build **CxEEYDJfJk_Tmf2fmj9aL**, pinned **Node24.22.0/npm11.19.1**. Full Step08 remains open; actual model budgeting and live integration gates are unchanged.

## Official protocol mapping

OpenAI Docs applied; full official HTML pages opened and complete Markdown schema pages fetched **19 October2026UTC / 18 October Toronto**. Ignored copies: `artifacts/local/08b/official-client.md`, `official-server.md`, `official-conversations.md`. These are documentation fetches, not provider/session calls. Sources:

- [Client event schemas](https://developers.openai.com/api/reference/resources/realtime/client-events): response creation/cancel, output buffer clear, VAD configuration.
- [Server event schemas](https://developers.openai.com/api/reference/resources/realtime/server-events): response creation/done, speech edges, output buffer events and correlated errors.
- [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations): WebRTC server-managed interruption/truncation and separate audio/control channels.

The following are **consumed field projections**, not replacements for complete schemas. Optional output/usage/audio/transcript bodies are never retained. App identifiers are ASCII alphanumeric/underscore/hyphen,1–128 characters; input timestamps are nonnegative safe integers. These are conservative application bounds, not provider guarantees.

| Event | Consumed projection / meaning |
|---|---|
| `response.create` | Client inference trigger, optionally with event_id/response parameters. **Never sent by this implementation.** Accepted07B enables VAD automatic response creation only after source ACKs. |
| `response.created` | `{type,event_id,response:{id,status:"in_progress"}}`. A fresh ID establishes current generation. A first supplied conversation_id pins the default conversation; differing/invalid supplied IDs and `conversation_id:null` (out-of-band) are ignored. Missing optional conversation_id does not override that binding. |
| `response.done` | `{type,event_id,response:{id,status}}`; terminal status completed/cancelled/failed/incomplete. Ends generation only. No separate invented `response.cancelled` event. |
| `input_audio_buffer.speech_started` | `{type,event_id,item_id,audio_start_ms}`. Input item/timestamp correlation; does not prove assistant silence. |
| `input_audio_buffer.speech_stopped` | `{type,event_id,item_id,audio_end_ms}`. Ends the matching input item. This timestamp is supplied by the server for input, never computed as output truncation time. |
| `output_audio_buffer.started/stopped/cleared` | `{type,event_id,response_id}`. Server streaming/drain/clear information. Completion of generation and server-buffer completion are separate from physical audibility. |
| `response.cancel` | `{type,event_id,response_id}` targets generation. A terminal response may race this request; the session need not fail. |
| `output_audio_buffer.clear` | `{type,event_id}` has **no response_id**. After cancel while generating; clear alone if generation already ended and output remains buffered. |
| `error` | Server event_id plus error.event_id identifies the offending **client** command. Raw messages/details are discarded. Clear ACKs identify responses, not client command IDs. |

The guide's WebSocket paragraph mentions `response.cancelled`; the exact server/client references instead establish cancellation through `response.done` with cancelled status. This implementation uses those event schemas. No WebSocket audio queue, client `conversation.item.truncate`, calculated audio_end_ms, or inference of heard text is introduced.

With acknowledged server_vad/create_response/interrupt_response enabled, speech automatically requests interruption at the server. The controller observes speech, correlated terminal generation and buffer confirmation and sends **zero commands** for VAD. Manual interruption sends targeted cancel then untargeted clear, in that order. If generation is already terminal it sends only clear. If the server confirms clear/drain before a pending cancel write settles, no redundant clear is needed. Manual interruption changes neither mute nor session ownership, creates no response and retransmits no source.

## State, correlation and ownership

`VoiceStatus.response` exposes immutable generation `{state,responseId}`, input `{state,itemId}`, output `{state,responseId}` and interruption `{state,responseId,origin,failure}` with safe issue codes. The enclosing08A identity supplies source/run/connection IDs.08A `playback` still means adapter play availability; `response.output` describes the server buffer. Neither represents physical audibility. All readiness continues to report productionReady:false.

`PrimingBridge` owns exactly **one real transport subscription**. Before07B protocol readiness, it dispatches exclusively to existing priming validation. After the full configuration→all item.done→final configuration barrier, response events are routed exclusively to08B once media is available. Events during pending media are ignored. The priming closed callback remains the transport-failure owner. Response errors therefore cannot accidentally invoke07B's source/provider-failure teardown. No second subscriber overwrites the adapter's listener. The existing proof controller/pages remain separate and unchanged.

08A owns the connection/media releases;07B borrows close through the bridge.08B owns one fixed interruption timer, no extra subscription, and at most one pending operation containing two client command IDs, one response ID and send/ACK counters. Stop invalidates the attempt first, stops08B, clears the timer, stops07B/unsubscribes once, and independently releases tracks/media/playback/connection. Stop/dispose/replacement consumes late resolve/reject without state/send revival. Adapters must enqueue only owned writes when send is invoked; a promise represents completion of that invocation. Already submitted provider operations cannot be recalled. Deferred follow-on clear is guarded again before invocation. No local playback adapter mutation or permanent future-output mute is used.

Policy for ambiguity and disorder:

- Unknown/malformed projections, uncorrelated response/buffer events and out-of-band responses are ignored. Full response bodies, source bodies, credentials and audio are not retained by08B. Source context remains07B's unchanged responsibility.
- Only a first valid response.created establishes an unseen response ID. Ordered data-channel delivery is an adapter obligation. There is no timestamp/sequence in response.created that could distinguish a previously unseen old ID from a genuinely new one. Do not fabricate that correlation. Done-before-created and buffer-before-created are ignored; later missing confirmation times out conservatively.
- Duplicate created/done do not regress terminal generation. Stopped/cleared-before-start latches output terminal for that current response; a delayed started cannot reopen it. Old IDs cannot replace a newer generation or buffer. A late old clear/done may resolve only its own pending interruption.
- Response tombstones retain at most128 retired IDs plus one current ID; input deduplication retains at most128 item IDs and two timestamp scalars. No event history or audio/text queue exists. On capacity, input is disabled and explicit Stop/Start is required; tombstones are never evicted to admit stale work.
- Speech item IDs and monotonic input timestamps suppress reversed/duplicate/stale edges. Speech lacks response_id: if old output and new generation disagree, it updates input only, without attributing interruption to either. Manual clear is also refused in that ambiguity. One pending interruption blocks another until confirmation/timeout; independent current generation/output events still update.
- If a newer response is observed before the prior cancel write settles, its untargeted follow-on clear is suppressed and the old operation reports superseded. If clear was already submitted, an old response-specific acknowledgment never marks new output silent. The protocol cannot guarantee physical ordering across audio/control channels; live integration must verify the actual result.
- Both terminal generation and correlated server buffer clear/drain are required for confirmed interruption, plus settlement of submitted writes. Absence of a started event is not a substitute for buffer confirmation. Confirmed describes protocol evidence only.
- Default interruption deadline5000ms (validated1–120000ms), never extended by duplicates. Missing ACKs produce interruption.failed/timeout, release the timer, preserve current generation and mark only unconfirmed target output unknown. No automatic retry or healthy-session close. Subsequent distinct responses can proceed; no repeated manual action against an already attempted current response.
- Response failed/incomplete and provider command errors produce safe response/interrupt issues, preserving transport. Unknown uncorrelated provider errors become a safe provider issue; unrelated command errors are ignored. A cancel error after known terminal generation leaves independent clear confirmation necessary. Actual send throw/reject/closed transport fails08A connection and releases once, without claiming successful interruption. Late failures from invalidated operations are ignored.

## Reproduce and review

Use `.tools/node-v24.22.0-win-x64` first on PATH. No dependency/install/lockfile change. Ignored `artifacts/local/08b/run-checks.ps1` sets empty provider keys, unusable synthetic loopback DATABASE_URL, disabled public gates and telemetry off. Invoke it in the current PowerShell7 session (`& ./artifacts/local/08b/run-checks.ps1 ...`); Windows PowerShell5 can abort on native stderr under ErrorActionPreference Stop. Real `.env` credentials/DB are not used.

1. `npm run test:interruption` —62 checks, actual08A/07B/08B composition with schema projections, fake clock/media and external-fetch sentinel. Sanitized `interruption-matrix.json` records the scripted journey, delayed old events and denied production admission; providerCalls0. Exact outbound IDs/order/counts are asserted; all tests release timers/listeners and resources once.
2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:lifecycle`, `npm run test:priming`, `npm run test:budget` — lint/type pass, full766/766, lifecycle63/63, priming75/75, budget42/42.
3. `npm run build`, then `npm run test:smoke`, `npm run test:voice`, `npm run test:text` —14/14,10/10,10/10. Local production build; smoke default off, isolated proof suites use fake providers/media/WebSocket/peer and block external fetch. Desktop and390px Chromium viewport only. Ports3100/3101/3102 released.

All listed final commands exited0. Exact UTC, exits and uniquely named logs: ignored `artifacts/local/08b/commands.jsonl`. Final sequence **00:23:16.6921748–00:23:51.0679805UTC,19October2026**. `identity.json`, `audit.json` and `changed-files.sha256.json` identify the dirty tree/build/unchanged boundaries. Source/schema/lockfile/proof/UI/credential/model-policy routes remain unchanged. New shared controller is unwired into public application routes.

Development failures are retained: typecheck00:16:08.7896213–00:16:11.5712645UTC exit2 (unknown property narrowing, corrected); lifecycle00:16:25.3576067–00:16:25.8628719UTC exit1 (Node strip-only rejects parameter properties, changed to explicit fields). An earlier invocation through Windows PowerShell5 failed its wrapper on Prisma stderr before writing a ledger row; its partial log is retained, exact process start/end unavailable (artifact timestamps only in `runner-failure.json`). The evidence-only audit helper initially exited1 at00:22:33.0060461–00:22:34.1588845UTC because it treated git grep no-match exit1 as failure; corrected helper passed, original audit.log retained. A final review then added supplied-conversation-ID pinning plus its test; all required checks were rerun for this final build. Earlier OkPi2gKQFFl2RuAOBjbCK checks remain historical in the ledger. No failed live/provider request occurred. Final validation used the pinned runtime and corrected runner invocation.

## Acceptance mapping

| Criterion | Evidence / result |
|---|---|
| 1 Separate bounded state/readiness |62 interruption checks; generated-but-buffered journey; partial07B/media barriers; default denied production admission; response/input ID and capacity cases. PASS locally/scripted. |
| 2 Automatic/manual interruption | VAD permutations send0; manual generation cancel1→clear1; completed generation cancel0/clear1; duplicate action0 extra; mute unchanged; next independent response; original source/ordered source writes identical. PASS. |
| 3 Stale/disorder/bounds/timeout | Duplicate/reversed/missing/malformed/unknown projections, old response after B, ID caps, fixed5000ms ACK timeout, old timeout preserves new output, no repeated commands. PASS. |
| 4 Subscription/resource composition | One actual subscription and once-only unsubscribe/close; pending cancel/clear/ACK/VAD Stop→sourceB replacement and late resolve/reject; dispose and observer Stop; timers0/abort listeners0/track listeners0. PASS. |
| 5 Failure distinction/races | Response failed/incomplete/cancelled stays connected; sanitized correlated/unrelated errors; cancel/done race; send throw/reject/closed fails connection; new response during pending write/clear confirmation. PASS. |
| 6 Actual composed scripted checks |62 focused,63 lifecycle,75 priming,42 budget,766 total unit; exact command assertions, no response.create/source retransmission, source byte/order preservation, default admission denied; browser14/10/10. PASS within fake scope. |

PM: compare SHA256 manifest, inspect event/error routing and untargeted-clear guards, rerun focused command, review `scripted-worker-journey`, `late-old-after-new`, pending replacement and default-denied traces. No human key/phone/purchase action is required for this review.

Real provider interruption/retention/truncation, actual audible playback/silence, source-grounded answers, real WebRTC/network and physical iPhone/Android: **NOT_RUN**. Actual model/tokenizer/framing binding: **BLOCKED** as before. No production activation, provider credentials/spend, DB/service change, deployment, transcript rendering, text fallback or09/10 implementation. Full Step08 remains IN_PROGRESS pending separately assigned integration/audio verification.
