# Task 03I — owned text input-size routing

**PM decision —22October2026: ACCEPTED for offline implementation scope.** All17 delivery hashes matched. Reviewed estimator/selection, preparation provenance, registry source checks, socket/model propagation, unchanged shared ACK/turn validation and calibration-fixture limitations. Fresh pinned PM routing/provider-admission/owned-text run with network-denial preload:157/157PASS, exit0, no skips (`artifacts/local/03i/pm-review-tests.log`). Worker full1727unit/build/532built-check results remain reviewed worker evidence, not PM reruns. No blocking finding in assigned scope. Routing stays disabled; no quality cutoff accepted. Repeated synthetic load fixtures are not sufficient for live quality calibration. Voice routing, live application routing/accuracy and release acceptance remain open. Worker handoff below retained as submitted.

**READY_FOR_REVIEW — implemented offline, 22 October 2026 Toronto.** Original Steps 07/10/13 remain open to PM acceptance. Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, dirty delivery preserving accepted 03G/cleanup/11D work. Local root production build **`TT0vHgJ-bEvCk1afwmjLM`**. No commit, deployment, real database access, caption acquisition, model call or new spending allocation. Historical 03H summary FAIL/follow-up UNRESOLVED remain unchanged.

## Behavior and boundaries

`src/server/context/text-model-routing.ts` is the common, source-kind-independent decision function for PDF and YouTube genuine text fallback. Each server preparation reads current server configuration after authorized complete source preparation, snapshots configuration, serializes the existing full manifest, measures it, and freezes one decision. The registry retains that decision for the session. Preparation provenance binds the actual model/mode/policy revision; the socket URL, shared admission predicate, exact effective-model ACK check, and every turn use that selected policy. Existing shared admission/controller/lifecycle already consume the predicate and admitted policy; no separate Mini-only validators remain on this path.

| Server configuration | Meaning |
|---|---|
| `OWNED_TEXT_MODEL_ROUTING_ENABLED` absent or `false` | Existing Mini policy; no estimator/cutoff prerequisite. New routing remains disabled by default. |
| Gate `true`, `OWNED_TEXT_MODEL_ROUTING_CUTOFF` absent/empty | Larger model, reason `cutoff_unset`. There is no production default cutoff. |
| Gate `true`, valid positive safe-integer cutoff | Mini only for a known estimated input size **strictly below** cutoff; equality/above selects larger. |
| Gate `true`, unknown/failed/invalid measurement | Larger model, reason `measurement_unknown`, unless cutoff is unset (reported first). |
| Other gate values or malformed/nonpositive/nonfinite/fractional/overflow cutoff | Explicit configuration error from parser; owned preparation fails recoverably before socket acquisition. Browser receives the existing sanitized failure. |

Both policies retain minimal reasoning, 512 output tokens, text-only behavior and disabled truncation. Mini policy stays `provider-text-full-source-2026-10-20-v1`; larger is `provider-text-full-source-large-2026-10-22-v1`. Decision version is `text-input-routing-2026-10-22-v1`, always `calibration: uncalibrated`, `capacityAdmission: false`. Decision records policy, measurement basis/version/tokenizer, instruction/item counts, input size, cutoff, reason and separate reserves. No model selector or technical UI was added. HTTP bodies containing model/policy/inputSize/cutoff/calibration claims are rejected.

Ownership, visitor/source expiry and full source identity are checked after asynchronous preparation and immediately before/after connection acquisition. The registry now compares the prepared source representation hash for both kinds on subsequent authorization, including follow-ups. Replacement/removal/Stop invalidates the old session; replacement needs fresh preparation and selection. No mid-session remeasurement, switching, replay, automatic retry or silent downgrade exists. Larger unavailable follows the existing recoverable connection failure. Context-limit failure retains explicit recovery and full source preview.

**Voice routing is not implemented.** Existing WebRTC voice policy, settings, source instructions and serialization are preserved. The estimator is lazy and never used by voice or routing-off text. Relevant owned voice/priming/lifecycle regressions pass offline; physical audio and live provider behavior remain NOT_RUN.

## Counting investigation and estimator limits

OpenAI Docs skill applied; official counting/model pages were searched and opened before implementation. Investigation ended before the pinned dependency installation at 05:19 UTC, within the 15-minute cap. [Counting tokens](https://developers.openai.com/api/docs/guides/token-counting) documents the Responses input-token endpoint. It does not establish an exact Realtime counting endpoint/encoding/framing binding. [Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) and [larger](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) each document a 128,000 context window. Selecting larger is a capability choice, not added context capacity. [Advanced usage](https://developers.openai.com/api/docs/guides/advanced-usage) points to tiktoken for local text counting; this does not validate the encoding chosen here for Realtime.

Pinned **`js-tiktoken@1.0.21`**, bundled **`o200k_base`** ranks, provides an explicit surrogate BPE estimate. Lockfile pins transitive `base64-js@1.5.1`; no existing package entry changed (`dependency-diff.json`). No runtime rank download or paid counting call. Measurement identity `realtime-content-estimate-v1`, tokenizer `js-tiktoken@1.0.21/o200k_base`, basis `estimated_tokens`. Failures return explicit unknown size. Existing unresolved exact tokenizer and framing evidence in `model-policy.ts` remains unresolved.

Count every full serialized `input_text` string separately, including repeated metadata, locators, separators, escaped Unicode and fragmentation overhead. Count the **maximum of configure/finalize instruction alternatives once**, since session updates replace instructions. Neither transport event JSON nor file bytes/page count/video duration/source kind is substituted for tokens. Full text and instructions remain byte-identical to the accepted serializer; nothing is truncated, translated, retrieved or summarized.

The cutoff compares that instruction-plus-source content estimate. Separate **provisional planning allowances**, excluded from routing size: framing `1024 + 32 × itemCount`, question `512`, history `4096`, output `512`. These are not measured provider usage, hidden-framing upper bounds, quality guarantees or capacity admission. Increasing history cannot change the selected model. The provider enforces capacity at each response with truncation disabled.

`npm audit --json` completed with exit 1: five high findings in the preexisting `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` chain; neither added package is listed. Existing affected lockfile entries are unchanged. No unrelated audit fixes applied. Audit is an advisory snapshot, not a guarantee of absence of other vulnerabilities.

## Verification

Delivery is 17 files, SHA256s in `artifacts/local/03i/changed-files.sha256.json`: `package.json`/`package-lock.json` pin the estimator; context `text-model-routing.ts`/`text-token-estimator.ts` implement selection/measurement, `model-policy.ts`/`model-measurement.ts` bind preparation; text `registry.ts`/`runtime.ts`/`socket.ts` retain and connect the decision; shared `priming-provider-policy.ts` extends the allowlist used by existing validators; `tests/unit/text-model-routing.test.ts`, `tests/context/routing-calibration-fixtures.ts`, `tests/text-relay/server.mjs` and `scripts/verify-owned-text.mjs` verify both routes and isolate evidence output; this report, PROJECT_STATE and TESTING record the handoff. Final preservation audit verifies 568 preexisting files outside that delivery unchanged, exact serializer/instructions and voice declaration preserved, and no routing/estimator markers in 13 browser chunks.

All checks use pinned Node **24.22.0** / npm **11.19.1**. Shell discovery initially reported 26.5.0/12.0.1; those were not used for implementation checks. Root `.env` remains in place, but check subprocesses override provider credentials, database and gates with synthetic/unusable values; external network is denied for verification. Built-app tests explicitly inject a fake provider and synthetic Prisma. The separate npm install/audit requests contact the npm registry only. No real DB or provider integration is claimed.

Exact executable/arguments/cwd/UTC starts/ends/exits: ignored `artifacts/local/03i/commands.jsonl`. Logs and all new screenshots/evidence are under that directory; the owned-text harness now accepts an evidence-directory override so older evidence is not overwritten.

| Check / command | Environment and expected result | Observed | Status / exit | Evidence under `artifacts/local/03i/` |
|---|---|---|---|---|
| `node --conditions=react-server --test tests/unit/text-model-routing.test.ts tests/unit/provider-admission.test.ts tests/unit/owned-text.test.ts tests/unit/owned-voice.test.ts tests/unit/priming.test.ts tests/unit/text-lifecycle.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/model-budget.test.ts` | Local fake repository/provider; routing, authorization, ACK, cleanup and voice regressions | 552/552 | PASS / 0 | `focused.log` |
| `npm run lint` | Local static checks, no warnings | Clean | PASS / 0 | `lint.log` |
| `npm run typecheck` | Prisma/Next type generation and TypeScript; no DB connection | Clean | PASS / 0 | `typecheck.log` |
| `npm test` | Full local offline unit suite | 1727/1727, no skips | PASS / 0 | `test.log` |
| `npm run build` | Actual root production build with fake configuration | `TT0vHgJ-bEvCk1afwmjLM` | PASS / 0 | `build.log` |
| `npm run test:owned-text` | Built Next HTTP/UI, real registry/socket adapter, injected fake socket/repository; no real media | 532 checks, 6 groups; both kinds × both model URLs with matching ACK/two turns/Stop; 13 client chunks/20 traces audited | PASS / 0 | `test:owned-text.log`, `owned-text/integrated-results.json` |
| `node --conditions=react-server artifacts/local/03i/inventory.mjs` | Offline fixture serialization/counts, support keys and existing lockfile preservation | 6 synthetic + 2 unchanged real regression snapshots; all support IDs valid | PASS / 0 | `calibration-inventory.json`, `inventory.log`, `dependency-diff.json` |
| `npm install --save-exact js-tiktoken@1.0.21` | Pinned narrow dependency change | Two added packages | PASS / 0 | `npm-install.log` |
| `npm audit --json` | Registry advisory snapshot | Five existing high findings, described above | Findings / 1 | `audit.log` |
| Preservation / `git diff --check` | Existing unrelated work, serializer/instructions/voice policy preserved | See final audit/hashes | PASS / 0 | `preservation.json`, `changed-files.sha256.json`, `diff-check.log` |
| Live answers/calibration/hosted/phone/audio | Not authorized/needed in this offline task | No calls or deployment | NOT_RUN | Historical failures retained |

Development failures retained: first typecheck exit 2 on two new test typings (optional sections and fake socket constructor); first lint exit 1 on an unused test type; first full unit run exit 1 because two new simulated context-limit errors omitted required `event_id` and correctly produced protocol failure. Test payload fixed; product recovery was unchanged. Logs `typecheck-first.log`, `lint-first.log`, `test-first.log`. A later stronger valid-source mutation test reused shared fixture sections and contaminated two subsequent tests; `test-second.log` retains that exit 1, fixed by cloning fixture inputs. First audit was blocked by the verification network preload; `audit-first.log` retained, then audit rerun with registry access. Initial exploratory reads also encountered nonexistent guessed test/evidence filenames; these were inspection errors, never verification passes. Final required checks pass as reported.

## Acceptance mapping

| Criterion | Evidence |
|---|---|
| Strict boundaries, invalid values, unknown/unset, source independence | `text-model-routing.test.ts`: below/equal/above, malformed/nonfinite/fractional/overflow cases, explicit unknown/unset; equivalent measured inputs produce identical complete decisions. Both branches exercised for each kind. |
| Complete multilingual content and metadata; no loss; honest estimates | Full serializer reconstruction, non-ASCII/Arabic/Chinese/combining/emoji/special-token-looking fragmented input, exact item counts/peak replacement instructions; fixture inventory. Estimation stays separate from capacity/provider usage. |
| Actual owned lifecycle with fake boundaries | Unit real registry/preparation/lifecycle: matching ACKs, mismatched model/settings/revision denial, foreign/expired/replaced/removed/mutated sources across awaits, Stop during estimation, follow-ups fixed after config change, replacement starts fresh decision, unavailable larger/context-limit no downgrade. Built routes verify both selected URLs/ACKs and cleanup. |
| Routing-off regressions and no browser control | Existing PDF/text/voice/priming tests; built default-off UI/ownership/recovery; rejects caller model/policy/size/cutoff/calibration; server-only estimator/config and unchanged serializer/voice policy audited. |
| Resources and privacy | Built groups finish with zero active providers/sessions/listeners/timers, equal opens/closes and port released. Zero forbidden external calls. No owner hash, credential, source body or routing metadata sent in relay snapshots. New sanitized inventory contains hashes/support keys/expected rubric text, not source bodies. |
| Calibration preparation only | Frozen inventory below; all live accuracy NOT_RUN, policy uncalibrated, no candidate production threshold. Synthetic repetition cannot prove accuracy. |

## Frozen calibration inventory

`tests/context/routing-calibration-fixtures.ts`, version `routing-calibration-inventory-2026-10-22-v1`, freezes six synthetic routing-load fixtures and 13 questions/support keys each: six beginning/middle/end facts, two comparisons/syntheses, two linked follow-ups, absent fact, malicious embedded instruction, and whole-source summary requiring beginning/middle/end support. Medium/long repeat complete authored fixture blocks 8/32 times with stable renumbering; these are explicitly synthetic load inputs, not new independent accuracy cases. They do not trim or replace original real sources.

| Fixture | Kind / sections | Initial content estimate, excluding reserves | Semantic result |
|---|---|---|---|
| `pdf-short` | PDF / 8 pages | 1326 | NOT_RUN |
| `pdf-medium` | PDF / 64 pages | 9579 | NOT_RUN |
| `pdf-long` | PDF / 256 pages | 37875 | NOT_RUN |
| `captions-short` | Captions / 7 segments | 728 | NOT_RUN |
| `captions-medium` | Captions / 56 segments | 4077 | NOT_RUN |
| `captions-long` | Captions / 224 segments | 15930 | NOT_RUN |
| Original `03h-source-0` / Cuddy | Albanian / 428 segments | 25819 | Historical 1-4 UNRESOLVED; new run NOT_RUN |
| Original `03h-source-1` / Urban | Arabic / 316 segments | 17508 | Historical 2-1 FAIL; new run NOT_RUN |

Real source files remain unchanged at `artifacts/local/03h-continuation/source-0.json` / `source-1.json`, SHA256 respectively `f1bc8dcade311822f2676ab75d8fc3ee523ed1187818ada0b8950775a0eeaf3d` and `5c23c29b4f6277945036ca179d8f09a72260380c2e40729ec340e6047673fa56`. Preserve **all ten original questions/expected answers/support spans**, including summary, first/middle/end facts, linked follow-up and absent DOI in `cases.json`, SHA256 `5e191a514eec3b0011e4883d44ca7f26d5c5152835829cec82e9f7ea33c1b4c4`. Stored one-based segment IDs remain distinct from zero-based support-array ranges. These saved snapshots were serialized read-only for offline measurement, never authorized as application sources; original expiry metadata is retained. No source reacquisition or cleanup attempted.

`calibration-inventory.json` records each question/support key and hash, both real-source file hashes, exact versioned measurement identity and test-only boundary decisions; no generated answer. Estimates depend on unchanged serialized metadata/fragmentation. They are not directly comparable with provider totals that include framing/question/history, and the previous larger-model observations 17557/26178 do not establish Mini's quality boundary.

PM next reviews the delivery hashes and evidence, then separately authorizes/calibrates a capped complete-app batch. Keep routing disabled until that decision. Real-source reliability, larger availability, actual provider accounting and voice routing remain unverified. Stop at READY_FOR_REVIEW; no later task begun.
