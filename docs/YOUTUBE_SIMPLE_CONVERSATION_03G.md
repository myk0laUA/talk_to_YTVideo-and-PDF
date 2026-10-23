# Task 03G — simple full-source YouTube conversation

**Outcome: implemented offline; READY_FOR_REVIEW.** PM decides acceptance. Original Steps 03/07/10 and live grounding/release gates remain incomplete. Historical 03F failures remain FAIL. No live spending, deployment, database access, configuration change, commit or push.

## Identity and scope

21 October 2026 Toronto. Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`; dirty delivery on top of existing PM documentation. Isolated production build `KZnJuo6Z1x1aL4TbEJXWN`. Root build remains `R_ixIZMDu1UXwpkBpA8ws`. Public voice enabled / YouTube disabled were not changed; no fresh hosted observation. Last PM-confirmed Live `52ba0a0` is historical identity only.

Implementation began after guidance/consumer inspection; first protected-file snapshot 03:50:29 UTC, application edits complete before checks at 03:51:48 UTC. Test-only streaming/preview assertions refined through 03:53:37 UTC; final lint ended 03:54:50 UTC. Approximately 10 minutes including initial reading and evidence preparation, well within 90-minute implementation timebox; main verification 03:51:48–03:54:50 UTC (~3 minutes, including test refinement). These are 21 October evening in Toronto, despite UTC date 22 October. Exact recorded command times/exits are in the ledger; durations outside it are approximate.

Used selected React best-practices and Playwright skills only, scoped to removing presentation coupling and existing isolated browser tests. No framework behavior/dependency changes. PM edits to START_HERE, plan, manager prompt and reassessment/task brief preserved; PROJECT_STATE/TESTING receive additive worker entries.

## Changes and decisions

- `src/shared/priming-manifest.ts`: provider YouTube text omits the general citation sentence and dedicated v5 citation prompt, retaining existing general source attribution, uncertainty/inference, absent-information, concision and untrusted-source instructions. Packed B payload uses `representationVersion: youtube-text-full-source-v6`. No new elaborate answer prompt; no provider/model/reasoning/output-limit change. PDF and voice take the original branch unchanged.
- `src/server/text/registry.ts`: returns the ordinary lifecycle transcript without evidence projection or retained evidence-source clone. Existing owned-source/expiry checks and exact prepared-source section comparison remain.
- `src/shared/transcript.ts`, `src/app/text-http-controller.ts`, `src/app/transcript-view.tsx`: remove citation-only types, pending-reference Stop transformation and reference UI. Ordinary text, draft/unfinished/completion notices and Stop retention remain. No regex rewriting of generated text, generated links or verified-text claim.
- Delete citation-exclusive `src/server/text/youtube-evidence.ts`, `src/shared/youtube-evidence.ts`, `tests/unit/youtube-evidence.test.ts`, `tests/unit/youtube-evidence-format.test.ts` after reference inspection. No citation-exclusive CSS existed; shared transcript styles remain.
- Update `tests/unit/youtube-text-citations.test.ts` (historical filename retained), owned-text and HTTP-controller tests for current version/admission and unchanged ordinary text. Preserve packing, hostile-source, Unicode, locator/order, ACK, Stop/replacement and forged-input regressions.
- Update transcript fixture/spec to assert literal citation-looking text with no notices/links. Replace the obsolete citation-state assertion deliberately; retain general lifecycle/rendering tests. Extend fake relay and `scripts/verify-owned-text.mjs` to exercise ordinary and citation-looking answers, partial streaming, retained transcript/full preview and zero media requests at desktop/390 px.
- Inspected `scripts/lib/full-source-text.ts` and `tests/priming/caption-decoder.ts`: they decode fragments/first-seen locators without checking citationVersion; no edits needed.

## Verification

All npm checks used pinned Node 24.22.0/npm 11.19.1 via `artifacts/local/03g/checks.mjs`, in a task-owned `.env`-free copy, fake/blank keys, loopback unusable PostgreSQL URL, established network-denial preload and browser external-request blocking. No private root `.env` copied or read. Existing dependency directory is junction-linked; no install/lockfile mutation. Browser suites use their existing explicitly injected provider/Prisma boundaries. Root production build and prior artifacts preserved.

Evidence base: `artifacts/local/03g/`. `commands.jsonl` records absolute executable/arguments/cwd/start/end/exit/log. npm aliases below correspond exactly to the pinned npm CLI invocations in that ledger.

| Check / command | Environment and expected result | Observed | Status / exit | Evidence |
|---|---|---|---|---|
| `node --version`; `npm --version` | Isolated, pinned versions | v24.22.0 / 11.19.1 | PASS / 0 each | node-version/npm-version logs |
| `npm run lint` | Isolated, zero warnings | Passed initially and after test refinement | PASS / 0 | lint logs; final 03:54:45 UTC |
| `npm run typecheck` | Isolated generated types/TS | Passed | PASS / 0 | typecheck log |
| `npm test` | Offline unit suite, fake transports | 1813/1813 | PASS / 0 | test log |
| `npm run build` | Isolated production build | KZnJuo6Z1x1aL4TbEJXWN | PASS / 0 | build log |
| `npm run test:owned-text` | Actual built routes/registry/UI; fake provider and Prisma | Final 441 checks; zero forbidden network; all connections/listeners closed, server ports released | PASS / 0 | final test-owned-text log; offline-checkout/artifacts/local/10d/integrated-results.json |
| `npm run test:transcript-view` | Isolated actual React component, desktop/390 px emulation | 40 tests; 260 production JS/JSON files checked for fixture exclusion | PASS / 0 | test-transcript-view log; offline-checkout/artifacts/local/09b/ |
| `npm run test:smoke` | Built default-disabled shell, synthetic config | 18 tests | PASS / 0 | test-smoke log |
| `node --conditions=react-server artifacts/local/03g/preserve.mjs` | Pure offline comparison against HEAD encoder and saved real captions | 24 byte-identical manifests; 428 exact captions; actual HEAD v5 manifest rejected | PASS / 0 | preservation.json; preservation log |
| `node artifacts/local/03g/audit.mjs`; `git diff --check` | Local source/build/import/delivery audit | 44 runtime modules, 13 client chunks, 20 route traces exclude experiments; whitespace passes | PASS / 0 | audit.json; changed-files.sha256.json; diff-check.log |
| Real import/semantic answers/YouTube WebRTC/physical phone/hosted checks | Requires later PM allocation and review | Not attempted | NOT_RUN | No live runner or old ledger used |

Next emits an inferred workspace-root/multiple-lockfile warning because the isolated checkout is inside the repo. Build and checks succeed; no config was changed to silence it. No extra owned-voice/voice-adapter runs: fixed manifests are byte-identical, general voice tests remain in npm test, and no voice lifecycle implementation changed.

Development failures retained: first Python edit helper stopped on default Windows text decoding (exit 1); rerun remaining edits explicitly with UTF-8. The first extended streaming assertion expected the wrong 26-character fragment and waited for completion (owned-text exit 1 at 03:53:17 UTC); corrected to the exact fake-provider fragment, then all 441 checks passed. Initial 429-check browser run also passed before this extension. Read-only inspection had an invalid Windows glob/missing guessed filename and a PowerShell colon-path lookup error. Task runner log names initially contained colons; copied those logs to portable hyphenated filenames and normalized ledger references. No failed provider call, application defect workaround, semantic regrading or live retry occurred.

## Acceptance mapping

1. **Complete context:** offline saved source from `03d-correction-2/source.json` compared with independently parsed historical XML (`03f-source-selection/independent-xml.json`). All 428 original IDs/text/order/start/duration match; fullText SHA256 `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`, including final text. Current packing uses 6 items/429 fragments, maximum event 16,384 bytes, total wire 96,253 bytes. This is preservation, not new ingestion proof.
2. **Manifests/admission:** 24 fixed comparisons cover PDF A/B voice/text and YouTube A/B voice, UUID/non-UUID runs, 2048/16384 event bounds. All bytes match HEAD. Old actual v5 and resealed v4/v5/forged payloads reject; current ACKs accept only exact initial/final settings. Source text injection remains untrusted data. Bounds/pacing/cancellation/readiness suites retained and pass.
3. **Ordinary answer delivery:** actual owned text route/registry to browser streams both normal text and citation-looking fake prose, retains it after Stop and displays no citation notices/excerpts/links. Literal `<script>` remains escaped inert text. All normal terminal notices remain. Unit tests separately verify Stop/connection-loss partial retention.
4. **Lifecycle/security:** unit and built-route suites cover visitor/origin/expiry/source replacement/removal, Stop during preparation/priming, late ACK/output suppression, replay/concurrency/single transport and resource release. Existing browser replacement case uses PDF; shared source invalidation and YouTube registry paths are also exercised in unit/route checks. No microphone/native RTC/socket/audio APIs called by text UI.
5. **Browser presentation:** reviewed `screenshots/youtube-390.png` and `screenshots/youtube-1440-stopped-preview.png`; further desktop/mobile stopped-preview captures available. Local fake-provider viewport emulation only, never phone/audio/semantic proof. Full preview is independently readable after Stop; no horizontal overflow.
6. **Scope/exclusion:** production app runtime import traversal, client marker scan and route traces exclude all Responses candidates. No model/service/schema/dependency/lockfile/configuration/public-flag change. Unchanged protected inputs are enumerated in audit.json; SHA256 delivery manifest records current files and explicit deletions.

## Precise residual experimental inventory for later PM cleanup

These remain outside the production runtime and were not reorganized or executed live:

- `src/server/text/responses-candidate.ts`: single-stage structured evidence candidate and source validation.
- `src/server/text/responses-stage.ts`: shared experimental request/policy/accounting execution.
- `src/server/text/responses-transport.ts`: optional live Responses transport, imported only by experimental scripts/tests.
- `src/server/text/responses-passages.ts`: two-stage passage selection/composition and composition-control export.
- `src/server/text/responses-catalog.ts`: experimental catalog block selection.
- `scripts/responses-eval.ts`, `scripts/passages-eval.ts`, `scripts/catalog-eval.ts`, `scripts/lib/responses-evaluation.ts`: isolated evaluation entrypoints/shared frozen rubric.
- `tests/unit/responses-candidate.test.ts`, `tests/unit/responses-passages.test.ts`, `tests/unit/responses-catalog.test.ts`: offline experiment tests retained; no app integration implied by their PASS.
- Historical 03E/03F briefs/reports/ledgers and ignored `artifacts/local/03f-*` scripts/captures retain old citation contracts and failures. They are archival evidence, not active app runtime. Removed helper tests remain recoverable in Git history; this does not relabel old scores.

The historical general citation sentence remains in `src/server/context/document.ts` for unchanged PDF/voice manifests; provider YouTube text filters that exact sentence at encoding. This is intentional preserved behavior, not dead code. No active evidence helper/type/UI remains. Source preview locators remain necessary source data, not a citation feature.

## Handoff

Propose READY_FOR_REVIEW for 03G offline scope only. PM reviews delivery hashes/build/preservation/screenshots and then freezes/costs the two-source/ten-answer whole-transcript evaluation. Do not run old live runners or reuse closed/withdrawn allocations. No user phone action needed now. Real local uncached import, complete-source answer accuracy, YouTube WebRTC and final physical/device/recovery/release gates remain open. Stop here; no next task started.
