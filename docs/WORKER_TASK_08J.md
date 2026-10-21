# Task 08J — tolerate browser/server clock differences in owned voice

Use prompts/WORKER_PROMPT.md. Sole active implementation task, parent Step08 with02/07 dependencies. Read mandatory repository docs. Estimate60–90minutes for one bounded timing correction; application implementation remains in worker chat.

## Evidence and outcome

Starting HEAD5d03fe1 plus PM handoff; hosted5242dfba5f2f7dbe595b6d4c67f0155383e3238d. Latest Chrome screenshot: preparation_http201/298ms then preparation_validation invalid(ticket_future)/298ms, no credentials/microphone. This identifies the predicate expiresAt > client now +30000. Existing08I controlled clocks reproduce it when client lags1second/60seconds. Actual offset and which physical clock is inaccurate are not measured. Prior25002ms timeout is a separate unresolved historical observation.

Correct dependence on aligned browser/server wall clocks while preserving real server ticket/source expiry and all ownership/policy/full-source barriers. Do not require the user to change their system clock as the product fix. Voice stays enabled per explicit user instruction; no worker host changes.

## Scope and implementation guidance

Inspect src/app/voice-browser-adapters.ts preparation/current/credential/SDP/source expiry checks, src/server/voice/{handlers,registry,provider}.ts and relevant lifecycle timing. Preparation, credential and source expiry currently compare server/provider epoch timestamps to browser Date.now; fix the coherent owned-voice time contract, not only ticket_future. Prefer server-issued validated bounded remaining lifetimes with conservative request-time accounting and monotonic client deadlines, or another documented equivalent that does not trust browser wall-clock alignment. Account for response delay, already-expired responses, source-expiry clipping and credential seconds-versus-milliseconds. Do not blindly widen tolerances or delete expiry checks. Server remains authorization authority and reauthorizes acquisition; client timing is advisory resource management, never proof of ownership.

Keep server-enforced ticket30s, existing source expiry and provider credential bounds. Preserve exact envelope/identity/policy/manifest checks and pre-microphone ACKs. No model/provider changes, retries, authentication redesign, UI overhaul or new dependencies. Update diagnostics only as needed for the corrected contract. Document cross-version envelope compatibility/fail-closed handling so stale tabs do not silently bypass it.

## Acceptance and tests

1. Red-before/green-after test using real serialized server preparation and actual browser adapter with client behind/ahead by1s,60s and several minutes. Fresh valid preparation must not fail solely on relative wall-clock offset.
2. Simulated wall-clock jumps during an attempt must not extend validity. Delayed/expired ticket, malformed lifetime, source expiry, stale/mismatched envelope, cancelled/late response and server denial still fail closed. Verify server ownership/expiry and no credential/media acquisition on invalid preparation.
3. Cover downstream credential/source checks with synthetic provider transport so passing preparation cannot simply move the same skew defect to credentials/SDP. Validate zero real provider calls and normal Stop/abort cleanup. No physical-audio claim.
4. Preserve text/PDF behavior. Use authored fixtures, never private uploaded documents. Retain08I baseline evidence and prior ledgers.

Use Node24.22.0/npm11.19.1 and established .env-free/network-denied harness. Existing commands: npm run test:voice-preparation; npm run test:voice-adapter; npm run test:owned-voice; npm run test:lifecycle; npm run test:priming; npm run test:owned-text. Run affected tests plus npm run lint; npm run typecheck; npm test; npm run build for application edits. Build before built integration scripts. No paid/live calls, shared DB mutations, .env edits, push/deploy or public flag changes.

## Skills and evidence

Apply .agents/skills/vercel-react-best-practices/SKILL.md for adapter/lifecycle correctness and .agents/skills/playwright-cli/SKILL.md for native browser tests. Installed version-matched Next docs only for framework changes; official OpenAI docs only if changing a provider contract, otherwise preserve it.

Return READY_FOR_REVIEW with files/hashes, timing design and tradeoffs, exact build/runtime/commands/UTC/exits, failing-before/passing-after evidence, cleanup/resource checks and remaining hosted gaps. Store sanitized evidence in artifacts/local/08j; update PROJECT_STATE/TESTING. Stop after one coherent owned-voice timing correction. PM reviews/deploys; human later tries once in Chrome and reports exact stage. Hosted microphone/audio success remains unproven until observed.
