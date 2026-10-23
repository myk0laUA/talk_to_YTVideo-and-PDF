# Larger Realtime model diagnostic — 22 October 2026

User explicitly requested trying a bigger model. PM ran an isolated direct-provider diagnostic, not application implementation or deployment. Result: both targeted exchanges PASS semantic review on their first sample with gpt-realtime-2.1. This supports a bounded application integration/acceptance task; it does not complete03H or establish production reliability.

## Frozen comparison

Use original03H source files, frozen questions/rubric and hash-matching source-grounding instructions/manifest encoder. No translation, source selection, prompt change, citation machinery or new caption acquisition. Same minimal reasoning and512output-token limit. Source0Albanian428segments and source1Arabic316segments. Sole intended model change: gpt-realtime-2.1-mini to gpt-realtime-2.1.

Direct WebSocket harness reuses actual manifest construction and checks acknowledged model, instructions, truncation-disabled setting, reasoning/output cap and exact source-item text. Urban is first turn. Cuddy follow-up replays exact saved first three question/answer pairs, including Mini's prior answers, before asking unchanged1-4. This preserves visible conversational history but does not reproduce hidden provider state, original item IDs or a whole new app session. New diagnostic run IDs and current time differ. Expired saved public source snapshots are evaluation fixtures, not newly authorized app sources; no ownership/expiry bypass in the product and no DB access.

Official docs inspected22October: [larger model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) and [Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) both list128,000context. Larger text rates: $4input/$0.40cached/$24output per million. This comparison tests model capability, not a larger context window. Observed larger-model inputs17,557 and26,178tokens are below that window; prior Mini's actual input usage remains unknown.

## Results and review

| Case | Original | Larger first sample | Provider completion latency | Input/output tokens | Estimated USD |
|---|---|---|---|---|---|
|2-1 Urban summary|FAIL|PASS|2.063s|17,557/162|0.074116|
|1-4 Cuddy follow-up|UNRESOLVED|PASS|1.688s|26,178/57|0.106080|

Urban preserves rational decision-maker versus immediate gratification, deadline-triggered panic, no-deadline indefinite delay/regret, and reflection/action soon because of limited life weeks. It does not repeat the old planning/laziness/invisible-pressure additions. Dark playground is supported by source's explanatory middle; responsibility for non-urgent tasks is a faithful paraphrase of closing reflection/action. Claims explicitly attributed to the speaker/source.

Cuddy identifies people lacking technology, status and power, says they can benefit most, and explains private accessibility with body/privacy/two minutes. Stored segments420–426 support this synthesis. It avoids the old unsupported pressure rationale and correctly resolves the follow-up.

Both provider terminal statuses completed; zero audio tokens/cached tokens; reasoning tokens12/10 are included in output totals, not added again to billing. Total usage-derived estimate **$0.180196**, not an account invoice. No claim of repeated-trial reliability. Historical scores untouched. Six other not-targeted questions and full app integration were not run in this diagnostic.

## Execution, bounds and preservation

New allocation <=$1estimated, at most2sessions/2responses, no retries. Conservative byte-based reservations $0.348492+$0.444292 before calls; closed after2responses. This is a local estimate guard, not provider hard billing cap. Earlier ledgers remain closed and unchanged. Both sockets closed. No source import, database write, app server/browser, microphone, voice change, dependency change or deployment.

Pinned Node24.22.0. `node --conditions=react-server artifacts/local/03h-larger-model/probe.mjs 2-1 --dry-run` and equivalent1-4 exit0; validate hashes, manifests, frozen plans and reservations without network. Live same commands without --dry-run exit0. Urban ended2026-10-22T05:10:22.685Z; Cuddy ended05:10:32.714Z. Plans locked before each response, questions/key unchanged. Both runs verify all240 frozen product hashes; post-run check also PASS. HEAD1d30684 remains unchanged; historical app build qJ3KjvekCsaZp_8_oCpqt was not rebuilt or run.

Evidence: ignored `artifacts/local/03h-larger-model/` contains probe.mjs, dry/live plans, exact answers, acknowledged counts, terminal usage/status, timing, closed ledger and SHA256 manifest. Errors would stop without automatic retries. No key or raw credential/session-secret payload persisted. This is PM experiment code only, not a new production pipeline.

Recommendation: next bounded worker task should make the larger model selectable for owned YouTube text with matching admission/acknowledgment checks and leave PDF/voice defaults untouched, then return for PM review and a separately budgeted complete-app frozen acceptance batch. No task is issued by this report; no automatic additional spending or release authorization.
