# Task 07D — Realtime compatibility probe and PM runbook

## Worker result and boundary

**READY_FOR_REVIEW — implemented for offline preparation only.** PM chooses the model, authorizes any allocation, executes the live check and decides acceptance. Actual session access, live response/usage, WebRTC voice and framing readiness remain **NOT_RUN**. Original Steps 02/07 remain unfinished.

Arrival: `main`, HEAD `ff5a259aaeaac91e7a327046166a1dd43ac6f8d8`; accepted application `8af058e`. Arrival already had PM edits in PROJECT_STATE and untracked WORKER_TASK_07D. Those inputs are preserved. Delivery uses the same HEAD with a dirty diff; no commit, push or deployment. No new application build: all `src/`, routes, shared runtime, production policies, flags, dependencies and lockfile remain unchanged. Existing builds retain their historical identities; this script has no Next build ID.

The PM's 20 October model-list HTTP 200 proves authentication/list visibility only. This worker did not read the real key, mint a credential, contact a provider API, load a real database or connect to Render. Official documentation retrieval is separate from an API request. Supadata and public availability are outside 07D.

## Inspected contracts and implementation

Inspected `src/server/context/model-policy.ts`, `model-measurement.ts`, `src/shared/priming-manifest.ts`, `priming-admission.ts`, `priming-controller.ts`, existing server proof minting, browser proof transports and related tests/scripts. Current exact-wire `measured_fit` admission needs verified tokenizer/framing evidence; 07C has none. Mini has no production policy mapping. The probe does not call that admission or create an alternate production factory. It has its own diagnostic state machine under `scripts/`, with only erased type imports for the existing session/item/transport/clock contracts. No probe import exists in the application.

| File | Purpose |
|---|---|
| `scripts/realtime-probe.ts` | CLI; offline by default; explicit live/model/phase preflight; sanitized JSON and exit code |
| `scripts/lib/realtime-probe.ts` | Fixed sequence, effective-setting/item acknowledgment validation, deadline/cancellation, numeric usage report |
| `scripts/lib/realtime-probe-scripted.ts` | Fixed offline event simulation; no environment, key or network APIs |
| `scripts/lib/realtime-probe-live.ts` | Deferred key read and single server-side WebSocket connection |
| `tests/unit/realtime-probe.test.ts` | 104 scripted/preflight/adapter/boundary cases; all external network entry points blocked |
| `package.json` | `probe:realtime` and `test:realtime-probe`; no dependency change |
| This runbook, TESTING, PROJECT_STATE | Evidence, limitations and PM procedure |

The live adapter reuses `next/dist/compiled/ws` shipped with the existing pinned Next 16.4.2. This is a private bundled path, confined to the developer script; a future Next upgrade must recheck it. No SDK/install/lockfile change is needed. Offline operation never loads that WebSocket implementation. A permanent key is used only as an HTTPS upgrade authorization header on the server; no browser or ephemeral mint is involved. Live key loading reads a nonempty process `OPENAI_API_KEY`, otherwise the single `.env` assignment, using existing dotenv parsing of that line only. It does not load `.env` into `process.env` or import server configuration/Prisma. There is no CLI key/content/endpoint option. Runtime debug logging must be disabled before live preflight.

## Official evidence actually opened

HTML pages were opened with web tooling; exact official Markdown was fetched with HTTPS on **2026-10-20 18:47:41.450–18:47:42.714 UTC**, all HTTP 200. Web tooling rejected the model Markdown content type and oversized server-event HTML; the HTTPS Markdown copies supplied those complete contracts. `artifacts/local/07d/official-sources.json` records each URL/time/status; `official-*.md` retains exact retrieved text. Official sources:

- [GPT-Realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
- [GPT-Realtime-2.1 Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [API pricing](https://developers.openai.com/api/docs/pricing)
- [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events)
- [Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events)
- [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [WebSocket guide, Realtime tab](https://developers.openai.com/api/docs/guides/realtime-websocket)
- [WebRTC guide, Realtime tab](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Realtime cost management](https://developers.openai.com/api/docs/guides/realtime-costs)

The transport/cost URLs currently redirect to combined voice guides. Read their **Realtime** sections: the `/v1/live/sessions` and `session.start` examples belong to another protocol. The selected models' pages list `/v1/realtime` support and no Live/Responses support.

## Model recommendation for PM selection

Recommend exact **`gpt-realtime-2.1-mini` for this first, short protocol probe**. Both models have documented text/audio input and output, Realtime WebRTC/WebSocket support, reasoning capability, 128,000 context tokens and 32,000 maximum model output tokens. Mini reduces the cost of resolving schema/access/accounting compatibility. This does not select the product's final grounding/voice-quality model. Official cost guidance recommends testing larger models first for application quality before mini optimization; this diagnostic checks a single synthetic fact, not instruction-following quality across uploaded sources.

Prices below are USD per million tokens from the opened pricing page:

| Exact model | Text input / cached / output | Audio input / cached / output | Context / model max output |
|---|---|---|---|
| `gpt-realtime-2.1` | $4 / $0.40 / $24 | $32 / $0.40 / $64 | 128,000 / 32,000 |
| `gpt-realtime-2.1-mini` | $0.60 / $0.06 / $2.40 | $10 / $0.30 / $20 | 128,000 / 32,000 |

Both can support the intended WebRTC voice path and a microphone-free text WebSocket path at the documentation level. Neither account/session access nor actual transport behavior is established by that statement. Models/list visibility is insufficient.

Use the common GA Realtime event contract: `session.update`, nested `audio.input.turn_detection`, `output_modalities`, finalized `conversation.item.done`, `response.output_text.*`, `response.done`. `session.updated` confirms full effective settings; it does not echo the client event ID. `conversation.created` is a recognized optional observation after session creation. `conversation.item.added` alone never authorizes the next step. No legacy `modalities`, `response.text.delta` or `conversation.item.created` substitution is accepted.

The model pages' 32,000 output maximum differs from the generic session/response field reference's integer range of 1–4096. The probe uses **64**, within both documented ranges; it does not resolve or silently replace the larger limit. It requests and confirms minimal reasoning effort; rejection or an incomplete capped response is a stopped compatibility result requiring PM review, never a reason to auto-increase limits.

Required future product changes, only if separately assigned: PM selects/configures an exact model; bind its capacities and admission basis; ensure session/output caps and nested event schemas are effective; reauthorize visitor/source/expiry at issuance; wire a real source transport/factory; keep all context acknowledgments before questions/media and confirm provider errors/usage. Existing mint settings and final voice VAD activation require live review. None of those changes is made by 07D.

## Fixed sequence and bounds

1. Validate explicit mode/model/phase and limits before key reading or opening a socket. Only the two exact IDs above are supported. Missing model or phase in live mode, duplicate/unknown arguments, invalid key/limits or debug logging fail preflight without a connection.
2. Open one `wss://api.openai.com/v1/realtime?model=<exact ID>` connection; wait for matching `session.created`.
3. Send one `session.update`: text-only output, VAD `null`, no tools, tool choice `none`, tracing `null`, truncation `disabled`, minimal reasoning, 64 output tokens. Require matching effective `session.updated`, including model/session identity and complete instructions/settings.
4. Add one fixed, short synthetic fact item. Require the exact completed content/item acknowledgment. In acknowledgments phase, stop here without requesting inference.
5. In explicitly selected response phase, add one fixed question after the fact, require its completed acknowledgment and predecessor, then send **one** `response.create`, text-only with the same output cap/no-tools policy.
6. Require the matching response lifecycle and completed final text; compare it internally with the synthetic fact's expected one-word answer. Record only match/length, numeric usage and an estimated text cost. Close immediately. No model text, source content, IDs, request bodies, upstream error text, credentials or audio are logged.

| Resource | Hard application bound |
|---|---|
| Connections / HTTP upgrade attempts | 1; no mint/list/HTTP auxiliary request |
| Client protocol events, response phase | 4: configuration, fact, question, response |
| Request units (`--max-requests`) | 5 = one upgrade + four protocol sends; this is not five REST requests |
| Responses | 1, only after both completed item acknowledgments |
| Output | At most 64 requested tokens, confirmed in effective session settings and repeated per response |
| Session including handshake | 15,000 ms fixed deadline; incoming events never extend it |
| Inbound messages | 128 total, each at most 65,536 bytes |
| Automatic retries, redirects, VAD responses, tools, audio/transcription | 0; no general source input is accepted |
| Acknowledgments phase | One upgrade + two events = 3 request units; zero response requests |

Errors, unexpected events, changed configuration, malformed/missing acknowledgments, connection loss, response failure/incompletion, wrong answer, unusable usage, cap violations, timeout and Ctrl+C stop the run. Timer/subscription cleanup and hard socket termination happen once. Late callbacks cannot send/revive anything. Closing cannot undo a response already sent to the provider or retroactively remove its charge; the PM must review usage even after an error/timeout. No automatic `response.cancel` or second request is sent on teardown.

## Exact proposed live procedure — PM only, NOT_RUN

This is a proposed **single-invocation $0.10 allocation for mini**, not authorization to spend. Do not execute until PM chooses the model and separately authorizes the live run. Verify the intended API project/key and current pricing/usage; record the pre-run balance and UTC time without a key or environment dump. Use the main checkout, not the `.env`-free verification copy. Do not enable application flags or run the application server.

Default no-key simulation:

```powershell
& ./.tools/node-v24.22.0-win-x64/node.exe scripts/realtime-probe.ts --offline
```

**Proposed live response command** (only after authorization):

```powershell
& ./.tools/node-v24.22.0-win-x64/node.exe scripts/realtime-probe.ts --live --model gpt-realtime-2.1-mini --phase response --max-output-tokens 64 --timeout-ms 15000 --max-requests 5 > artifacts/local/07d/pm-live-mini.json
```

No key appears in the command or report. The script lazily obtains it from process environment or the ignored `.env` only after successful live preflight. Use a plain shell without HTTP/native debug logging, custom Node preloads or tracing. Do not pass `--env-file=.env`: it would load unrelated database/application configuration. Record `$LASTEXITCODE` and external start/end UTC separately. Exit 0 means scoped protocol/sample success; exit 1 means failed/cancelled run; exit 2 is sanitized preflight failure with no connection. No automatic rerun follows any exit.

An optional **alternative** PM selection is the acknowledgments-only phase; it is not a step to automatically run in addition to the response probe:

```powershell
& ./.tools/node-v24.22.0-win-x64/node.exe scripts/realtime-probe.ts --live --model gpt-realtime-2.1-mini --phase acknowledgments --max-output-tokens 64 --timeout-ms 15000 --max-requests 3 > artifacts/local/07d/pm-live-ack.json
```

That verifies session/item behavior only; text response/usage remain NOT_RUN. Official cost guidance charges on response creation and currently no connection/bandwidth charge; no transcription is enabled here. Its expected generation cost is $0, subject to current billing terms. A later response run would be a separate PM execution/allocation decision.

### Cost calculation and usage review

For mini, a planning assumption of 1,000 uncached input tokens plus the full 64 output tokens gives `(1000 × $0.60 + 64 × $2.40) / 1,000,000 = $0.0007536`. **1,000 is an estimate, not a tokenizer/framing bound.** Taking the entire documented 128,000 context as conservative billable input plus 64 output gives **$0.0769536**. The proposed **$0.10** allocation covers that documented text-only scenario. It is not a provider-enforced dollar ceiling or proof of universal hidden/ reasoning accounting. Never substitute a byte count for an exact token count.

For comparison, main's corresponding estimates are $0.005536 / $0.513536. Choosing main requires a different allocation (proposed $0.60), with exact ID changed to `gpt-realtime-2.1`; the probe never silently switches models. No audio is sent/generated, so audio pricing is comparison context only.

The report whitelists `input_tokens`, `output_tokens`, `total_tokens`, text/audio/image/cache numeric details and cached modality details when returned. Cached tokens are included within input tokens, not added again. Text estimate is `((input - cached) × inputRate + cached × cachedRate + output × outputRate) / 1e6`; missing cache detail is conservatively treated as uncached. An audio/image usage report fails the text-only check and receives no text cost estimate. Reasoning tokens have no separate field in the fetched Realtime usage schema; preserve uncertainty rather than invent a count.

Expected safe response result: environment `live`, exact chosen model, all four acknowledgment booleans true, `response.created/completed/answerMatches` true, at most 5 request units/1 response/1 close, numeric nonnegative consistent usage, output at most 64 and no audio/image usage. Sanitized sample failure details preserve whatever acknowledgments/usage were observed. Do not count a partial/failing result as compatibility success.

After **any** attempted run, inspect the API project's usage/billing view once usage has settled, match the UTC/model interval and reconcile input/output/cache counts and actual charge with the report. Record absent/delayed usage as unresolved. Stop if costs exceed the allocation, a different model/project appears, automatic responses or multiple generations appear, usage is absent/inconsistent, or any expected contract fails. Preserve only sanitized JSON and human-written numeric observations. Ask PM for the next bounded contract investigation; do not retry, raise caps, enable public features or dump raw provider errors to investigate.

## Provider admission alternative for PM review only

The opened client-event and cost references document that `truncation: "disabled"` returns an error when a conversation is too long to generate a response. Effective `session.updated` plus complete item acknowledgments, disabled automatic generation and explicit response error/status handling therefore offer a **plausible provider-enforced alternative** to an unavailable exact local tokenizer. Item ACKs alone do not prove total context fits: overflow may be detected only at `response.create`, which can cost money and fail. A successful small response/usage sample cannot establish a universal framing upper bound or the fit of another source/history/model.

Smallest proposed later policy change: add a distinct, explicit `provider_enforced` admission basis for a PM-selected model, without fabricating `measured_fit` or a verified tokenizer. Keep source authorization/expiry, full lossless item projection/ACKs, coarse local byte/item/transport resource limits, disabled truncation, bounded history/output and fail-closed provider error handling. Keep setup readiness separate from provider capacity/response success; voice would require a safe explicit capacity-check sequence before microphone/VAD can trigger generation. Any source/model/history/config change must invalidate prior capacity evidence. No silent truncation, retry, retrieval or partial source fallback.

This is viable as a research direction, not yet an accepted replacement policy. Remaining contracts: live effective setting/item schemas, actual overflow/error timing and charge behavior, complete usage/ reasoning accounting, safe history/output reserves and the WebRTC voice transition. The initial short text sample resolves only a subset. PM must decide whether provider rejection at generation is an acceptable product admission rule and assign implementation/testing separately. Production `model-policy`, `model-measurement`, `validateAdmission` and `PrimingController` remain exactly unchanged by this task.

## Verification and acceptance mapping

All final checks used **Node v24.22.0 / npm 11.19.1** in `artifacts/local/07d/offline-checkout`, an isolated input copy with no private `.env`, empty provider keys, unusable synthetic loopback DB and public flags off. Existing installed dependencies were reused via a `node_modules` junction; this is not a new clean-install claim. Prisma generation/Next type generation occurred only in that copy. All fixtures, media/network tests and usage values are synthetic. The 61 retained matrix reports use a deterministic fake clock for their per-run timestamps; matrix `recordedAt` and `checks.json` are actual UTC. The default offline CLI uses actual wall time. No database connection or API call was used.

| Exact command | UTC start–end, 20 October 2026 | Expected / observed | Status / exit | Evidence under `artifacts/local/07d/` |
|---|---|---|---|---|
| `npm run lint` | 18:56:26.052–18:56:30.010 | Zero warnings/errors | PASS / 0 | `lint.log` |
| `npm run typecheck` | 18:56:30.011–18:56:32.714 | Prisma/Next/TypeScript pass | PASS / 0 | `typecheck.log` |
| `npm run test` | 18:56:32.715–18:56:35.706 | 1,056/1,056 | PASS / 0 | `test.log` |
| `npm run test:realtime-probe` | 18:56:35.709–18:56:36.234 | 104/104; zero external attempts | PASS / 0 | `test-realtime-probe.log`, `scripted-matrix.json` |
| `npm run probe:realtime` | 18:56:36.235–18:56:36.442 | Default offline report; 1 simulated connection/4 sends/1 response; live NOT_RUN | PASS / 0 | `probe-realtime.log` |
| `npm run build`, `npm run test:smoke` | Not run | No application/shared runtime changes; no new build required by 07D | NOT_RUN | Protected-input audit |
| Proposed live commands / usage review | Not run | PM model/allocation/execution required | NOT_RUN | No live artifact created |
| WebRTC/microphone/speaker/physical phone | Not run | A text WebSocket check cannot establish these | NOT_RUN | No device/audio evidence |

`checks.json` contains exact command/cwd/runtime/time/exit rows. First focused run passed 98 cases at 18:52:46.0084555–18:52:47.5563714 UTC (`commands.jsonl`, `focused-first.log`); subsequent additions expanded coverage. First isolated lint at 18:54:42.171–18:55:24.160 exited 1 on timer `prefer-const` and an unused test import; corrected, with `checks-first.json`/`first-*.log` retained. Other first-pass checks succeeded. Final code then passed every required check above. The source-fetch wrapper's trailing `rg` used a Windows-invalid file glob and exited 1 after all nine HTTP 200 fetches; per-request success/timestamps remain in `official-sources.json`. Preparation-only source/read commands are not relabeled as verification runs.

| 07D criterion | Evidence |
|---|---|
| 1. No-key offline; explicit valid live preflight | Default CLI PASS; argument/key/limit tests; trapped environment access in offline tests; blocked HTTP/TLS/socket constructors; no endpoint override |
| 2. Bounded scripted protocol/error/timeout/cancel/late/cleanup/redaction | 104 focused cases, fixed-deadline stage matrix, full item/settings comparison, no added-only readiness, request counts, once-only teardown, transport adapter options and synthetic secret sentinels |
| 3. Sanitized provenance/model/time/count/usage/gaps | `scripted-matrix.json`, default CLI JSON, numeric allowlist and model/option projection tests; every fresh result is mocked, live NOT_RUN |
| 4. Pinned required commands; build rule | All five final commands PASS in no-secret copy; unchanged application/shared runtime means build/smoke omitted |
| 5. Concrete PM procedure and proposed allocation | Exact commands/bounds/cost calculations/expected results/stop conditions/manual usage reconciliation above |

Final protected-file/PM-input/link/script/dependency audit, starting/final identities and changed-file SHA256 are in `audit.json`, `identity.json` and `changed-files.sha256.json` under the same ignored directory. Audit verifies 422 protected tracked files unchanged, 81 application source files without probe imports, all six tested code/package input hashes matching delivery, both new relative links resolving and the existing bundled WebSocket constructor export without opening a connection. PM state entries and the task input are byte-identical. The first audit tool attempt exited 1 because its emitted-code text scan also matched a comment mentioning `dotenv/config`; the audit now strips comments before inspecting runtime code. This was an audit-only correction with no product/probe change. The successful audit command/UTC/exit is recorded in `commands.jsonl` and `audit.json`; that initial audit attempt had no independently captured UTC row. WORKER_TASK_07D is a PM-authored input included in the manifest, unchanged by the worker. PM acceptance is pending; no further task has begun.
