# Task 08I — browser preparation validation handoff

21 October 2026 Toronto. Proposed **READY_FOR_REVIEW**, diagnostic fallback implemented; hosted cause **NOT_REPRODUCED**. No root-cause repair or completed Step 08 claim. PM owns acceptance and deployment. Public voice configuration was not changed and remains enabled per the user's instruction.

## Identity and scope

Clean arrival on `main`, HEAD `374d2b152dc750dd4c0db30a914acca9cbd6b900` (later PM documentation than the brief's d01d275). Uncommitted dirty delivery; no commit/push/deploy. Local production build **dqG5-FSyISEEOCazYPUxD**. Checks use **Node 24.22.0 / npm 11.19.1**, not the inspected host defaults 26.5.0/12.0.1. Verification copy: `artifacts/local/08i/offline-checkout`, no private .env, reused dependency junction, empty real keys, unusable loopback database, external network denied by the existing preload/browser guards. No dependency installation, lockfile/schema change, real database access or paid/provider call.

Selected local React correctness and Playwright skills were read; no UI redesign or framework API change. Original Step 01–14 IDs and previous evidence remain intact.

## Finding and limits

The new native Chromium 156.0.8078.4 harness executes the **real browserVoiceAdapters.prepare**, including native fetch/Response/UTF-8 reader/JSON parser and the actual shared admission/manifest/policy code. A loopback server invokes the actual server handlers/VoiceRegistry with a synthetic owned repository and a mint function that fails if called. Server JSON is serialized over HTTP, not injected as an already validated object. Browser modules are TypeScript-transpiled from repository source; this focused harness is distinct from the production-build UI suite.

Two newly authored valid PDF files (one and three pages) pass the existing isolated PDF parser, owned Source construction, server preparation, browser validation and exact section reconstruction. A separate authored eight-page extraction-contract fixture covers Unicode, emoji, combining marks, punctuation, hostile quoted strings, CR/LF, tabs, empty pages and escaped U+2028/U+2029. The Unicode case is an extraction fixture, not a newly generated Unicode PDF. All three valid serialized projections pass on both original HEAD and changed code.

Controlled relative clock offsets reproduce rejection: client 1s or 60s behind the fixed server clock yields `ticket_future`; client 31s or 60s ahead yields `ticket_expired`; client 1s ahead passes. The existing predicate is `ticket expiry > client now + 30 seconds` or `<= client now`. This proves a clock-sensitive boundary, **not the user's clock offset or hosted root cause**. No captured hosted body/predicate or synchronized clock evidence is available. Consequently this delivery preserves the existing expiry/ownership rules and instruments the boundary rather than speculatively changing it. JSON serialization itself did not reproduce an aligned-clock failure in these fixtures.

The focused harness has 28 scenarios and explicitly denies credentials, peer, audio, stream, microphone and external requests. Every scenario cancels its unclaimed preparation, verifies zero retained registry entries, and records only the closed diagnostic rows and pass/fail/counts. Totals: **28 cancellations, zero credentials, zero media/peer attempts, zero provider calls, zero forbidden network attempts**. It does not call connect, ask a question, or test audio.

## Changes

| File | Change |
|---|---|
| `src/app/voice-browser-adapters.ts` | Report the first failed read/envelope/identity/time/admission/source boundary using fixed categories; preserve existing rejection conditions, byte limits and cancellation. Reader exceptions remain generic and private. |
| `src/shared/priming-admission.ts` | Extract the existing boolean predicates into a closed reason-returning function; boolean callers use the same result. Policy and complete source/manifest comparisons remain exact. Unknown structural exceptions reject. |
| `src/shared/voice-diagnostics.ts` | Optional allowlisted reason only on preparation_validation/invalid. Unknown runtime values project to `unknown`, with no coercion/serialization. Existing 32-row/600000ms memory bounds and terminal suppression remain. |
| `src/shared/voice-lifecycle.ts` | Forward the optional category through the existing current-attempt reporter. Stale/aborted attempts remain suppressed. |
| `src/app/voice-session.tsx` | Render the safe category in existing failure details. |
| `scripts/verify-voice-preparation.mjs`, `package.json` | New repeatable `test:voice-preparation` native browser/serialized-server harness. |
| `scripts/verify-voice-adapter.mjs` | Production-build failure-details check at 390px; inject an invalid future expiry into actual successful preparation, assert category and zero credentials/media/provider, capture screenshot. |
| `tests/unit/voice-browser-adapters.test.ts` | Eleven focused cases: lifecycle category forwarding and reader failures, no credentials/media, cleanup. |
| `tests/unit/voice-diagnostics.test.ts` | Hostile/sentinel/unknown category projection, stage restriction, bounds and late-report suppression. |
| `docs/PROJECT_STATE.md`, `docs/TESTING.md`, this report | Scope, evidence, command ledger and outstanding gates. |

Categories distinguish MIME, byte bounds, body read, UTF-8, JSON, envelope/request/ticket, expiry/future time, admission shape, policy, source serialization, manifest fidelity, voice variant, run/source identity, source kind and source expiry. `admission_unknown` and `unknown` remain fail-closed diagnostic gaps; they are not evidence for a particular predicate. No text, identifiers, raw bodies, cookies, keys, error objects or persistent client traces were added. No retries or deadline changes.

## Verification

All commands below ran locally in the isolated copy with pinned runtime. Exact invocations, UTC start/end, exits and individual logs are in `artifacts/local/08i/commands.jsonl`. Build precedes all built scripts. Application inputs were unchanged after the production build; later additions were tests/harness/docs only.

| Command / procedure | UTC on 21 October 2026 | Result |
|---|---|---|
| `npm run test:voice-preparation` | 05:19:57.510–05:20:00.292 | PASS/0, 28 native Chromium scenarios |
| `npm run lint` final | 05:21:10.022–05:21:17.117 | PASS/0 |
| `npm run typecheck` final | 05:21:17.121–05:21:20.893 | PASS/0 |
| `npm run test` final | 05:21:20.895–05:21:27.970 | PASS/0, 1524/1524, no skips |
| `npm run test:priming` | 05:20:26.920–05:20:27.917 | PASS/0, 75 |
| `npm run test:lifecycle` | 05:20:27.919–05:20:28.728 | PASS/0, 63 |
| `npm run build` | 05:20:28.729–05:20:37.612 | PASS/0, build dqG5-FSyISEEOCazYPUxD |
| `npm run test:voice-adapter` | 05:21:27.972–05:21:55.343 | PASS/0, 87 units + 456 built checks / 37 scenarios |
| `npm run test:owned-voice` | 05:21:55.344–05:22:16.157 | PASS/0, 116 units + 392 built checks |
| `npm run test:owned-text` | 05:22:16.159–05:22:33.452 | PASS/0, 417 built checks |
| Original-HEAD diagnostic assertion | 05:22:40.161–05:22:42.452 | Expected FAIL/1: missing ticket_future reason, valid serialized cases passed first |
| Original-HEAD behavioral comparison | 05:22:42.455–05:22:45.123 | PASS/0, same 28 admission decisions with expected absent reasons |

The two baseline commands run `node --conditions=react-server scripts/verify-voice-preparation.mjs` inside a separate .env-free `baseline-checkout` with the four original HEAD adapter/admission/lifecycle/diagnostic files. The second changes only the test's expected reason to undefined. `baseline.mjs` logs these exact phases. The diagnostic red assertion is deliberate, not a product test failure. Initial lint/typecheck/1512-unit passes before final test additions are retained in the command ledger, not substituted for the final counts.

The broader built suites use existing **synthetic** credentials/SDP/peer/media and provider mocks; their mock calls are not paid or live calls. Zero acquisition claims above refer specifically to the 08I preparation-only harness and its built rejection scenario. Existing abort/late-result/Stop/stale-attempt, ownership, expiry, exact policy, complete-source and ACK-before-microphone coverage remains passing. Full unchanged unrelated suites were not repeated.

Evidence under `artifacts/local/08i/`:

- `offline-checkout/artifacts/local/08i/preparation-results.json`, `authored-1.pdf`, `authored-3.pdf`: focused browser/serialization checks and authored inputs.
- `offline-checkout/artifacts/local/08i/preparation-rejection.png`: visually inspected synthetic 390px failure details; category wraps readably without clipping. Viewport emulation is not physical-phone evidence.
- `offline-checkout/artifacts/local/08d/`: full built adapter results and safe server logs; `02d/built-http.json` and `10d/` contain the existing owned voice/text evidence.
- `red.log`, `red-results.json`, `baseline.log`, `baseline-results.json`: original HEAD comparison.
- `commands.jsonl`, individual command logs, `audit.json`, `changed-files.sha256.json`: runtime/build identity, exact commands/exits, source equality, port release and delivery hashes.

## Acceptance and PM follow-up

1. **Partial diagnosis:** exact hosted failure is NOT_REPRODUCED; safe diagnostics are ready for PM review/deployment. Clock offset is a controlled reproduction only, not an asserted hosted cause.
2. **Local PASS:** valid serialized sources, malformed/expired/mismatched cases, zero acquisition on rejection, cleanup and existing late/abort checks pass. Original and changed admission decisions agree on all 28 focused scenarios.
3. **Local PASS:** bounded allowlisted categories, hostile/sentinel data rejection, no real database/provider call or host/secret edit. Server authorization/expiry and ACK-before-mic remain unchanged.
4. **Delivered:** changed-file hashes/build/runtime/command UTC/exits and evidence paths; PROJECT_STATE/TESTING updated without replacing old ledgers.

PM should review this diff and evidence, then deploy accepted diagnostics under the standing voice-enabled instruction. Correlate **one** affected-Chrome attempt with server timing and expanded safe category. Do not collect private documents, HAR, raw response bodies or credentials. A normal Start may continue to credential/provider work if preparation succeeds; any such follow-up belongs to PM's allocation, not this provider-free worker task. A preparation-only harness must stop/cancel immediately after validation. Use the category to assign the next narrow correction; unknown categories do not authorize bypassing validation.

Hosted confirmation, the user's actual clock relationship, real microphone/audio and physical-device behavior remain **NOT_RUN** here. No user retry requested by worker; no next task started; full Step 08 remains open.
