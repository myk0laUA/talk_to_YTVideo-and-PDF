# Task 03D correction — paced source delivery and local grounding

Use prompts/WORKER_PROMPT.md. Sole active implementation task, continuation of03D under original Steps03/07/10. PM accepts real local caption import/preservation as partial evidence; the complete conversation gate remains BLOCKED. Do not start another task or deploy.

## Evidence and outcome

Read WORKER_TASK_03D.md and YOUTUBE_LOCAL_03D.md, plus required repository handoffs. Baseline main4c61f3c with documentation-only03D report, followed by PM review commit; inspect actual HEAD. Build ducfQssE9QVLoPltybUbS imported428caption sections/18,822characters, selected language sq when none requested. Two text sessions closed before readiness, zero questions. Provider observer saw initial session.updated then1006, no source ACK. Offline actual encoder + held socket reproduced failure after352writes/256,043buffered bytes for313,622-wire-byte manifest. This demonstrates a transport hazard, not definitive live causation.

Outcome: admitted multi-section sources reach text readiness without an unbounded native-send burst; complete source fidelity, ordering, ACK validation and cancellation remain intact. Then verify real local YouTube summary and later-section follow-up on the corrected application.

## Implementation scope

Inspect src/server/text/socket.ts, src/shared/priming-controller.ts, src/shared/text-lifecycle.ts and their callers/tests. Current controller loops all items synchronously; socket closes above256,000buffered bytes. Choose the smallest bounded pacing solution at the appropriate layer. Prefer isolating text transport if it avoids unnecessary voice changes; shared changes require explicit voice regression coverage. Native write completion is not provider acknowledgement.

Do not merely raise/remove256KB or64KB limits, truncate/group away source semantics, drop sections, skip ACKs, expand context admission, change models/prompts, or extend deadlines to mask a stalled connection. Keep total memory/queued bytes and command count bounded with documented rationale based on admitted manifests. Consider serial native writes versus bounded draining without assuming ws has browser bufferedamountlow events. Consult installed pinned ws implementation for transport behavior.

All queued/in-flight send promises must settle on success, failure, abort, Stop, timeout and source/session replacement. Recheck closed/aborted/stale-command validity immediately before native send. Late callbacks must not flush old commands, revive readiness or affect a newer run. Preserve original order, exact-once writes, source-item acknowledgement checks and final-settings acknowledgement before ready. Never allow a follow-up question before priming. No automatic reconnection/retry. Preserve error listeners until close, and bound timers/listeners/queue lifetime.

## Offline acceptance first

Create a committed synthetic many-section fixture reproducing the same byte pressure; do not commit the third-party transcript. Reproduce the current failure before patching. Test actual socket adapter plus priming/lifecycle integration with realistic controllable delayed write completion and buffer draining, not just a helper or socket that never drains.

Prove complete ordered delivery and readiness only after all valid source ACKs and final settings ACK. Cover delayed/duplicate/out-of-order and malformed ACKs, failed write, buffer/queue overflow, oversized frame, stalled drain/deadline, Stop/abort/source replacement during pending writes and late callbacks after shutdown. Verify no promises hang and no writes occur after teardown. Retain small PDF/text and voice bootstrap behavior. Use existing tests/unit/priming.test.ts, text-lifecycle.test.ts and owned-text.test.ts as starting points; add a focused socket test if needed.

Run pinned Node24.22.0/npm11.19.1: npm run lint, npm run typecheck, npm test, npm run build, npm run test:owned-text, npm run test:youtube:http, npm run test:youtube-ui. If shared controller/lifecycle changes, run npm run test:owned-voice and npm run test:voice-adapter too. Build/tests use isolated fake configuration and no real service keys. Inspect scripts and respect active browser-tool restrictions; use permitted browser tools for live UI. No unrelated suite repetition after unchanged evidence.

## Fresh bounded live verification

Only after offline checks pass, PM delegates the same loopback-only real app/owned-visitor authorization as03D, with a NEW correction ledger: estimated ceiling US$0.25, maximum2sessions/4responses, first1session/2questions; second only for a diagnosed correction or specific evidence gap. Original03D allocation is closed. Verify current official pricing and reserve inputs/outputs before calls; stop if allowance cannot cover them. Actual unreported usage remains unknown. No live voice, managed provider, new service, public configuration or billing changes.

Reimport the SAME video uncached through the real UI to exercise the large-section case; at most2extraction attempts. Report actual language and source/wire counts. Do not silently substitute a short video to bypass the defect. If language/track changes, compare workload and independently verify the current captions; sq is known, not English proof. Use safe numeric/category diagnostics for local send failure reason, peak native/queued bytes, write counts, provider ACK counts and close category; never log keys/cookies/headers/full event payloads. These observations should distinguish local guard closure from remote loss. No broad permanent telemetry system required.

Verify complete preview and source ACK readiness, then ask the predetermined summary and later factual question using actual transcript expectations. Judge grounding, not merely response arrival. Stop, retain transcript/preview, remove only the fresh visitor source via normal owned API/UI, stop task-owned processes and verify secret files unchanged. Follow03D process flags and exclusions: public voice remains enabled; public YouTube remains disabled. No DB administration or bulk cleanup. A further live failure returns its first failed boundary and safe trace without blind retries.

## Skills, evidence and stop conditions

Use docs/SKILLS.md: playwright-cli for permitted browser verification, React skill only if React code changes, OpenAI Docs for API/pricing facts. Local version-matched Next docs for framework changes. No UI redesign, language-selection feature or voice/acoustic tuning.

Return READY_FOR_REVIEW with docs/YOUTUBE_LOCAL_03D_CORRECTION.md, PROJECT_STATE/TESTING updates, changed-file hashes, build/HEAD/dirty identity, exact commands/exits, failing-before/passing-after regression, bounds/cancellation reasoning, safe live trace and answer checks, new ledger and cleanup. Store ignored artifacts under artifacts/local/03d-correction/. Distinguish fixed offline hazard from observed live cause and validated live recovery. Stop for broader architecture/provider changes or unresolved bounded live failure. No phone test required from user now; hosted YouTube/YouTube voice/physical-phone gates remain open.
