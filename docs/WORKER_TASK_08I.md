# Task 08I — isolate browser rejection of successful preparation

Use prompts/WORKER_PROMPT.md; sole active worker assignment, parent Step08/02/07. Read required project instructions and latest state. Estimate60–90minutes, stop at one evidenced correction or precise diagnostic gap. No deployment by worker.

## Evidence and outcome

Base main d01d275 (PM docs), hosted application8887a4e. User Chrome screenshot after deployment: `preparation_http: ok (HTTP 201), 204 ms`; `preparation_validation: invalid, 206 ms`. No credential/microphone stage. This attempt is a client rejection of a successful preparation response, not the earlier25002ms timeout. Exact failed predicate remains unknown. Prior PM Node HTTPS test checked status only and discarded the body; it did NOT exercise browser validation. Local native baseline passed with authored fixtures; that does not establish current hosted browser compatibility.

User explicitly requires public voice stay enabled. Worker must not change host flags; no new paid/provider calls. Use authored fixtures only, never request/copy the private user document.

## Scope

Inspect src/app/voice-browser-adapters.ts prepare/send/read, src/shared/voice-lifecycle.ts reporting, src/shared/priming-admission.ts, priming-manifest.ts and priming-provider-policy.ts, and server preparation projection. Identify whether rejection is response MIME/bytes/UTF-8/JSON, envelope/identity, expiry/time assumptions, source metadata, policy or manifest fidelity. Do not treat generic invalid as evidence for a specific predicate. Investigate clock skew and response serialization as hypotheses, not findings.

Exercise the REAL browser adapter validation with a JSON-round-tripped production-shaped server preparation, authored one-page and multi-page PDFs, Unicode/punctuation/line breaks, and controlled client/server clock offsets. Use existing synthetic repository/provider-denied harness. Observe success through preparation_validation only and cancel; explicitly fail the harness if credential acquisition, peer/media or provider calls occur. Do not repeat the inadequate HTTP-status-only proof.

If a reproducible defect is found, implement the narrow fix with a regression that fails before and passes after. Preserve ownership/expiry enforcement on server, exact policy/full-source fidelity and ACK-before-mic; never bypass validation or broadly loosen limits. If unresolved, add minimal bounded closed-category client diagnostics for the rejected validation boundary. No raw payloads, document text, IDs, cookies, keys, exceptions, response bodies or persistent traces; unknown categories fail closed. Reuse the existing diagnostics system. Do not add retries or speculative timeout increases.

## Skills and tests

Read .agents/skills/vercel-react-best-practices/SKILL.md for relevant adapter/lifecycle correctness; .agents/skills/playwright-cli/SKILL.md if browser tests are needed. No UI redesign. Consult installed Next documentation only for framework changes.

Use Node24.22.0/npm11.19.1 in existing .env-free/network-denied checkout. Existing commands: npm run test:voice-adapter; npm run test:owned-voice; npm run test:lifecycle; npm run test:priming; npm run test:owned-text. Run affected checks; for application edits also npm run lint; npm run typecheck; npm test; npm run build. Build before built scripts. Do not rerun unchanged unrelated suites. Add focused tests only where needed to expose the actual boundary.

## Acceptance and evidence

1. First rejected predicate identified with reproduced evidence, or explicitly NOT_REPRODUCED with safe diagnostic coverage ready for PM deployment.
2. Tests cover valid serialized preparation and relevant malformed/expired/mismatched cases; rejection never reaches credentials/media. Abort/late-result cleanup preserved.
3. Any new categories cannot leak private/sentinel data and remain bounded. No paid/API call, real DB mutation, secret edit or host change.
4. Return changed files/hashes, build/runtime, exact commands/UTC/exits, before/after result, artifact paths under artifacts/local/08i, and outstanding hosted/device gaps. Update PROJECT_STATE/TESTING; keep previous evidence/ledgers intact.

PM manual follow-up after acceptance: deploy any narrow fix/diagnostics, correlate one affected-Chrome attempt with server trace and safe validation category. No worker claim of hosted success, physical audio or completed Step08. Stop after this bounded task; no credentials/WebRTC/audio feature expansion.
