# Task11D — preview and verification recovery

**PM decision —22October2026:** ACCEPTED for this offline harness scope. Six delivery hashes matched; screenshots/code/reports reviewed; fresh pinned negative run reproduced expected exit1 on DELETE503 with complete resource teardown, zero external attempts and240 unchanged product inputs. Worker originals preserved under `artifacts/local/11d/worker-evidence/`; PM log `artifacts/local/11d/pm-negative.log`. No product rendering fix needed on this evidence.03H semantic and historical real-source cleanup failures remain open; no live rerun or deployment authorized. Worker handoff below retained as submitted.

**Outcome:** implemented; proposed **READY_FOR_REVIEW** for the assigned offline harness scope. PM retains acceptance authority. No product rendering change was warranted. Stop here; no live rerun, deployment, model/prompt work or next task.

## Identity and scope

Local Windows/Chromium, Node **24.22.0**, npm **11.19.1**. Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, dirty arrival/delivery; prior03G/PM work preserved. Reused verified root production build **`qJ3KjvekCsaZp_8_oCpqt`** with all **240**03H baseline product inputs matching. No fresh build needed for harness-only changes. Task runtime copies `.next` and explicit public inputs to `artifacts/local/11d/runtime`, with a dependency junction and **no private .env copy**.

Actual built app, source GET/DELETE handlers, ownership checks, text HTTP routes, lifecycle and transcript components use established synthetic Prisma and fake WebSocket boundaries. Acquisition alone is fulfilled with authored metadata. Each fixture has a fresh in-memory anonymous owner. Server network-denial preload/browser routing report **0 external attempts**. No real YouTube import, paid generation, PostgreSQL write, persisted visitor credentials, phone/audio check or deployment. Synthetic answers establish harness behavior only.

## Changes

- `scripts/verify-source-preview.mjs`: isolated built-app runner, build/input parity, long Unicode preview/stream/Stop/removal cases, positive/negative modes, explicit failure exit, sanitized evidence and final teardown.
- `tests/source-preview/evidence.mjs`: reusable viewport capture, group Stop and actual **Remove → Confirm remove** helpers. Removal requires **DELETE200 and subsequent GET404**; failure rejects the case.
- `tests/source-preview/provider.mjs`: test-only extension of existing fake provider, injecting known terminal usage into answer1; answer2 leaves usage absent.
- This report and concise state/testing entries.

No CSS/component, source packing/admission, PDF/voice implementation, existing test preload, dependency or lockfile changed. Original03H harness/raw answers/scores/cleanup inventory remain intact.

## Rendering diagnosis

Authored fixture: **428 segments / 38,024 UTF-16 code units**, Albanian plus Arabic/Unicode, final marker `FINAL-428`. DOM text matches every segment before/after traversal. Segment count matches the larger03H source; this is not a replay of live captions.

The original one-shot `last().scrollIntoViewIfNeeded()` then immediate screenshot reproduces a **blank end capture at both widths**. With unchanged CSS and no further scrolling, a150ms settling observation produces readable ending text. Geometry was already nonzero: desktop y656.6875/height51.1875, settling y656.8125;390px y618.265625/height102.375, settling y618.765625. Thus nonzero geometry/DOM presence did not prove painted text. `checkVisibility({contentVisibilityAuto:true})` is true after settling.

Independent ordinary wheel traversal verifies beginning/middle/end targets are in the viewport and rendered **before** the capture helper. Screenshots show final Unicode text at1440px and390px. Reader close returns focus to Inspect extracted text; conversation controls remain usable. The helper brings the target into view, waits two animation frames, checks rendering and records geometry before screenshot.

**Conclusion:** reproduced screenshot timing gap associated with deferred rendering; no persistent normal-scroll product defect reproduced. Keep `content-visibility:auto` and intrinsic sizing. This bounded Chromium observation does not prove every browser/device path.

All screenshots below are under `artifacts/local/11d/`, with width1440 and390 variants:

| Evidence | Filename pattern |
|---|---|
| Original immediate capture, blank | `positive-{width}-before-end.png` |
| Same position after150ms, readable | `positive-{width}-settled-end.png` |
| Ordinary wheel beginning/middle/end | `positive-{width}-{begin,middle,end}.png` |
| Visible partial/completed answers; expanded terminal | `positive-{width}-answer-{0,1}-{stream,complete}.png` |
| Partial Stop and retention | `positive-{width}-{partial-before-stop,retained}.png` |

## Verification

All commands select `.tools/node-v24.22.0-win-x64` first on PATH. Exact final timestamps/exits are in `artifacts/local/11d/commands.jsonl`; all listed logs/reports are under11D. Local/synthetic evidence only.

| Check / exact command | Expected and observed | Exit | Evidence |
|---|---|---|---|
| `node --conditions=react-server scripts/verify-source-preview.mjs` | PASS two viewports; preview, terminal, Stop, removal, closure;04:52:24–04:52:53UTC |0| `positive-final.log`, `positive-report.json` |
| `node --conditions=react-server scripts/verify-source-preview.mjs --fail-delete` | Expected harness FAIL; DELETE503/GET200; full teardown;04:53:09–04:53:25UTC |1 expected| `negative.log`, `negative-report.json` |
| `npm run test:owned-text` in `.env`-free `artifacts/local/11d/runtime` | PASS441 existing source/PDF/text/recovery checks;04:53:43–04:54:05UTC |0| `owned-text.log`, runtime `artifacts/local/10d/` details |
| `npm run lint` | PASS, no errors/warnings |0| `lint.log` |
| `npm run typecheck` | PASS Prisma/Next generation and TypeScript |0| `typecheck.log` |
| `git diff --check` | PASS whitespace audit |0| `diff-check.log` |
| Product/history preservation and SHA256 manifest | PASS240 product inputs and original historical files unchanged |0| `preservation.json`, `changed-files.sha256.json` |
| Fresh build/live model/realDB/hosted/physical phone | NOT_RUN; outside harness-only scope, verified build reused |—| No live acceptance claim |

Development attempts retained: `positive-run-1.log` exit1 because repo has no `public` directory; optional copy corrected. `positive-run-2.log` exit1 because recopying Windows `.next` junctions attempted a self-copy; runtime now reuses its matching copied build. Neither started server/browser. `positive-run-3.log` exit0 established initial result; final run additionally checks settled capture and partial-answer Stop. Initial attempt timestamps were not separately logged. A documentation patch failed atomically on a heading mismatch, then was reapplied correctly. Default-shell discovery found Node26.5.0/npm12.0.1; all harness/check commands used pinned versions.

## Acceptance mapping

1. **Removal:** both positive groups use actual controls/handlers, DELETE200 then GET404; final synthetic sourceRows0. Negative injects DELETE503 only, then reads GET200 through real handler/synthetic repository. Whole harness fails; `removed` is never asserted.
2. **Stop sequencing:** each group stops immediately after three synthetic answers (two completed, one partial), before removal/next group. Real Stop200, retained text equality, active0/timers0/listeners0. Next group requires prior active0. Positive opens2/closes2; negative opens1/closes1. Registry sessions/attached/pending0. Bounded replay entries2/1 remain in memory until server exit; these are not active sessions.
3. **Preview:** segment parity plus observed screenshots, normal wheel beginning/middle/end, focus return and conversation. No performance feature removed on suspicion.
4. **Terminal/partial:** actual answer brought into view; completion details expanded with open state asserted. First completed answer shows injected output12/audio0/text12. Second shows unavailable usage; report records **unknown**, never zero/billing. Third answer is stopped midstream and stays visibly unfinished; no terminal metadata fabricated.
5. **Failure teardown:** both runs close context/browser/provider and release port3137 after server SIGTERM. Negative final snapshot has one intentionally undeleted **in-memory fixture** row, destroyed with the server. No administrative cleanup. Failure and closure evidence are recorded separately.
6. **Preservation:**240 prior product inputs unchanged, including PDF/voice/source policy. Existing441-check suite covers retained preview and PDF behavior. Historical03H files preserved, independently hashed.

## Remaining / handoff

03H semantics remain **FAIL / UNRESOLVED / four NOT_RUN**. Two real task sources remain unverified for removal/expiry after owner contexts were lost. `artifacts/local/03h-continuation/remaining-task-sources.json` and failed cleanup remain unchanged. New fixture success does not erase the historical failure. PM owns operational cleanup and sequencing.

No human testing is needed for this offline delivery. Physical phone/audio, provider semantics, hosted behavior and release gates remain open. Proposed **READY_FOR_REVIEW**, then stop.
