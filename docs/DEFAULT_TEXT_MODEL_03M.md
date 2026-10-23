# Task 03M — fixed larger default for owned text

**READY_FOR_REVIEW — implemented and verified offline; PM acceptance pending.** Steps 07/10/13 remain open. No deployment, hosted YouTube activation, model calls, real database operations, semantic retry or next task was performed.

Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, dirty arrival work preserved; no commit. Fresh root production build **`yO5mykB8MaI-1g0D7cSZb`**. Pinned Node **24.22.0** and bundled npm **11.19.1** were used for every task check. Evidence is ignored under `artifacts/local/03m/`; exact executable/argv/cwd/UTC/exits are in `commands.jsonl`. Changed-file SHA256 values and arrival comparisons are in `changed-files.sha256.json` and `preservation.json`.

## Result and implementation

Every new production owned PDF and YouTube text session uses `PROVIDER_TEXT_POLICY`: **gpt-realtime-2.1**, revision **provider-text-full-source-default-2026-10-22-v3**, **2048** output tokens, minimal reasoning, full-source variant B, disabled truncation and no tools/audio input. Follow-ups retain that same frozen policy. Missing routing configuration, obsolete flags/cutoffs, short input and provider failure cannot select Mini. Errors retain the existing recoverable lifecycle/UI behavior; there is no fallback retry.

- `src/shared/priming-provider-policy.ts`: larger default and new rejectable revision; explicit `DIAGNOSTIC_MINI_TEXT_POLICY` for internal comparisons. Voice declaration remains byte-identical to HEAD's accepted v6 declaration.
- `src/server/context/model-policy.ts` and `model-measurement.ts`: exact allowlisted identity resolution, immutable preparation and provenance; removed routing/estimation dependency and selection. Original post-await visitor/source expiry, ownership, replacement and full serialization rechecks remain.
- `src/server/text/registry.ts` and `runtime.ts`: registry requests and retains the fixed larger policy, requires that exact default object after preparation, and passes it to the existing socket adapter. Production no longer reads routing environment variables or invokes an estimator. Socket, priming ACK, response permit/accounting and output reserves consume the same policy; no voice constant was repurposed.
- `scripts/verify-owned-text.mjs` and `tests/text-relay/server.mjs`: real built routes/registry/socket now require larger in all groups. Default/unset, obsolete Mini-favoring and obsolete invalid configurations exercise both source kinds, two responses and Stop; existing browser/recovery/security groups remain.
- `tests/unit/default-text-model.test.ts` replaces the active cutoff test file. Retains complete-source/diagnostic fixtures, provenance, exact model/settings ACKs, stale revisions, partial output, context failure, source races, follow-ups and Stop cleanup. Estimation-race injections now run at the actual final preparation source read. Obsolete threshold selection arithmetic/config tests were retired because that product feature was replaced, not because calibration passed.
- `tests/unit/owned-text.test.ts`, `provider-admission.test.ts` and `provider-voice-admission.test.ts`: update text identities/negative cases and scripted ACKs. The voice test changes are exclusively text expectations and the explicit text model argument; voice acceptance criteria are unchanged.
- `.env.example`, `README.md`, `START_HERE.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_STATE.md` and `TESTING.md`: larger default, no size switch, cost/accuracy limits and review handoff.

Removed unused production `src/server/context/text-model-routing.ts` and `text-token-estimator.ts`. The original surrogate encoder is retained as **diagnostic-only** `scripts/lib/text-input-estimate.ts`, with no selection or capacity admission. It and its complete multilingual/fragment/fixture regression checks still use pinned **js-tiktoken 1.0.21**, so removing that dependency would break a retained caller. `package.json` and `package-lock.json` are unchanged from task arrival; no install/uninstall/upgrade or new dependency audit was necessary. Production route traces exclude the estimator and tokenizer. Historical reports, frozen helpers, fixtures and closed ledgers remain evidence, not executable authorization for another trial.

The retained `scripts/lib/full-source-text.ts` Mini diagnostic now imports its explicit diagnostic policy. Its Mini model, rates and ledger semantics stay paired; the scripted helper accepts an explicit model so owned-text tests ACK larger without silently changing the historical Mini diagnostic. No user model selector was added.

## Verification

All application checks below are local/offline. Root build/type generation sees the existing `.env` file, with task subprocess credentials overridden to blank, unusable loopback DB, synthetic visitor/config and network-denial preload. Built harnesses inject fake provider and synthetic Prisma boundaries and deny external network. Prisma generation/type checking does not connect to PostgreSQL. These are functional integration checks, not live model/source-extraction/SQL/phone/audio proofs.

Run the equivalent checks with the pinned runtime. The task runner is `node artifacts/local/03m/run.mjs NAME`; it prepends the pinned runtime to PATH, sets the isolated values and records commands/exits. `focused` expands to `node --conditions=react-server --test tests/unit/default-text-model.test.ts tests/unit/provider-admission.test.ts tests/unit/owned-text.test.ts tests/unit/owned-voice.test.ts tests/unit/priming.test.ts tests/unit/text-lifecycle.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/model-budget.test.ts`.

| Check / actual command | Expected / observed | Status / exit / evidence |
|---|---|---|
| Pinned `node --version`; bundled `npm --version` | v24.22.0 / 11.19.1 | PASS / 0 each; tool output |
| Focused command above | Source fidelity/security, larger session identity, ACKs/2048, stale policies, no downgrade, two turns, partial/context errors and Stop; **539/539** | PASS / 0; `focused.log` |
| `npm run lint` | No warnings/errors | PASS / 0; `lint.log` |
| `npm run typecheck` | Prisma/Next types/TypeScript clean | PASS / 0; `typecheck.log` |
| `npm test` | **1714/1714**, no skips | PASS / 0; `test.log` |
| `npm run build` | Fresh root production build above, TypeScript included | PASS / 0; `build.log` |
| `npm run test:owned-text` | **532 checks**, both kinds through actual registry/socket, all models larger, full-source ACK/fidelity, two turns/Stop, genuine no-media text, retained answer/context recovery, auth/expiry/replacement, teardown; external attempts 0 | PASS / 0; `owned-text/integrated-results.json`, server logs and 1440/390px PNGs |
| `npm run test:owned-voice` | **125 units + 392 built checks**, existing voice issuance/settings/manifest barriers and cleanup; external attempts 0 | PASS / 0; `test:owned-voice.log`; original new `artifacts/local/02d/` evidence copied to `03m/owned-voice/` |
| `node --conditions=react-server artifacts/local/03m/audit.mjs`; `git diff --check` | Arrival/voice/manifest/private config/prior evidence preservation, trace exclusion, changed-file hashes, no whitespace errors | PASS / 0; `preservation.json`, `changed-files.sha256.json`, `diff-check.log` |
| Live provider/PDF app/real DB/hosted/physical devices/audio | Separate PM gates; no spending authorized | NOT_RUN |

One initial test-edit helper exited 1 on Windows default text decoding, before mutating files; rerun with UTF-8 succeeded. The first full unit run exited 1 (1712/1714): two old text assertions in the voice test file expected the old revision/Mini argument. Those assertions were corrected; the final full run, lint/typecheck and build pass. This did not change voice implementation. Initial focused run passed 541 checks before removal of two duplicate registry tests; final focused count is 539. Exact run sequence and exits remain in `commands.jsonl`; `test.log` holds the final full result.

The new voice harness evidence directory was created during this task (07:24:59 UTC); historical pre-cleanup evidence remains in its archive. Browser screenshot `owned-text/youtube-390.png` was visually inspected: the stopped session retains both completed synthetic answers and literal inert source-like text without clipping. This is viewport emulation, not a phone/audio pass.

## Acceptance and remaining gates

| Task criterion | Evidence |
|---|---|
| Unset/default and obsolete knobs cannot retain Mini, both kinds | Built `flow`, `obsolete-mini` (true/1000000) and `obsolete-invalid` (invalid/invalid) groups each run PDF/YouTube; exact larger socket URL asserted at fake constructor; every recorded model larger |
| Immutable model/policy/cap through provenance, ACK and response | Frozen allowlisted default and registry identity check; focused preparation/provenance, two-turn lifecycle, exact session/response cap tests; prior v1/v2 policy projections rejected |
| Larger unavailable / mismatched ACK / context limit | Both kinds fail with one larger connection attempt, no Mini connection/retry; recoverable context error and source retention; old/incorrect caps fail ACK barriers |
| Foreign/expired/replaced source and Stop | Retained source-race tests plus built denials/cleanup/recovery; no stale readiness, socket/listener/session leaks or microphone calls |
| Voice unchanged | Exact voice declaration equality to HEAD; manifest encoder and voice runtime hashes unchanged from arrival; full voice units and built issuance checks pass |
| Safe routing retirement | No production routing/estimator imports or env reads; diagnostic estimator retained outside src; package/lock unchanged; prior fixture/evidence hashes preserved |
| User delivery decision respected | No prompt changes, semantic retry or recalibration; historical PDF exception FAIL explicitly retained as accepted known limitation |

Larger text costs more than Mini. This choice does not prove that it is the best model across APIs or that its answers are universally accurate. The 03K larger PDF summary PASS and 03L larger video summary/detail PASS remain historical sampled results. **03L larger PDF detail remains FAIL** for omitting the own-ball spotting exception; user accepted that limitation for delivery, so 03M neither fixes nor retries it. Mini failures remain FAIL. No cutoff is calibrated or required for this chosen default.

PM next reviews this migration and separately assigns remaining actual-app/release verification. In a newly authorized configured app check: import/upload one source; inspect complete beginning/middle/end preview; start text; confirm exact larger/2048/minimal/text/truncation ACKs in controlled evidence; ask a summary and follow-up; verify completed visible text, Stop retention, owned Remove/Confirm deletion and useful failure/retry. Live PDF app checks from 03L remain NOT_RUN. New spending, deployment, physical-device/audio, hosted caption activation and SQL cleanup require their own PM scope. Public voice-enabled / YouTube-disabled policy and prior closed allocations are unchanged.

**Handoff: READY_FOR_REVIEW. Stop; no later task advanced or plan completion claimed.**
