# Talk to a Document — repository handoff

**Current status:** The paragraph below describes the original planning package. Step 01 DONE; 02a/02b/02c/03a/03b accepted for assigned scope. Local application `01bfe8e`: 226 unit, 8 mocked caption HTTP scenarios/31 checks, smoke/voice/text 10/10 each pass. Real direct captions passed twice locally; hosted trial was mixed. Public deployment remains `bf30c6f` on Free Render, proof gates disabled; 03b is not deployed. Single next worker task: `docs/WORKER_TASK_04A.md`, bounded PDF upload/extraction and local 25 MB HTTP proof. Live provider/phone/managed-caption/grounding gates remain open; keys/quota pending. Resume from `docs/PROJECT_STATE.md`.

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
