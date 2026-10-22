# Task03F — enforce composition reference choices

Use prompts/WORKER_PROMPT.md and required handoffs. Sole active task. PM reviewed composition control:4hashes/140fresh tests pass; sufficient input evidence, both semantic outputs FAIL. One output concatenates/truncates two long block IDs inside a schema-valid free string. Other output uses valid but insufficient references. Fix the demonstrated reference-contract weakness without claiming it explains all semantic failures.

## Implementation boundary

In the isolated composition candidate only, replace model-facing long block hashes/free-form reference strings with short request-local handles p1..pN and a dynamic strict enum of exactly those handles. Preserve canonical opaque block IDs/server mapping, full original excerpts/constituents/locators and source binding internally. Model-facing selected passages expose one reference handle and necessary original source content; do not ask it to reproduce opaque hashes. Return canonical references after exact lookup; no fuzzy matching, splitting, repair or inferred neighbors. Do not change selector, catalog partition, model/reasoning, limits, question, semantic instructions, evidence selection or answer prose contract in this experiment.

Bind mapping to the immutable prepared request and validated source/selection. Revalidate selected passages against the source before preparing; arbitrary caller-supplied foreign excerpts must not gain authority through the exported preparation helper. An earlier request's handle must never resolve using a later request's mapping. Keep at most3references per statement; invalid handles in synthetic/provider anomalies remain unconfirmed without erasing readable statements. Require exact schema/source/request binding. For unavailable/empty selection, use a documented strict-schema representation permitting only an empty reference array (no empty enum, invented reference or sentinel exposed as evidence).

Preserve cancellation, late-result handling, bounded bytes/counting, no retries and actual composition preparation/parser reuse in the lifecycle and diagnostic. No public routes/integration, ownership claim, voice/PDF/policy/dependency changes or deployment. Reference membership is still NOT semantic support. Repeated selectors and input source IDs in history do not authorize citation lookups.

## Verification

Add focused tests for per-request schema enum correctness, source/selection revalidation, immutable mapping, cross-source/cross-turn p1 collision isolation, exact canonical mapping/locators, empty selections, concatenated/truncated/unknown handles, Unicode, missing refs retaining prose and abort/stale output. Retain earlier baseline artifacts unchanged. Pin Node24.22.0/npm11.19.1; run affected candidate/passage/catalog tests, lint/typecheck/unit/build with isolated fake config, verify protected voice/PDF behavior unchanged. Record actual commands/exits/build identity. No UI/physical-device proof claimed.

## Frozen control only

Repeat exactly the previous composition control with its independently reviewed7blocks/80captions, same original summary question twice, fresh empty history. Only reference encoding/schema/mapping changes; document any unavoidable serialization differences. Freeze both request and actual readable model payload/schema before calls. Reuse the reviewed source/evidence map and separately establish every required support passage still appears unchanged. No expected answer or source-specific hint enters prompt/code.

NEW allowance <=2generation calls/US$0.25estimated, reserve$0.115each using current verified rates and existing128000input/4096output bounds. Prior2call ledger closed. Exact counting requests disclosed separately. No selector calls, model judges, retries or prompt adjustments after seeing output. Stop on protocol/authorization/budget failure. Record both outcomes, usage and latency; actual billing remains unknown without invoice evidence.

Score three distinct outcomes: all references valid; every assertion supported by its own cited original passages; central-message/attribution/<100words coverage using unchanged previous criteria. Valid handles alone do not pass grounding. If both outputs pass, next PM task evaluates the complete two-stage pipeline; this control cannot validate selection. If semantic failure persists, report it without further code/prompt/model changes or live spending.

Return docs/YOUTUBE_REFERENCE_CONTRACT_03F.md, PROJECT_STATE/TESTING, changed hashes, exact frozen requests/results, per-claim review, budget/cleanup. Evidence ignored under artifacts/local/03f-reference-contract/. Estimated45–60minutes. READY_FOR_REVIEW and stop;03F remains IN_PROGRESS until integrated acceptance.
