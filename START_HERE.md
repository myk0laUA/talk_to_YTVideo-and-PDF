# Talk to a Document — repository handoff

**Current PM11A review:** local cleanup implementation accepted in3961af4; build0rWK8RA2kP8W59_6R1mUe, all11 hashes match, fresh52cleanup/641unit PASS. Real PostgreSQL cleanup/race validation remains NOT_RUN, no deployment/scheduling. Next single task `docs/WORKER_TASK_08A.md`: simulated voice lifecycle/controls using07B priming. Full08–10 remain unfinished;07 model binding/live gates remain blocked. Public03eb7d8 stays PDF-only.

**Current PM07C review:** accepted for the permitted fail-closed implementation only. Application522ef69, build08ISOATOl0GFXkeubsLS2; all8 hashes match, fresh42budget/589unit PASS. Real model/tokenizer/framing readiness remains BLOCKED; no live grounding claim. Next single task `docs/WORKER_TASK_11A.md`: bounded expired-row cleanup, an independent Step11 storage subcheck. Public03eb7d8 remains PDF-only; keys pending and no spend. Prior summaries are historical.

**Current PM07B review:** acknowledged context priming accepted for offline/scripted scope. Application227b359, local build2md7yaSuVz21TjLpuplBd; all9 hashes match and fresh priming75/unit547 PASS. No live provider/model/phone readiness inferred. Next single task `docs/WORKER_TASK_07C.md`: evidence-backed server model/token budget binding, failing closed on unsupported mappings. Public03eb7d8 remains PDF-only; keys pending, no API spend. Older summaries below are historical.

**Current07A PM review:** offline authorized/lossless context and budget/evaluation preparation accepted. Application7095457 published, not deployed; fresh79context/472unit checks PASS. Next `docs/WORKER_TASK_07B.md`: acknowledged context priming using scripted Realtime transport. Model binding, credentials, live grounding and phone checks remain open; public03eb7d8 stays PDF-only.

**Current06C PM review:** bounded fallback/cooldown accepted for implementation/local/controlled realDB scope. Application39c785c published, not deployed. Fresh393unit/58fallback checks and synthetic-provider realDB tests PASS. Next single task `docs/WORKER_TASK_07A.md`, lossless authorized source context and offline evaluation fixtures. No keys/spend needed. Public03eb7d8 remains PDF-only; live grounding/provider gates stay open.

**Current06B PM review:** coalescing accepted for implementation/local/realDB scope. Application675c12e published, not deployed; fresh352unit/61overlap checks and actualDB cancellation/rollback pass. Public service remains03eb7d8/PDF-only. Next single task `docs/WORKER_TASK_06C.md`, bounded fallback/cooldown for existing adapters. Keys pending; no paid calls. Latest PROJECT_STATE supersedes historical summaries below.

**Current06A PM review:** cache implementation/local and actual PostgreSQL scope accepted, application03eb7d8; fresh328unit/53cache checks PASS. Hosted direct bypass returned502blocked; successful live cache population/hit remains open. Next single task `docs/WORKER_TASK_06B.md`: cancellation-safe sharing of identical public caption imports. Automatic fallback is later06C. Keys pending, hosting free. Latest PROJECT_STATE supersedes historical summaries below.

**Current05b PM review:** implementation/local UI and hosted error recovery accepted. Applicatione3908e6 deployed; fresh99browser checks PASS. Actual YouTube direct502blocked, priorPDF384lines/recovery/remove PASS; PDF-only availability restored. Full live YouTube/phone/grounding open. Next single task `docs/WORKER_TASK_06A.md`, validated public caption cache. Both keys pending, hosting free. See PROJECT_STATE for exact build/deployment/evidence.

**Prior05a status (superseded for next-task/deployment identity by the update above):** Task 05a accepted for local/hosted PDF UI; physical iPhone PDF flow subsequently passed by user report (device/version unspecified). Application `1cfbfeb`, Free Render deploy `dep-dbahlpbrjlhs73aj95a0`; PDF import enabled. Fresh PM browser 75/75 and actual HTTPS complete 384-line preview/replacement/removal PASS. All diagnostic/credential gates remain off. Steps 01/04 DONE; Step 05 IN_PROGRESS. Next single worker task: `docs/WORKER_TASK_03C.md`, visitor-owned YouTube source handoff. Keys/quota/grounding/phone gates remain open. No provider spend or paid change. Original planning statements below are historical; resume from `docs/PROJECT_STATE.md`.

This package captures the completed planning work. It contains no application implementation. The last known implementation status is **unverified: none of Steps 01–14 has been demonstrated in this planning session**. Reconcile this with your actual repository before starting.

## Use this package

1. Copy `prompts/`, `docs/`, and `references/` into your project repository. If the repository already uses those names or already has APM state, merge intentionally; preserve existing files and progress. Do not overwrite `AGENTS.md`.
2. Open a manager chat with access to that repository. Paste the complete contents of `prompts/APM_MANAGER_PROMPT.md`. Here, APM means the project manager role; no particular external APM framework is assumed.
3. Let the manager inspect the repository, reconcile `docs/PROJECT_STATE.md`, and issue one bounded worker task. The expected first implementation task is Step 01, subject to what already exists.
4. Open a separate worker chat in the same repository. Paste `prompts/WORKER_PROMPT.md` followed by the manager's task brief. The worker implements and verifies that task.
5. Return the worker's report and any manual test evidence to the manager. The manager reviews the evidence, updates the state, and issues the next task. Keep one active implementation task at a time.

The manager prompt is reusable after closing a chat. Repository state and evidence provide continuity; the manager must not rely on a previous chat's memory.

## Files

- `docs/IMPLEMENTATION_PLAN.md`: full requirements, architecture, original Step 01–14 identifiers, acceptance criteria, three-day schedule and source links.
- `docs/PROJECT_STATE.md`: initial status, decisions, blockers, command registry and evidence ledger. This becomes the live tracker.
- `docs/TESTING.md`: staged checks, manual reviewer procedure and the required evidence format.
- `docs/SKILLS.md`: selected skills, excluded/conditional components, setup guidance and when to use each.
- `references/PRODUCT_REFERENCES.md`: the previously researched product comparison and practical design decisions.
- `prompts/APM_MANAGER_PROMPT.md` and `prompts/WORKER_PROMPT.md`: the two chat roles.

## Scope and timing

Build one source at a time, with anonymous visitor sessions, managed PostgreSQL, server-side PDF/caption ingestion, OpenAI Realtime over WebRTC, live conversation text and a microphone-free text fallback. Accounts/OAuth, permanent conversation history, embeddings and a vector database are deferred.

Target a complete demo within 36–48 elapsed hours of the agreed Saturday evening, 17 October 2026 start; finish submission within 72 elapsed hours. Preferred demo: Monday 19 October. Outer target: Tuesday evening 20 October, Toronto time. Do not restart the deadline when opening another chat. These are engineering targets, not a claim about the brief's receipt date.

No skills have been installed, no service credentials have been configured, and no live ingestion or voice result has been verified by this planning work. Use the checks in this package to establish those facts.
