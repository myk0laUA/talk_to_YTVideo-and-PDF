# Task 07C — evidence-backed model budget binding

Use with `prompts/WORKER_PROMPT.md` in the separate worker chat. One active implementation task, original Step 07. PM owns acceptance, deployment and live spending.

## Outcome and starting evidence

Build the server-only policy/measurement adapter that connects 07A source preparation to 07B's exact manifest budget. Establish which counts are supported by evidence and fail closed when model/tokenizer/framing support cannot be established. Estimate 90–120 minutes, including a 30-minute documentation/tokenizer investigation limit. Start from accepted application `227b359546332fdbfcbe19cf150a94c0dec87bed` plus the PM documentation commit; inspect actual HEAD. Local build `2md7yaSuVz21TjLpuplBd`; fresh priming75/unit547 PASS. Neither API key is ready. No API calls, paid usage or deployment.

## Scope and model decision

Inspect `src/server/context/{budget,service,document}.ts`, `src/shared/priming-{manifest,admission,controller}.ts`, `.env.example`, existing server proof configuration and `tests/context`/`tests/priming`. Add a small server-only model policy and measurement coordinator, with focused tests. Preserve existing authorization, source fidelity and cancellation guarantees. Do not add another generic context framework.

The example configuration says `gpt-realtime`; the plan discusses `gpt-realtime-2.1`. Neither proves account access or deployed configuration. Do not read or print secret values, silently change the configured model, use prefix matching to assign capacities, or apply one model's limits to another. Support an explicit exact identifier only when its policy is substantiated. Unknown identifiers remain budget_unavailable. Document the discrepancy and proposed future selection for PM; production selection is not part of this task.

PM opened these official sources on 18 October 2026:

- [gpt-realtime model](https://developers.openai.com/api/docs/models/gpt-realtime): marked deprecated, context 32,000 and maximum output 4,096.
- [Realtime developer notes](https://developers.openai.com/blog/realtime-api): older gpt-realtime explanation gives 32,768 context, 28,672 input, and 16,384 instructions-plus-tools. Record the discrepancy; a lower documented ceiling can be an explicit conservative application policy, never an invented exact provider limit.
- [gpt-realtime-2.1 model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1): context 128,000 and maximum output 32,000. This is a separate model, not an upgrade authorized by this brief.

These pages do not establish the model's exact tokenizer or hidden Realtime framing. Apply OpenAI Docs and verify current official token-count guidance before selecting a measurement mechanism. A tokenizer library accepting a model name, a generic GPT encoding, UTF-8 bytes, characters/4, or tokenizing outer JSON does not by itself establish provider token usage. No authenticated token-count endpoint calls in this task.

## Required behavior and acceptance

1. A versioned server-owned policy records exact model identity, evidence URLs/date, tokenizer identity/version if established, total/input/instruction limits where supported, and explicit history/output/framing reserves. Distinguish documented limits, conservative application choices and unresolved assumptions. Validate all arithmetic, unknown models, missing bindings and unsupported revisions. No browser-provided capacities or verified flags become trusted policy.
2. Measure actual 07A A/B variants and exact 07B manifests for both modes. Record separately the full outbound representation and the model-visible instructions/item contents. Account for per-item framing and repeated metadata; counting the outer escaped JSON is not proof of an upper bound on separately tokenized model-visible content. Explain how fit is derived, avoid double-subtracting output reserve, and check instructions separately where required. Preserve complete source/preview; never truncate, summarize or use retrieval to force fit.
3. Only produce verified measured_fit when the model/encoding and conservative accounting basis can actually be substantiated. Otherwise return budget_unavailable with a safe reason and a clearly labeled diagnostic estimate, if useful. Do not relabel synthetic or approximate counts to bypass 07B admission. A fail-closed implementation with a precise unsupported-binding report is an acceptable bounded delivery; actual model readiness stays BLOCKED, not DONE. Do not spend the timebox inventing a tokenizer.
4. Keep measurement local, bounded and cancel-safe. Freeze trusted policy/results, reject invalid counts and mismatched/stale representation, mode, model or policy. Source replacement/expiry during preparation must retain 07A's final authorization checks; no late cancellation result may become admissible. No source text, owner hash, cookie, credential or full manifest in logs. No runtime fetching of tokenizer assets or dependencies.
5. Verify actual prepared fixtures through measurement and `preparePrimingInput`/default admission: fit only with supported evidence, over-limit denied, unavailable denied. Test exact boundary/one-over, Unicode/emoji/combining marks/lone surrogates, special-token-looking text as ordinary source data, many small items and metadata-heavy fragmentation, both source types/A/B/voice/text. Include measurement failures, resource cleanup and no-provider-call assertions. Synthetic tests of accounting must be labeled separately from real tokenizer tests.
6. If a local tokenizer package is justified by verified mapping, one pinned Node-compatible dependency is permitted through npm with package-lock preserved. Record provenance, package size, licensing and production memory/loading implications for Free Render. Keep it out of browser chunks. If mapping is unsupported, avoid an unnecessary dependency. No unrelated upgrades or installation framework.
7. Preparation remains non-authorizing and providerConfirmed/productionReady false. No public route, minting, credential activation, WebRTC/WebSocket/media wiring, UI, database mutation, model migration, live A/B answers, automatic retry, history persistence or Step08 work. The future issuance task must freshly authorize the source and bind the eventual session output limit to the reserved output budget; documenting that obligation does not claim runtime enforcement now.

## Commands and manual verification

Use pinned Node24.22.0/npm11.19.1. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:context`, `npm run test:priming`, `npm run build`, `npm run test:smoke`. Establish one focused budget test command if useful and document it. Run `npm run test:voice` / `npm run test:text` only if their shared runtime contracts change. Build before browser tests; use isolated test configuration, disabled public gates and no real keys/DB. Consult version-matched Next docs only if changing framework behavior.

1. Worker: run a sanitized A/B × voice/text count table for both committed source fixtures, showing model/policy, verified versus estimated basis, component counts/reserves, result and source hash. Prove source reconstruction remains exact and no provider request occurs.
2. Worker: demonstrate unknown model, unsupported tokenizer, one-over limit and cancellation deny admission without changing source/preview. Show the default controller cannot start with estimates.
3. PM: review evidence, binding support and accounting; rerun focused tests. No human key, phone or purchase action is required. Account access, actual provider acceptance/token usage, live answers and physical audio stay NOT_RUN.

## Applicable skills, evidence and stop

Apply OpenAI Docs at `C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md` for model/token-count contracts. Project skill policy is `docs/SKILLS.md`; no React/design skill needed for server-only accounting. Playwright at `.agents/skills/playwright-cli/SKILL.md` only if browser automation is changed or investigated.

Return proposed READY_FOR_REVIEW for this bounded implementation, with changed-file SHA256 manifest, base/dirty/build/runtime identity, exact command UTC/exits including failures, official references actually opened, supported/unsupported mapping matrix, sanitized count/boundary/cancel evidence, dependency/client-boundary audit and limitations. Store logs under ignored `artifacts/local/07c/`; update PROJECT_STATE, TESTING and one runbook. Do not mark full Step07 complete.

Stop investigation after 30 minutes if exact binding/framing support is unavailable; finish the safe unavailable path and concrete remaining evidence requirement. Stop and report if broader model migration, live keys/spend, new services, public issuance or application UI is necessary. No07D/08 work. PM decides acceptance and next single task.
