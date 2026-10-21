# Task 03D — real local YouTube import, preview and grounded text

Use prompts/WORKER_PROMPT.md. This is the sole active worker task, under original Steps 03/05/07/10. PM owns acceptance and deployment. Inspect actual HEAD; assignment baseline is 42e7610 plus this documentation commit.

## Outcome and starting evidence

Close the local YouTube delivery gate: a public captioned YouTube URL must pass through the real application, acquire uncached captions using the existing free direct provider, display complete timestamped source text, and support a correct summary and follow-up in genuine text mode. Historical 03A local extraction and mocked UI/storage tests are prerequisites, not current end-to-end proof. Hosted direct extraction was blocked; public YouTube remains disabled. Existing hosted PDF/voice/text and user-confirmed spoken Stop remain accepted within their recorded scope.

Read START_HERE.md, IMPLEMENTATION_PLAN.md, PROJECT_STATE.md, TESTING.md, SKILLS.md, SOURCE_YOUTUBE_03C.md, CAPTION_PROOF_03A.md, and OWNED_TEXT_APPLICATION_10E.md if present (otherwise discover the current 10E report). Inspect current source configuration rather than copying historical flags blindly.

## Scope and authorization

PM delegates local verification using the existing direct caption adapter, real owned Source repository and current text application. Relevant starting modules: src/server/sources/runtime.ts, src/server/sources/config.ts, src/server/captions, and the actual import/preview/text UI found by repository search. No provider replacement, dependency upgrades, retrieval redesign, audio transcription, voice tuning, public activation or deployment.

Use Node24.22.0/npm11.19.1. Preserve package-lock.json. Read ignored .env privately into a loopback-only child process without printing or changing secrets. Process-only overrides may enable YOUTUBE_INGESTION_ENABLED=true, YOUTUBE_INGESTION_PROVIDER=direct, YOUTUBE_INGESTION_LOCAL_HTTP=true, YOUTUBE_CAPTION_CACHE_BYPASS=true, OWNED_SOURCE_TEXT_ENABLED=true and the matching local APP_ORIGIN. Inspect all required visitor/route settings first. Managed providers and proof endpoints must remain off. No Render, billing, migration, arbitrary SQL, reset or bulk cleanup changes. Only normal UI/API operations on a new isolated test visitor and its sources are authorized. Keep public voice enabled and public YouTube disabled.

Use at most three distinct public captioned videos, short enough for the existing full-context admission policy. No automatic retry loops; one repeat only after a diagnosed narrow correction, within a total of four extraction attempts. Stop extraction investigation after 45 minutes. A blocked provider result is evidence, not permission to introduce another service or scrape workaround.

For grounded text, create a NEW Task03D ledger under the standing project-test authorization: maximum estimated US$0.25 and two sessions/four responses total; start with one session/two responses. Verify official pricing and reserve estimated input/output cost before each call; stay within the budget and existing model/context/output policy. Observe each response for at most45seconds, then Stop. A second session is only for a specific corrected failure or evidence gap. Do not reuse old task allowances or claim the application enforces a hard dollar ceiling. No live voice calls in this task. Missing credentials or inability to bound the calls returns a precise blocker.

## Procedure and acceptance

1. Record source/build identity, current safe configuration booleans and baseline secret-file integrity without revealing values. Build without real secrets if a current matching build is unavailable; inject private configuration only at runtime. Use fresh isolated browser state.
2. Select a public captioned video, record its URL/ID, requested and actual language, provider, UTC and cache-bypass evidence. Import through the real YouTube UI, with no mocked responses, preloaded captions, seeded source, or fake repository. Distinguish upstream block, missing captions, network error and app defect.
3. Verify the complete provider-returned transcript survives normalization, owned storage and preview: compare segment counts, text length/hash and beginning/middle/end passages and timestamps. Do not confuse preservation of the returned transcript with an independent guarantee that captions cover every spoken word. Save necessary content evidence only in ignored local artifacts; no full third-party transcript in committed docs.
4. Predetermine a summary expectation and one question about a concrete fact later in the transcript. Start genuine text mode from the same source, ask both, and check accuracy against those source passages, including source locators where supported. No microphone permission should be required. A status200 or plausible generic answer is insufficient.
5. Stop the conversation, verify received text and source preview remain available, and remove only the test visitor's source via the normal owned UI/API. Validate a malformed URL locally without a provider call; existing negative tests cover ownership/expiry and acquisition failures. Do not spend extra live attempts on known-negative videos.
6. Shut down only task-owned processes/profile; remove process overrides and confirm private files and public settings are unchanged. Report cleanup failures. Preserve default-disabled YouTube behavior; do not modify deployment defaults to make local success permanent.

## Corrections and verification

One narrow integration correction is allowed if the real flow exposes a reproducible defect. Add a meaningful failing regression before correction and rerun affected checks. Stop for larger architecture, dependency/provider changes or ambiguous upstream blocking. Do not turn this into another preparation-only task if the actual local flow is available.

Verified command names: npm run lint, npm run typecheck, npm test, npm run build, npm run test:captions:mocked, npm run test:youtube:http, npm run test:captions:cache, npm run test:captions:coalescing, npm run test:captions:fallback, npm run test:youtube-ui, npm run test:owned-text. Inspect scripts before execution. Synthetic suites must run with isolated fake configuration and no real service secrets. For evidence-only work reuse matching validated build/tests; for runtime corrections run lint/typecheck/unit/build plus affected caption/source/text checks. Run browser checks only through tools permitted in the current environment; a script or skill does not override browser-tool restrictions.

Applicable skills: .agents/skills/playwright-cli/SKILL.md for permitted browser verification; .agents/skills/vercel-react-best-practices/SKILL.md only if React/Next code changes; OpenAI Docs only for current API/pricing facts. Consult local version-matched Next docs for framework changes. No design overhaul in this task.

## Evidence and handoff

Return READY_FOR_REVIEW with a concise docs/YOUTUBE_LOCAL_03D.md report, PROJECT_STATE/TESTING updates, changed-file hashes, HEAD/dirty/build identity, exact commands/exits/UTC, real versus mocked context, provider/cache evidence, transcript-preservation checks, two answer correctness checks, Stop/removal results, private-file/process cleanup and cost ledger. Artifacts go in ignored artifacts/local/03d/. Report missing usage as unknown, not free. If blocked, record the first failed boundary and bounded attempts; do not claim the capability passed.

No user phone action is required during this worker task. Once PM reviews successful local evidence, PM will give any necessary human demo check. Hosted YouTube, actual YouTube voice and physical-phone acceptance remain separate explicit gaps. Do not start UI polish or another task.
