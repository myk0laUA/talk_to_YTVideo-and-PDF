# Task 07C — model budget evidence and PM reproduction

Proposed **READY_FOR_REVIEW** for the bounded offline implementation. Actual model readiness is **BLOCKED**. No supported tokenizer/framing binding was established; no production `measured_fit` can be created by this adapter. Full Step 07 remains IN_PROGRESS. PM owns acceptance and subsequent sequencing.

## Official evidence actually opened

OpenAI Docs applied on 18 October 2026. The following official HTML pages were opened with web tooling; their exact Markdown was then retrieved over HTTPS at 23:03:52.556–23:03:53.114 UTC and saved under ignored `artifacts/local/07c/`. `references.jsonl` records each URL/time/status. The web tool's Markdown retrieval returned unsupported-content-type errors; the HTTPS PowerShell fallback succeeded. A first PowerShell `rg` glob had a Windows path error; the subsequent directory plus `-g '*.md'` search succeeded. Neither operation used credentials or a model endpoint. Investigation ended within the 30-minute limit, without investigating/installing an unsubstantiated tokenizer package.

| Official source | Evidence used / limit |
|---|---|
| [gpt-realtime model](https://developers.openai.com/api/docs/models/gpt-realtime) | Deprecated; 32,000 context and 4,096 maximum output. Exact tokenizer and Realtime framing are not established here. |
| [Realtime developer notes](https://developers.openai.com/blog/realtime-api) | Historical 32,768 total, 28,672 input, 16,384 instructions plus tools. The total differs from the current model page; the policy retains both provenance and values. |
| [gpt-realtime-2.1 model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) | Separate model: 128,000 context and 32,000 maximum output. No model migration/account-access inference. |
| [Counting tokens](https://developers.openai.com/api/docs/guides/token-counting) | Exact count endpoint is for Responses input format. Structure has formatting costs not necessarily present in plain text. This does not establish an exact count of Realtime session updates and conversation items or authorize endpoint use for this task. |

## Supported / unsupported matrix

All policies are frozen, server-owned, version `realtime-budget-evidence-2026-10-18-v1`, evidence date `2026-10-18`. Only exact identifiers resolve; even published snapshot/mini names are unsupported unless separately reviewed. No prefix matching, network loading, caller capacity, tokenizer override or verification flag exists.

| Exact identifier | Documented evidence | Application choices | Tokenizer identity/version/encoding | Hidden framing | Admission |
|---|---|---|---|---|---|
| `gpt-realtime` | Current total32,000/output4,096; historical total32,768/input28,672/instructions+tools16,384 | Total32,000/input27,904/instruction ceiling16,384; history4,096/output4,096/base framing1,024/per item32 | Unresolved/null | Unresolved; reserves are provisional, no upper bound | budget_unavailable |
| `gpt-realtime-2.1` | Total128,000/output32,000; separate input/instruction ceilings not established | Total128,000/input123,904; instruction ceiling null; history4,096/output4,096/base framing1,024/per item32 | Unresolved/null | Unresolved; reserves are provisional, no upper bound | budget_unavailable |
| Any other ID, including `gpt-realtime-2025-08-28` | No reviewed exact policy in this revision | None; no fallback/substitution | Unsupported | Unsupported | unknown_model |
| Either ID with another policy revision | Unsupported revision | None | Unsupported | Unsupported | unsupported_policy_revision |

The lower legacy input ceiling is an explicit application choice: min(historical28,672, current32,000 minus reserved output4,096) =27,904. It is not an invented exact provider limit. For2.1 the application input ceiling is128,000 minus4,096; no legacy instruction limit is borrowed. The environment example stays `gpt-realtime`, while the plan discusses `gpt-realtime-2.1`. Proposed future PM decision: evaluate the plan's2.1 model for new work given the legacy model's deprecation, after confirming access and counting support. No configuration/model selection changed here.

## Accounting and boundaries

`model-policy.ts` contains evidence, exact-ID resolution and non-authorizing hypothetical arithmetic. `model-measurement.ts` coordinates the actual07A service, exact07B encoding and local diagnostics. The existing budget/service/admission/controller contracts are unchanged. No route/UI/proof imports these modules.

For a **future substantiated token measurement**, take the maximum of initial and final model-visible instructions (session updates replace instructions), plus the sum of every separately measured item content (including repeated metadata), bounded hidden framing, and history allowance. Check the instruction-plus-tools ceiling independently where established. Then check input <= application input ceiling and input + output reserve <= total. Output is included once; do not subtract output again from the already reduced input ceiling. The complete outer JSON is a separate wire representation, never a token upper bound or the operand used in this content formula. Both loading and final instruction states need support. Audio/history modality costs and provider framing also need a justified bound.

The exported arithmetic helper accepts only a reference to a registered frozen policy; copied/forged policy objects, invalid counts, empty/excess item arrays and unsafe totals fail. Its outputs are `diagnostic_fit`/`diagnostic_over_limit`, `basis:hypothetical_counts_only`, `authorizing:false`. It cannot emit `BudgetResult` or `WireBudget` fits. The offline byte coordinator never invokes it with bytes. There is no runtime verified-token adapter or test flag to promote estimates.

Diagnostics record exact UTF-8 byte and UTF-16 code-unit sizes separately for07A instructions/source/full envelope,07B full outbound JSON, both instruction strings, every item content, original fragment text, and metadata JSON without text. Metadata bytes are an explanatory projection, not an additive token formula. Full content bytes include the text field, escaping and all repeated metadata. Token counts and framing upper bound remain null. There is deliberately no characters/4 estimate or pretend byte-to-token conversion.

Diagnostic matching re-encodes the exact manifest from the canonical variant and checks mode, run identity, fragment bound, events, serialized representation, model, policy revision, hashes and all measured fields. Stale variant serializations and changed/replayed results fail. Diagnostics are non-authorizing even when they match.

Preparation uses existing visitor ownership/expiry validation and07A's final re-read, then measures A/B × voice/text with cancellable local yields and a third authorization read **after all measurements**. Removal/replacement/content or identity change, visitor/source expiry and cancellation deny results. Abort listeners are removed; late rejected reads are consumed and cannot publish a result. The caller input is snapshotted. Immutable results retain complete source/preview, `conversationReady:false`, `providerConfirmed:false`, `productionReady:false`, `issuanceRequiresRevalidation:true`. Source text/full manifests exist only in the in-memory preparation result, never logs. Evidence logs contain hashes/counts/safe categories, no source, owner, cookie or credential.

Local bounds are inherited07B: <=4,096 items, <=16,384 bytes/event (minimum configured bound2,048), <=8,000,000 bytes/manifest; serialized variants also <=8,000,000 bytes for diagnostics. Four projections are retained per preparation; this is bounded local offline allocation, not a measured Free Render concurrency guarantee. No tokenizer/model assets, worker, file, socket or fetch is allocated; no runtime dependency or lockfile change. The dependency audit scans production client chunks and checks unchanged app/proof/shared/storage/schema boundaries. No React/framework behavior changed.

## Sanitized fixture counts

The16 actual prepared fixture rows in `artifacts/local/07c/measurement-matrix.json` cover **each** exact model × PDF/YouTube × A/B × voice/text. All16 are `budget_unavailable/unsupported_tokenizer_and_framing`, unverified diagnostic bytes, token count null, exact reconstruction true, default admission false, provider calls0. The following byte table applies independently to each model; policy and reserves are the matrix above. Stable synthetic source UUIDs/run `budget07c`/expiry2030-01-01T00:01:00Z make the counts reproducible. No actual private source is used.

| Kind / variant / mode |07A full / source JSON bytes|07B outbound bytes|Model-visible item bytes|Metadata JSON bytes|Items|
|---|---|---|---|---|---|
|PDF A voice|1470 /842|3405|1048|326|1|
|PDF A text|1470 /842|3315|1048|326|1|
|PDF B voice|1769 /1141|7877|3596|2832|8|
|PDF B text|1769 /1141|7787|3596|2832|8|
|YouTube A voice|1382 /754|3297|960|328|1|
|YouTube A text|1382 /754|3207|960|328|1|
|YouTube B voice|1897 /1269|7414|3413|2733|7|
|YouTube B text|1897 /1269|7324|3413|2733|7|

Every row:07A serialized instructions512 bytes; model-visible initial instructions794 and final775 bytes. Complete reconstruction is asserted against the source's original text. Source hashes use SHA256 over **UTF-16LE** to preserve lone-surrogate identity: PDF `60c133721fe51f72c7ce3cb81526446afcfbabecdcf4189fd486cfa4f5e6c1da`; YouTube `7d111b797c38ace2f6ea96b6ba69895d448daeeafeae60caf74e101f19cf9766`. Hash encoding is explicit in every diagnostic. These counts establish representation size and source fidelity, never provider token use.

Synthetic arithmetic tests independently check exact total/input boundary and one-over for both policies, legacy instruction boundary15,360 plus1,024 framing and one-over, per-item framing for1,000 small items, invalid/overflow counts and copied-policy rejection. Exact boundary is diagnostic_fit/non-authorizing; one-over is diagnostic_over_limit/non-authorizing. Actual07A byte-measurement exact-fit and one-over fixtures yield offline_fit/context_too_large; both fail `preparePrimingInput` and default controller admission with outbound0. These are synthetic accounting tests; **real tokenizer tests NOT_RUN**.

## PM reproduction and acceptance mapping

Use existing ignored `.tools/node-v24.22.0-win-x64` on PATH; verify Node24.22.0/npm11.19.1. The ignored `artifacts/local/07c/run-checks.ps1` sets synthetic loopback DB, empty provider keys, disabled gates and telemetry off, without reading/printing secret values. To regenerate sanitized evidence, set `BUDGET_EVIDENCE_PATH=artifacts/local/07c/measurement-matrix.json` for `npm run test:budget`. The test file blocks fetch and asserts0 provider calls. Run lint/typecheck/full units/context/priming/build/smoke through the same runner; build precedes smoke. Exact final UTC/exits/build identity and failed attempts are recorded in PROJECT_STATE and `commands.jsonl`. No install or real database is needed.

| Criterion | Evidence |
|---|---|
|1 exact policy/provenance/validation|Frozen exact-ID policies, known/unbound matrix, unsupported revision/ID/forged policy/invalid arithmetic tests; source URLs above|
|2 actual A/B and wire/content accounting|16 real preparations through actual repository validators on synthetic Prisma; byte table, instructions/items/repeated metadata/fragmentation diagnostics; no truncation|
|3 truthful fit/unavailable|No supported tokenizer; unavailable for all real model rows, no verified generator; synthetic fits denied by factory/default controller|
|4 local bounded/cancel-safe|Cancellation initial/local-yield/final-read, listener0/late rejection; final removal/replacement/expiry/foreign/error checks; source/preview/writes unchanged; stale/mismatch matching tests|
|5 adversarial/boundary coverage|Unicode/emoji/combining/lone-surrogate/special-token text for both source types and all4 projections;1,000 small items and large fragmented source; synthetic exact/one-over/instruction/overflow; no-provider sentinel|
|6 dependency boundary|No package installed, lockfile unchanged; server-only markers/imports, client-chunk and unchanged-boundary audit; no runtime assets|
|7 scope/readiness|All readiness flags false; no app/shared/transport/proof/schema mutation, public route, credential issuance, configuration activation, deployment or spending|

No new voice/text browser checks are required because shared runtime contracts and proof wiring did not change; their prior identities remain historical07B evidence. Smoke is fresh default-off Chromium desktop/mobile viewport coverage, never physical phone/audio evidence.

## Remaining evidence / handoff

PM must substantiate the **exact selected model revision's tokenizer/encoding**, pinned asset/package provenance if applicable, ordinary-data treatment of special-token strings, and a conservative Realtime framing bound for instructions/tools, each source item, modality and eventual history. A Responses count for a differently shaped request is insufficient without evidence of equivalence or a proven upper bound. Only then can a future task implement verified token measurements and compare actual provider acceptance/usage.

Future issuance must freshly authorize the source and expiry, match the exact measured manifest/model/policy/mode, retain cancellation safety through issuance, disable truncation, and bind eventual session `max_output_tokens` to the reserved output budget. This obligation is documented, not enforced by this offline adapter. The existing256-token synthetic proof setting does not authorize uploaded sources. Account access, authenticated token-count calls, provider acceptance/actual usage, live A/B grounded answers/latency, WebRTC/WebSocket/media, phones/audio and deployment remain **NOT_RUN**. Neither API key is required for review. No07D/08 work. Existing public03eb7d8/PDF-only deployment is unchanged.
