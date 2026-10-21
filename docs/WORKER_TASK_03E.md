# Task 03E — accurate YouTube text citations

Use prompts/WORKER_PROMPT.md and required repository handoffs. Sole active worker task under original Steps03/07/10. PM accepted03D correction2 setup; full local YouTube grounding remains open. No deployment or subsequent task.

## Starting evidence and outcome

Read YOUTUBE_LOCAL_03D_CORRECTION_2.md and its ignored answer-checks.json. All11delivery hashes matched; PM fresh169tests passed (packing/setup timing/provider admission/priming/socket pacing). Confirmed25-second local setup timeout was resolved by lossless text-only packing:428sections in7messages, all ACKs and ready ~1.514seconds. Both real answers complete and survive Stop. Voice bytes unchanged; no voice fix is authorized here.

The failure is inaccurate claim-to-source citations. Follow-up fact20minutes/20people is correct but citation354.117seconds is wrong; supporting segment-355 starts1040.594seconds. Summary citations also point to unrelated passages. Possible confusion between section ordinals and seconds is a hypothesis, not proven. Omission of one optional summary detail is not itself a failure unless explicitly requested. Do not require exact phrasing or a predetermined exhaustive summary.

Outcome: real local summary and factual follow-up carry source references that actually support their claims, with full captions and fast setup retained. Scope is text YouTube reference representation/instructions and their verification, not retrieval, model migration, acoustic behavior or UI redesign.

## Inspect and implement narrowly

Trace actual model-visible packed payload through src/shared/priming-manifest.ts, source context and text admission. Verify that locators are correctly associated with text both before and after fragment packing, and that the final accepted instructions match the candidate. Check whether source index, segment ID, seconds and fragment offsets are ambiguous in the model-visible representation. Preserve language sq in the same-video test; do not hide the failure by selecting an easier English/short source.

Choose one bounded candidate supported by inspection: explicit text-only citation rules and/or unambiguous locator labels. Require exact supplied segment IDs and timestamps, never ordinal-as-seconds, invented precision or fabricated ranges. Claims spanning sections need relevant references. If a source location cannot be established, the answer must acknowledge that rather than fabricate one. Missing all required citations is not a passing grounded-answer test.

A deterministic ID-to-timestamp resolver can ensure timestamp validity but cannot prove that a cited passage supports a claim. Do not silently remap unsupported model citations, label them verified or rewrite history to make evaluation pass. A renderer/resolver feature beyond the existing text path requires returning a bounded design to PM before expanding scope. Do not add tools/retrieval, new dependencies, provider/model changes, larger output/context caps, new source storage or a full citation subsystem. Keep source text and all timestamps exact, ownership/expiry/provenance, untrusted-content handling and acknowledgement binding intact. Keep voice/PDF behavior unchanged; scope any instruction change accordingly. Update manifest/policy/version bindings where needed so old representation cannot pass as the new candidate.

## Offline checks

Author a synthetic transcript whose section IDs deliberately differ from timestamp numbers, with distinctive facts at beginning/middle/end. Test deterministic locator fidelity and full reconstruction across packed boundaries, fractional times, Unicode and fragments. Include instructions embedded in source as untrusted data. Test exact new instruction/manifest binding and stale rejection. These tests prove plumbing/instructions only, not model compliance; label them accurately.

Run pinned Node24.22.0/npm11.19.1 lint/typecheck/unit/build and npm run test:owned-text. Shared manifest/admission changes also require owned-voice and voice-adapter regression checks and byte-level unchanged voice evidence. Use isolated secret-free fake configuration for synthetic suites. Consult selected OpenAI Docs for API facts, local Next docs for framework changes, and permitted browser tools/project playwright-cli for actual UI verification. No unrelated design skill work.

## Bounded live acceptance

Fresh03E ledger under standing test authorization: <=US$0.25 estimated total, at most2sessions/4responses; begin1session/2responses after offline checks. Prior03D allocations closed. Check official pricing and reserve each call before sending; actual missing usage stays unknown. One optional second session only after a diagnosed candidate correction or specific missing evidence, never repeated sampling until a lucky answer appears. If sufficient reservations cannot fit within the ceiling, stop before calls. No live voice.

Same loopback/private-env/fresh-owned-visitor authorization as03D: real UI, real owned storage, direct uncached captions for Ks-_Mh1QhMc, <=2extractions, no mocks/preloaded source/managed providers. Preserve public voice enabled/YouTube disabled; no host/billing/schema/migration/SQL changes. Use a normal uninstrumented production build for final answer acceptance; any safe observer must be bounded and documented without debugger overhead or raw-event logging.

Before sending, record the two natural questions and expected supporting source passages. Use a concise summary and the Princeton20minutes/20people follow-up. Check every emitted citation against actual transcript locators and claim support; record exact text and evidence in ignored artifacts only. Explicit speaker attribution for disputed scientific claims must remain. Validate both answer content and citations, not exact wording. Confirm same-source readiness, full preview, Stop retention, own-source deletion and process/private-file cleanup. Observe each response <=45seconds. Report all attempts, including failed candidates; two passing answers establish this bounded check, not universal citation reliability.

## Handoff and limits

Return READY_FOR_REVIEW with docs/YOUTUBE_CITATIONS_03E.md, PROJECT_STATE/TESTING, changed-file hashes, build/HEAD/dirty identity, exact commands/exits, offline tests and their limits, actual model-visible change, claim/citation evidence, ledger and cleanup. Artifacts: artifacts/local/03e/. If inaccurate citations persist, stop with precise evidence and propose the smallest next design; do not expand implementation or waive grounded evidence. No user phone testing now. Hosted YouTube, real YouTube voice and physical-phone gates remain separately open.
