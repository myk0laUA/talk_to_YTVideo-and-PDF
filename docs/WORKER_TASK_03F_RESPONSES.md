# Task 03F — implement and evaluate a Responses grounding candidate

Use prompts/WORKER_PROMPT.md and required handoffs. Sole active worker task, parent Steps 03/07/10. Starting HEAD 20f30a4d2bcc5a7787a41c939a4bd628d955c73c. User explicitly chose continued grounding work. PM selects this concrete alternative; do not repeat Realtime prompt/index/parser experiments.

## Outcome and scope

Implement a reusable, isolated server-side text grounding candidate and a reproducible evaluation harness. Determine whether it can produce readable answers with semantically supporting caption references on the actual failed source. This is executable implementation, not another design-only report. Keep it disconnected from public routes until PM reviews results. No deployment, public flags, voice/PDF changes, source acquisition, schema migration, retrieval or embeddings.

Use Responses API with pinned `gpt-5.4-mini-2026-03-17`, reasoning effort medium, max_output_tokens 4096, store false, truncation disabled, no tools or background processing. Do not change PROVIDER_TEXT_POLICY: this is a separate candidate, not a drop-in Realtime model substitution. Explicit bounded source and history supplied each call; no previous_response_id or provider-managed conversation. Keep secrets backend-only. Use existing authorized key without printing it or copying private environment files.

Official references checked by PM: https://developers.openai.com/api/docs/models/gpt-5.4-mini and https://developers.openai.com/api/docs/guides/structured-outputs . Snapshot supports structured outputs and medium reasoning. Strict schema constrains structure, not truth. Verify exact request syntax against current official docs before implementation. Use OpenAI Docs skill; no UI skills needed for this isolated task.

## Implementation

Build the candidate in a separate server-only module, with injected transport and cancellation for tests; discover appropriate filenames first. Preserve full ordered canonical captions and locators, including empty captions and precise times. Input source is an explicitly supplied validated DTO; this module must not independently read arbitrary database rows or accept browser-selected content. Its future caller must still enforce ownership/expiry. Fixture proof is not ownership or app readiness proof.

Use strict JSON schema with a bounded array of short answer statements, each carrying its supporting segment IDs and a classification (source claim, inference, or unavailable). Required fields/additionalProperties false throughout; validate all bounds server-side even if unsupported schema keywords must be omitted. Require support for each material assertion and its antecedents, allow several adjacent actual IDs when needed, and clearly attribute speaker claims. IDs resolve only to the supplied canonical source; timestamps, URLs and excerpts are constructed by code, never copied from model output. Unknown IDs remain unconfirmed; never shift IDs or expand windows after scoring to manufacture support. Unavailable answers need no invented evidence. Inferences must identify their source basis and be labelled.

Preserve readable answer statements independently of failed reference resolution. Do not display raw partial JSON as prose. Handle refusal, incomplete/token exhaustion, malformed output, transport errors, timeout, abort and late results explicitly. For this candidate a complete validated response is sufficient; document buffering/first-answer latency rather than claiming production streaming. No automatic retries or repair-model calls. Add meaningful injected-transport tests for these cases and source isolation. Tests must prove full source preservation and that unsupported references cannot erase the answer or acquire verified status.

## Preregistered live evaluation

Estimated effort 60–90 minutes; stop at this bounded outcome. Before any paid call, freeze/hash implementation, schema, prompt, questions and scoring. Use saved public source from artifacts/local/03f-single-id or prior source-selection/route-a evidence; independently compare all 428 captions with retained acquisition evidence. Expected language sq, fullText hash b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98. Do not switch language or reduce source. No fresh database/source import needed for this capability test.

NEW allocation: at most four Responses calls, <=US$0.50 estimated total, no retries; previous allocations remain closed. Standard documented price is $0.75/M input and $4.50/M output, including billed reasoning output. Reserve each request conservatively before sending, with <=128000 input tokens and 4096 total output tokens ($0.115/request rounded up). Use a verified token bound including instructions/schema/history; reject if unbounded or over allocation. Verify pricing first; if unavailable or higher than allowance, report blocker. Capture returned token usage including reasoning where available; distinguish estimate from actual billing. Count errors/aborts as calls. Do not silently change model if access fails.

Four calls, frozen in this order:
1. Exact saved summary question from the previous comparison, same source, fresh context.
2. Exact saved Princeton follow-up, with preceding question and candidate answer as bounded history.
3. Same summary question in fresh context, to catch one-shot luck.
4. A source-absent factual question chosen and documented before calls after independent source inspection; expect explicit uncertainty, not fabricated facts/citations.

Score every statement against the actual selected original passages, independently of model self-assessment. Both summaries must cover the central message, attribute scientific claims, and have complete support for each material assertion (including compound claims/antecedents); correct existing IDs alone do not pass. Princeton answer must give 20 minutes/20 people, supported by original segment355 at1040.594s; additional factual assertions require their own actual support. The absent-fact question must not invent evidence. Record exact outputs, citations, excerpts, start/completion latency, usage and failures, not only passing samples. No post-live prompt edits, resampling or model judges. A passing four-case gate is scoped evidence, not universal reliability.

## Checks and return

Use pinned Node24.22.0/npm11.19.1. Run new candidate unit tests, affected context/evidence tests, npm run lint, npm run typecheck and npm test. Establish/document the exact opt-in harness command; it must be inert during ordinary tests and require explicit live invocation. Use fake configuration for offline tests. Run npm run build if candidate is part of the application compilation; record actual build identity, never reuse an unrelated .next ID. Verify existing voice/PDF manifests and runtime entry points unchanged. No browser or physical-phone claims for this harness.

Return docs/YOUTUBE_RESPONSES_03F.md, updated PROJECT_STATE/TESTING, changed file hashes, exact commands/exits, frozen request identities, all four per-claim evaluations, spend ledger and cleanup. Put raw evidence under ignored artifacts/local/03f-responses/. Clean up only task-owned processes/files, never shared data. Return READY_FOR_REVIEW and stop. If successful, next PM task integrates the candidate with owned text lifecycle/Stop/SSE and live UI checks. If unsuccessful, report the precise semantic or protocol failure without redesigning or spending further. Full03F remains IN_PROGRESS until integrated evidence passes.
