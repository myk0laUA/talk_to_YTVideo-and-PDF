# Task 08P — fixed larger default for owned voice

**READY_FOR_REVIEW — implemented and verified offline.** PM review and live/device checks remain open. No deployment, paid model calls, real database operations, caption changes, prompt experiments or later implementation task.

Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, with arrival dirty work preserved; no commit. Fresh production build **`9plm_yr0fscZi-VDwACfo`**. All task checks use Node **24.22.0** / npm **11.19.1**. Exact executable/argv/cwd/UTC/exits and separate logs, including the initial failure, are in ignored `artifacts/local/08p/commands.jsonl`. SHA256 delivery manifest: `artifacts/local/08p/changed-files.sha256.json`; arrival comparison: `preservation.json` and `baseline.json`.

## Changes and acceptance mapping

Owned PDF and YouTube voice now use **gpt-realtime-2.1**, revision **provider-voice-full-source-default-2026-10-22-v7**. The immutable policy is selected once for preparation/session lifetime; no automatic Mini fallback exists. Text remains on its accepted larger default and separate text revision.

| Criterion | Implementation and evidence |
|---|---|
| Exact identity through preparation/provenance, issuance and ACK | `src/shared/priming-provider-policy.ts` changes only the voice model/revision. Existing exact consumers in `model-policy.ts`, `model-measurement.ts`, `voice/registry.ts`, `voice/provider.ts`, browser adapter, admission and priming controller require this identity. Inspection found no duplicate production voice model setting needing modification. Provider-boundary tests assert the literal larger model for both kinds; initial/final Mini ACKs fail before media. |
| Fixed follow-up identity; no fallback | New 08P tests in `provider-voice-admission.test.ts` exercise two provider turns for PDF/YouTube, retaining the frozen policy and one connection/media acquisition with no re-prime or outbound session changes. New `owned-voice.test.ts` cases run each kind through actual registry/handlers and injected `createVoiceMint`: success and provider503 each make exactly one larger request; consumed ticket cannot retry. |
| Old revision, model and cross-mode rejection | New admission tests reject old Mini, old v6, their combination, text mode and text revision. Existing negative preparation tests now use Mini as the invalid model. Text/voice resolvers and preparations still cannot cross-authorize despite identical model names. `default-text-model.test.ts` now verifies larger for both and distinct voice mode/revision. No ACK assertions removed. |
| Preserve source, settings, security and controls | Arrival policy bytes match after reversing only model/revision (allowing newline normalization). Full-source manifest encoder, prompts, WebRTC transport, browser adapter and server runtime are unchanged. Marin, transcription, VAD0.6/600ms, automatic response/interruption, concise instructions, 2048 output and disabled truncation retained. Existing foreign/expired/replaced-source, stale-work, readiness, mute, interruption, Stop, resource cleanup and microphone-free text tests pass. |
| Built boundaries and recovery | `tests/owned-voice/server.mjs` requires literal larger issuance. `tests/voice-adapter/fakes.mjs` supplies larger ACKs; intentionally wrong-model fault remains. Built adapter runs actual UI/routes with synthetic SQL/provider/SDP/RTC/media. Both source kinds, ACK-before-media, source fidelity, controls, clock skew, failures, replacement and cleanup are exercised. |
| Documentation and prior work | README/environment guidance and canonical handoffs describe both larger defaults, actual settings and limitations. `scripts/verify-owned-voice.mjs` accepts a task evidence directory. Package/lock, accepted text implementation, all other arrival files and historical results remain preserved. |

`README.md`, `.env.example`, `START_HERE.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_STATE.md` and `TESTING.md` receive scoped guidance/status additions. Full task changes comprise those six files, the shared policy, voice verification script, two provider/browser fake files, three unit-test files and this report. Original Step01–14 IDs remain intact.

## Verification

All checks are **local/offline** with synthetic credentials, storage and provider/native boundaries plus external-network denial. Build/type generation sees root `.env`; subprocess credentials are overridden with blank keys, synthetic visitor settings and unusable loopback database. Prisma generation does not connect to PostgreSQL. No live API capability, model accuracy or acoustic improvement is inferred from these checks.

Task runner: `.tools/node-v24.22.0-win-x64/node.exe artifacts/local/08p/run.mjs NAME`. It invokes the exact pinned npm CLI for npm commands, records separate timestamped logs, and directs owned text/voice evidence into this task. A task-only filesystem preload redirects older unit/adapter evidence paths into `08p/unit-evidence/` so prior artifacts are not overwritten; no production hook or dependency was added.

| Check / actual command | Observed | Status / exit |
|---|---|---|
| `node --version`; `npm --version` | v24.22.0 /11.19.1 | PASS /0 each |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts tests/unit/owned-voice.test.ts tests/unit/voice-browser-adapters.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/voice-interruption.test.ts tests/unit/voice-spoken-flow.test.ts tests/unit/priming.test.ts tests/unit/provider-admission.test.ts tests/unit/default-text-model.test.ts` | **721/721**, no skips | PASS /0 |
| `npm run lint` | No warnings/errors | PASS /0 |
| `npm run typecheck` | Prisma/Next generation and TypeScript pass | PASS /0 |
| `npm test` | **1727/1727**, no skips | PASS /0 |
| `npm run build` | Fresh root build `9plm_yr0fscZi-VDwACfo` | PASS /0 |
| `npm run test:owned-voice` | **129 units +392 built checks**, four HTTP groups, external attempts0 | PASS /0; `owned-voice/built-http.json` |
| `npm run test:owned-text` | **532 built checks**, genuine no-media text and two turns, external attempts0 | PASS /0; `owned-text/integrated-results.json` |
| `npm run test:voice-adapter` | **113 units +571 built checks**,48scenarios/36synthetic SDP exchanges, external attempts0 | PASS /0; `unit-evidence/08d/built-application.json` |
| `node artifacts/local/08p/audit.mjs`; `git diff --check` | Scoped arrival changes, only voice model/revision altered in policy, unchanged text/package/lock, all three built reports same build/no external attempts, clean whitespace | PASS /0; `preservation.json`, `diff-check.log` |
| Live provider/model ACK, actual microphone/speaker/phone, semantic comparison, deployed checks | Not authorized/performed in08P | NOT_RUN |

The initial focused run failed **1/708** because the existing text-default regression explicitly expected Mini for voice. Corrected to assert both larger defaults and mode/revision separation; final focused/full suites above pass. This initial exit1 is retained in the command ledger. Two exploratory reads named nonexistent files (`priming-session.ts`, `priming-response.ts`); inspection continued against actual `priming-controller.ts` and `voice-response.ts`. No implementation or check depended on those missing paths.

Visually inspected `unit-evidence/08d/youtube-390-stopped.png`: stopped synthetic voice transcript and source remain readable, with no visible horizontal clipping. This is viewport emulation with fake media, not physical phone/audio evidence. Harness teardown asserts stopped tracks, closed peers/channels, listeners/timers/entries released and reusable server ports.

## Remaining work and PM handoff

Historical semantic failures remain unchanged, including **03L larger PDF own-ball spotting-exception omission: FAIL**, accepted as a delivery limitation. Larger voice is not proven to fix omissions or unintended quiet-input interruption. Public YouTube remains disabled; no deployment configuration changed. Local text/lifecycle user reports remain separately scoped evidence.

After PM review, restart the configured local app, import one PDF or local YouTube source, start Voice, ask a summary and follow-up, interrupt once, exercise Mute/Unmute and Stop, then switch to text and receive a real answer. Where existing safe instrumentation permits, confirm actual model ACK `gpt-realtime-2.1`; never capture credentials or audio. Record device/browser/build and observed failures. A bounded user check suffices; no repeated semantic experiment is assigned.

PM owns review, the short live check, then one focused UI/mobile polish task and remaining recovery/storage/security/final release gates. **READY_FOR_REVIEW. Stop.**
