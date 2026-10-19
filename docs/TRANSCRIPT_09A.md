# Task 09A — bounded transcript reconciliation

Worker proposes **READY_FOR_REVIEW** for memory-only scripted state. PM owns acceptance. Arrival: clean `main`, HEAD `53b5fd0cb0cd6091467ad735d074cef109405cc5`, including accepted08B `fabc387c47d12bb52a82fc97bcc6b004f418a02f`. Delivery is dirty; no commit, push or deployment. Local build **mr0N_NQANXh4eRxD1_ZIZ**, Node **24.22.0**, npm **11.19.1**. Full Step09, actual model budgeting, live grounding and original08–10 gates remain open. Public03eb7d8 remains PDF-only.

## Official schema mapping

OpenAI Docs applied. Official-domain search and conversations HTML open succeeded; server HTML open exceeded the web tool's content limit. Complete official Markdown schemas and guide were then fetched over HTTPS on **19 October2026UTC / 18 October Toronto**, completed **00:31:56.6384060UTC**. Ignored original copies: `artifacts/local/09a/official-server.md`, `official-conversations.md`; consumed event sections also saved separately as `schema-*.md`. Source hashes are in `audit.json`. Documentation retrieval is not a provider/session request.

- [Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events) — complete item, response, content and transcription schemas, including nested message types and examples.
- [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) — default/out-of-band conversations, generated text and WebRTC interruption; audio cannot be precisely aligned to a transcript to calculate heard words.

All accepted events need documented `type` and `event_id`. Application IDs are ASCII letters/digits/underscore/hyphen,1–128 characters. Indexes are nonnegative safe integers within the caps below. These conservative application guards are not provider capacity claims. The implementation consumes the following projections rather than retaining or validating every unused field of a full event:

| Event | Consumed fields and policy |
|---|---|
| `conversation.item.added`, `.done` | `item.{id,type:"message",role,content}`, optional `previous_item_id:string|null`. These events describe the **default** conversation. User `input_text` is copied as plain text; `input_audio` creates an empty pending part, without treating item completion or its attached transcript as ASR completion. Assistant content is consumed only after response/output correlation. System/tool/image/audio bytes are ignored. Missing predecessor stays provisional; null means no predecessor. |
| `input_audio_buffer.committed` | `item_id`, optional `previous_item_id`; authorizes a user skeleton before item.added, permitting early ASR around the response. No transcript words are inferred from buffer events. The reference description still mentions `conversation.item.created`;09A uses the actual current added/done schemas, not that legacy name. |
| `conversation.item.input_audio_transcription.delta` | `item_id`, optional `content_index`, optional `delta`. Only a known user item and explicit valid index/string are consumed. Omitted optional fields are ignored without guessing index0. |
| `conversation.item.input_audio_transcription.completed` | `item_id`, `content_index`, `transcript`. Authoritative input ASR final replaces that part's draft. Usage, logprobs and language data are discarded. ASR is asynchronous, separately billed according to the ASR model, and may differ from the realtime model's native audio interpretation.09A neither configures nor assumes transcription. |
| `conversation.item.input_audio_transcription.failed` | `item_id`, `content_index`, existence of an error object. Preserves useful draft words and records `transcription_failed`; raw error fields never enter state. First ASR terminal wins, so late delta/failure/completion cannot regress it. |
| `response.created` | `response.{id,status:"in_progress",conversation_id}`. Transcript correlation conservatively requires a valid non-null conversation ID. First such response on the exclusive current transport pins the conversation; missing/null/invalid/foreign IDs are ignored. Unlike08B's control facts,09A does not admit an unseen response with no conversation correlation. |
| `response.done` | Known `response.id`, terminal `status`, optional matching `conversation_id`, `output` array. Array position is output_index. First terminal event wins as a whole; full supported output text is highest-authority assistant content. Missing/malformed output does not invent final words; a later dedicated transcript final can still finish a draft. Done-before-created is ignored. |
| `response.output_item.added`, `.done` | Known `response_id`, `output_index`, `item.{id,type:"message",role:"assistant",content}`. Establishes stable item/output correlation. Unknown responses, reused item mappings and duplicate index assignments cannot alias text. |
| `response.content_part.added`, `.done` | Matching `response_id,item_id,output_index,content_index`; `part.type:"audio"|"text"`, and `transcript` or `text`. Normalizes to `output_audio`/`output_text`. Added snapshots only seed an empty part, never erase a streamed draft. |
| `response.output_audio_transcript.delta`, `.done` | Matching IDs/indexes and `delta` / final `transcript`. Modality final replaces draft; no new bubble. |
| `response.output_text.delta`, `.done` | Same matching fields and `delta` / final `text`. Same normalized part representation; no text connection or question sender is enabled. |
| Existing08B facts | `ResponseState.interruption.{responseId,state}`, `output.{responseId,state}`. Observed synchronously through the existing response callback, including manual/VAD pending/confirmed/failed interruption. Never interpreted as a heard-word boundary. |

Assistant authority, strongest first: response.done output (rank4); output-item/conversation-item done (rank3); content-part done (rank2); modality done (rank1); drafts (rank0). Higher-authority finals can replace weaker finals, even if delivered earlier; same-authority terminal duplicates are stable. Completed aggregate items cannot grow from duplicate aggregate finals. Unrepresented previously observed parts are retained; any unfinished part/conflict keeps the snapshot incomplete. Content-index identity is preserved, so distinct parts are never concatenated into invented HTML or duplicated as separate turns. User input_text uses item completion; user audio uses only ASR terminal events. Generated answer text and input ASR are never substituted for each other.

## Ordering, ownership and privacy

`TranscriptStore.receive(identity,event)` requires the current source/run/connection triple. A fresh lifecycle Start generates new run/connection IDs; callers of the standalone store must also supply a fresh identity for every model session. No replay across sessions is supported. Default-conversation item events are trusted only from that exclusive owned transport; the schema has no conversation ID on these events. Explicit foreign envelopes are rejected. Out-of-band responses (`conversation_id:null`), foreign response IDs, unknown item/content correlations and unsupported events are ignored. There is no orphan raw-event/text queue. ASR arriving before both item.added and committed is ignored; a later empty/pending item remains incomplete, rather than pretending the missing text was recovered.

Trusted07B manifest item IDs are copied into an exclusion Set before binding the connection. Every item path, including aggregate output, checks exclusion before reading content. Priming configuration/source ACKs remain exclusively07B-routed. No source body, raw event, usage, audio, credentials, error messages or owner hash is copied by broad event storage. `identity` is an explicit three-field projection. Only narrow IDs, supported text and authored metadata are retained. Snapshot arrays/objects/parts are frozen copies; mutating a caller-owned event or snapshot cannot modify stored text. Source preview is external and unaffected.

Ordering is a stable topological projection of documented predecessor links and response output indexes. Rooted predecessor chains establish turns, even when their words arrive later. Unknown/missing predecessor turns stay explicitly provisional, with prior presentation/first-seen order as the deterministic tie policy. Distinct output items are constrained by output_index; parts sort by content_index. Existing established turns gain order-preserving edges, so resolving a provisional relationship cannot swap unrelated established turns. Duplicate predecessors/siblings, changed links, cycles, reused output slots and contradictory index constraints set conflict metadata. Edges that would create a cycle are omitted. No ID lexical ordering or arrival of ASR text is treated as conversation chronology. Bounds limit all graph traversal; conflicts do not trigger retries or commands.

The existing08A bridge still owns exactly one real subscription. After complete07B ACKs **and** available media, it routes each event into09A, then08B. The existing response callback copies08B facts; the existing lifecycle observer can read `controller.transcript` after input-only events too.09A owns no subscription, timer, command, media resource, credential or persistent storage. Diagnostic voice/text proof controllers and public UI are unchanged and do not consume09A. No React dependency or new framework API is needed; selected React guidance supports single subscription ownership and bounded Map/Set lookups.

`generation` cancelled/failed/incomplete is independent of part finality and input `transcription_failed`. `interrupted` and interruption state preserve08B facts across later responses. An audio transcript always has `playback:"unconfirmed"`, even if server output is stopped/cleared or local play() resolved. It contains the full generated text available, without calculating a prefix from milliseconds. Pure text parts have playback not_applicable.

## Bounds and terminal semantics

| Bound | Maximum per fresh session |
|---|---|
| Display items |128 |
| Parts per item / content_index |16 /0–15 |
| Characters per part |16000 UTF-16 code units, preserved exactly |
| Total retained characters |128000 UTF-16 code units |
| Duplicate-event ID history |4096, never evicted while active |
| Response IDs |128, never evicted while active |
| Provisional/pending ordering relationships |64 |
| Trusted excluded priming IDs |4096, matching07B manifest application bound |

Tests can lower bounds; they cannot raise them. Overflow rejects the offending text/operation, freezes event/fact ingestion at `phase:"limited"`, exposes a named `limit`, and keeps `incomplete:true`. A partial multi-part aggregate can leave earlier safe parts retained, explicitly incomplete. Nothing is silently truncated or evicted and then presented as complete. No item removal/eviction API exists during a session, so old IDs cannot resurrect removed turns. Unsupported deletion/truncation events do not create or replace text. Recovery requires explicit Stop and **new model session/Start with fresh identity**; clearing09A alone while reusing old model history is not a supported recovery.

| Action | Text/state semantics | Resource semantics |
|---|---|---|
| Stop/failure | Preserves current bounded transcript and its identity for display; draft parts become unfinished, generating responses become stopped. Limited state keeps its limit. Late events/facts cannot change it. | Existing08A/08B/07B abort, timer removal, unsubscribe and media/transport release, once only.09A drops active dedup/exclusion sets. |
| `VoiceLifecycle.reset()` for source replacement | Stops current run and clears all transcript text/identity immediately. Also works after Stop with no new Start. Reentrant observer Start is blocked until reset finishes. | Reuses existing Stop cleanup; does not acquire anything. Source preview remains caller-owned. |
| New Start | Clears prior transcript before preparation; after valid prepared manifest, binds fresh identity/exclusions. No implied model memory across sessions. | Existing admission/priming/media sequence unchanged; unavailable admission still connect0/media0. |
| Dispose/navigation | Clears all retained text/maps/identity permanently; no restart. Old snapshots already handed to a caller cannot be revoked, so consumers must release their references on navigation. | Existing once-only cleanup and observer removal;09A has no listener/timer to release. |

## Verification and acceptance mapping

Use ignored `artifacts/local/09a/run-checks.ps1` in PowerShell7. It selects `.tools/node-v24.22.0-win-x64` and npm11.19.1, overrides provider keys with empty values, uses an unusable loopback synthetic DB and disables public gates. No real `.env` values are printed or live credentials used. Build precedes the browser tests. Full exact UTC command/exits/logs, including failures, are in `commands.jsonl`; the final sequence ran **00:38:27.1160987–00:39:01.7197612UTC,19October2026**.

| Command | Expected / observed | Result |
|---|---|---|
| `npm run test:transcript` |63 deterministic checks, actual07B/08A/08B composition, fetch sentinel0calls |PASS/exit0 |
| `npm run lint` |No warnings/errors |PASS/exit0 |
| `npm run typecheck` |Prisma/Next generation and TypeScript |PASS/exit0 |
| `npm test` |829/829 |PASS/exit0 |
| `npm run test:lifecycle` |63/63 |PASS/exit0 |
| `npm run test:interruption` |62/62 |PASS/exit0 |
| `npm run test:priming` |75/75 |PASS/exit0 |
| `npm run test:budget` |42/42 |PASS/exit0 |
| `npm run build` |Production build mr0N_NQANXh4eRxD1_ZIZ |PASS/exit0 |
| `npm run test:smoke` |14/14, default-disabled shell/routes |PASS/exit0 |
| `npm run test:voice` |10/10 existing isolated fake peer/media/provider regressions |PASS/exit0 |
| `npm run test:text` |10/10 existing isolated fake socket/provider/no-media regressions |PASS/exit0 |

All checks are **local**. Unit/controller fixtures use synthetic source/storage and fake clock/transport/media; browser tests use the actual production build, isolated fake-provider configurations and external-request blocks. Desktop/390px Chromium emulation proves no physical audio/phone behavior.09A is not rendered in these browser suites; they protect existing proofs/default gates, without claiming new UI coverage.

|09A criterion | Specific evidence |
|---|---|
|1 Identity/order | Source/run/connection stale-field tests; late ASR two-turn exact order; committed-before-added; reverse output indexes/multiple parts; missing/cyclic/changed/sibling/index conflict cases; unrelated established order preserved. |
|2 Merge/finality/plain text | Dedup event IDs; both audio/text final/delta permutations; exact spaces/newlines/combining marks/emoji/HTML-looking strings; authoritative aggregate precedence; duplicate aggregates cannot add turns/parts; immutable snapshots/events. |
|3 Normalization/privacy | Input_text/audio and output_text/audio kinds; every actual manifest ID replay excluded; raw error discarded; unknown/null/foreign IDs and omitted indexes ignored; emitted runtime has zero imports/provider/storage/DOM APIs. |
|4 Honest terminal metadata | Cancelled/failed/incomplete and ASR failure separate; composed manual cancel→clear and next response; generated full words preserved; interruption confirmed but playback unconfirmed; no prefix calculation. |
|5 Bounded state | Seven explicit cap cases with frozen late-event replay; actual128item boundary; oversized final/array and invalid cap settings; no eviction; `limits` matrix captures named limit/incomplete/counts. |
|6 Stop/reset/dispose | Composed Stop/sourceA→B/source-reset/dispose with old subscription callbacks; reset without Start clears text; reentrant reset/Stop observers;0timers/listeners/abort listeners and once-only releases; new Start empty. |
|7 Existing composition | Fresh lifecycle63/interruption62/priming75/budget42/full829; no new command except existing explicit interrupt cancel1→clear1; no response.create, no source retransmission; unchanged source fixture and enabled-track state; denied admission0resources. |

`transcript-matrix.json` contains **fixture-only** exact text/order/state snapshots, seven limit cases, interruption/next-turn evidence, source exclusion and terminal cleanup traces with providerCalls0. `identity.json`, `audit.json`, `changed-files.sha256.json` record dirty base/build/runtime, unchanged boundaries, emitted imports, schema/lockfile hashes, released ports and final changed-file hashes. PM should compare hashes, inspect ordering/authority/privacy/caps, rerun `npm run test:transcript` and the full unit suite, then decide acceptance. No human key/phone/purchase action is required for this review.

Development failures retained in uniquely named logs/ledger: initial typecheck exit2 (two unknown event-property narrowings), second typecheck exit2 (test helper mutation inferred too narrowly); both corrected. First transcript run exit1,48/52 passed: three fixture/assertion errors (explicit undefined invoking default helper parameters, incorrect unique-item count) and a boundary regex matching a comment's word `from`; corrected without weakening event/state behavior. Later focused and final required runs all pass. No live/provider failure was involved.

Public transcript rendering/scrolling/accessibility, enabled real ASR, actual text/audio answers, live transport/provider behavior and physical iPhone/Android/audio: **NOT_RUN**. Actual model/tokenizer/framing readiness remains **BLOCKED** from07C. No source-session credentials, budget bypass, real key/spend, persistent history, new service/dependency/DB change/deployment,09B or10 implementation. Full Step09 remains open.
