# Task12E — first-use polish

**READY_FOR_REVIEW — one P2 visual finding remains open.** Worker implementation and the prescribed inspection/correction/confirmation cycle are complete. This is a handoff to the PM, not acceptance or a release recommendation. The final reviewer confirmed the original fixes but found first-start pending/failure text clipping. See F05 below before accepting.

Original Steps05/12 remain unchanged. Work extends the accepted12D dirty workspace on main, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`. No commit, deployment, real database mutation, paid/provider request, runtime/dependency migration, model/limit/prompt change or later-step work was performed.

## Findings → changes → verification

| ID | Finding and change | Verification / disposition |
| --- | --- | --- |
| F01 | Empty source entry had weak hierarchy. Added “Bring a source. Start a chat.”, an availability-aware sentence, distinct PDF/YouTube groups with real controls, a prominent PDF action and responsive two-column/stacked composition. | Before/confirmation screenshots in both themes at390/768/1440. Public captioned URL wording,25MB/text-PDF/no-OCR limits and honest disabled alternatives remain. Implemented. |
| F02 | Initial text start was separated from its invitation beside an inactive composer. Added a centered invitation and a single56px “Start chat”; hidden first-use composer becomes visible after readiness. | Button centered and within first viewport at all three normal widths. Double Enter produces one start. Initial/connecting composer hidden. Explicit readiness focuses the question. Later failure/restart retains draft and received transcript without the first-use hero. Implemented. |
| F03 | Import/removal transition lacked a useful focus destination. Source heading is the page h1 and receives focus on committed source identity change/removal, after replacement closes. | Successful import/replacement/removal heading focus; failed replacement retains old conversation; Escape returns to Source actions; theme changes preserve controller counters and transcript. Implemented. |
| F04 | First inspection found inaccurate initial-failure copy about nonexistent drafts/messages, oversized import headings from an old CSS rule, and awkward enlarged-text headline wrapping. | One grouped correction supplied state-specific setup failure/stopped copy, removed the legacy26px heading override, clarified selectable-text PDF copy, shortened headline and retained a hidden mounted composer. Fresh reviewer scored original issues resolved; hierarchy5/5 and state accuracy5/5. |
| F05 — P2 OPEN | Final confirmation exposes vertically clipped first-start pending/failure status. `.text-start .text-session-status` intends unrestricted height, but the later equal-specificity `.has-source .text-session-status` applies `max-height:25%; overflow:auto`. | Visible in `text-connecting-dark-390.png`, `text-start-failed-dark-390.png` and `text-start-failed-light-768.png`. Functional assertions pass but do not detect this vertical clipping. Reviewer responsive-finish3/5; confirmation blocked for visual acceptance. Proposed bounded follow-up: make the first-start status reset win the cascade and confirm those states. No further UI edit made, as the brief explicitly requires reporting unresolved issues after the one confirmation. |
| F06 | Voice idle repeated “No answer yet”. | Only the idle media announcement is hidden; centered idle Start voice shares56px sizing. Existing active transcript, dock, controls and meaningful warnings remain.208voice UI and156mode-switch checks pass with synthetic boundaries; actual phone/audio remains unverified. |

## Applied skills and scope

- Read the local Impeccable and design-taste-frontend SKILL.md files, Taste `references/app-screens.md`, and project/worker instructions before implementation. Impeccable context ran once for `src/app/page.tsx` with exit0; its context was reconciled with the incumbent UI and current task. Stale scaffold statements in PRODUCT.md were not treated as authority for changing working behavior or migrated unasked.
- Impeccable `new-work.md` was applied as an ordinary extension in Operate mode. `onboard.md` informed the source-to-first-question flow; `clarify.md` informed honest availability and first-start messages; `adapt.md`, `polish.md` and `harden.md` informed mobile flow, focus, pending/error and retained-work states. `craft-floor.md` was read immediately before UI edits. The existing design hook ran on UI edits; no separate duplicate detector was run.
- Taste supplied composition, hierarchy and rendered critique. The user-pinned ElevenLabs-inspired rounded controls, blue/violet gradients and moon/sun toggle override generic bans. No random direction draw, photography, new marketing section, registry component or dependency was introduced. Segoe UI and existing theme tokens remain.
- Read the local React Best Practices guidance for derived state and interaction handlers, local Playwright workflow, and current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). No App Router/framework API change required new routing architecture.
- One initial rendered inspection and one grouped correction were followed by one confirmation. Before captures were an incumbent baseline. The independent `impeccable_finish_reviewer` reviewed the baseline/inspection and then scored the correction against the final evidence. Its remaining P2 is preserved, not called a pass. The skill-requested `impeccable_documenter` checked code, confirmation metadata and six relevant full-size captures, then updated only DESIGN.md while preserving historical paragraphs. No design-sidecar or product-context migration.

Taste inspection with the final explicit allowances `gradient,button-fx,emoji` exits0: **0FAIL,2WARN**. Warnings are the deliberate38px welcome heading (28px on phones) and inherited12px footer edge. The first inspector invocation used incorrect allowance names (`gradients,palette`) and exited1 with3FAIL/2WARN; retained as diagnostic history. Taste source lint exits1 for the existing mandated gradient and7warnings for established shadows and actual timestamp padding. Those are explicit brief exceptions, not suppressed build/lint failures. Ordinary ESLint exits0.

Rendered critique: welcome composition and real choices are clearer; tablet/mobile stacking and the initial centered action are coherent with the established app. This is a restrained functional extension, not a new visual identity. Design7/10, usability6/10 because F05 clips actionable copy, creativity6/10 for an established pattern, content8/10; weighted6.6/10. Marketing-image/motion prescriptions do not apply to this pinned Operate surface. These subjective scores do not replace the open finding or PM acceptance.

## Screenshot evidence

All new evidence lives under ignored `artifacts/local/12e/`. Before:18original PNGs across both themes and three widths. Inspection and confirmation:114original PNGs each (19states ×6theme/width combinations), plus19contact sheets each. The two reflow states in each width-labelled run actually use320×600 with200% root font size; the suffix identifies the parent run, not a different reflow width. Full-page captures include natural page flow below the viewport where needed.

| State | Before | Confirmation |
| --- | --- | --- |
| PDF available / YouTube disabled, light desktop | [Before](../artifacts/local/12e/before/entry-unavailable-light-1440.png) | [After](../artifacts/local/12e/confirmation/entry-unavailable-light-1440.png) |
| Both import methods available, dark phone — fixture only | [Before](../artifacts/local/12e/before/entry-available-dark-390.png) | [After](../artifacts/local/12e/confirmation/entry-available-dark-390.png) |
| Loaded initial text, dark phone | [Before](../artifacts/local/12e/before/text-idle-dark-390.png) | [After](../artifacts/local/12e/confirmation/text-idle-dark-390.png) |
| Both import methods disabled | — | [All widths/themes](../artifacts/local/12e/confirmation/sheet-02.png) |
| Invalid URL, loading, cancel and error | — | [Invalid](../artifacts/local/12e/confirmation/sheet-17.png) · [Loading](../artifacts/local/12e/confirmation/sheet-06.png) · [Cancel](../artifacts/local/12e/confirmation/sheet-04.png) · [Error](../artifacts/local/12e/confirmation/sheet-05.png) |
| Text start pending / failed — F05 open | — | [Pending](../artifacts/local/12e/confirmation/text-connecting-dark-390.png) · [Failed](../artifacts/local/12e/confirmation/text-start-failed-dark-390.png) |
| Active text / later restart | — | [Active](../artifacts/local/12e/confirmation/sheet-12.png) · [Retained work](../artifacts/local/12e/confirmation/sheet-15.png) |
| Active voice preserved | — | [All widths/themes](../artifacts/local/12e/confirmation/sheet-18.png) |
| Replacement failure / success / removal | — | [Failure](../artifacts/local/12e/confirmation/sheet-11.png) · [Success](../artifacts/local/12e/confirmation/sheet-10.png) · [Removal](../artifacts/local/12e/confirmation/sheet-09.png) |
|320px/200% source entry / initial text | — | [Entry](../artifacts/local/12e/confirmation/reflow-entry-dark-390.png) · [Text](../artifacts/local/12e/confirmation/reflow-text-dark-390.png) |

Primary inspected the three baseline contact sheets and all19sheets in each rendered batch, with critical full-size captures; the final six Taste JPGs were opened as well. Screenshot contents match their named states. Synthetic fixture text is testing evidence only and is not a sample answer in the shipped product.

## Verification and build identity

Pinned Node **24.22.0**, npm **11.19.1**. Starting accepted build `Fdy7lYcApHEaHLwDaPG_a`. Final production build **`MjvI85J5WVXbfrEnWKCkx`**. The final build was produced after the grouped product correction; no product code changed after confirmation. Later changes adjust regression assertions and documentation only.

`scripts/verify-ui-12e.mjs` compiles the actual SourceWorkspace/TextSession/VoiceSession UI with separately bundled test-only adapters. Browser `/api/sources` responses are mocked; all external requests, native WebSocket/RTC/Audio and microphone calls are denied/count-checked. The fixture reads existing deterministic10C inputs without altering them. No fixture route, flag or loader is added to Next. Confirmed final bundle SHA256 `f89ec1cc5ca38381f0e6ca4e210821938067ee7d71eb1fd07e4d654be0f2b4db`; CSS SHA256 `e9e4a7b6178aa353938aa57f68dce39280eb9e55b65622e4e92ffc0adffff773`.

The baseline/inspection metadata names the preceding build, while their separately compiled bundle/CSS hashes identify those exact captures. Final confirmation metadata names the final build and matches current product sources. Production regressions also run default-disabled actual Next instances and check fixture exclusion. Smoke runs the final production build on3100. This distinction matters: successful enabled import/start/answer states are synthetic UI/controller evidence, not live provider or deployed success.

| Check | Final result | Evidence |
| --- | --- | --- |
| ESLint / typecheck / production build | PASS, exit0 | `lint-final.log`, `typecheck-final.log`, `build.log` |
| Focused text lifecycle/controller, voice lifecycle/interruption, transcript, session assessment |292passed, exit0 | `lifecycle.log`; external network guard loaded |
| Source UI |87passed, exit0 | `source-ui.log` |
| YouTube UI |99passed, exit0 | `youtube-ui.log` |
| Text UI |108passed, exit0 | `text-ui-corrected.log` |
| Voice UI |208passed, exit0 | `voice-ui.log` |
| Mode switching |156passed, exit0 | `mode-ui-corrected.log` |
| Transcript view |44passed, exit0 | `transcript-ui-final.log` |
| Production smoke |18passed, exit0 | `smoke.log` |
|12E confirmation |6complete viewport/theme scenarios, exit0 | `confirmation/results.json`;114PNG |
| Taste final inspector |0FAIL/2WARN, exit0 | `taste-confirmation/report.json` and log |

Focused browser total:720checks, in addition to292unit/lifecycle checks and the12Escenario assertions. The first text run had16failures from old initial-refusal/stopped copy; mode run had4from the old refusal copy. After assertion updates both pass. Initial transcript run had4old-heading failures; a second had4from the accessible-space difference at `<br>`; final exact accessible heading passes. Failed text/mode artifacts were copied before rerun. Transcript first-attempt log remains, but an attempted backup used nonexistent09c (exit1), so that attempt's browser files were reused; second-attempt09b files were successfully preserved. Prior12D and older evidence was not overwritten. No product change was made to force these tests to pass.

Verified keyboard Enter/de-duplication, successful source focus, explicit readiness focus, Escape return, URL draft retention, cancel/retry, source replacement/removal, reduced-motion browser context,320px/200% root-text horizontal reflow, transcript/draft retention, theme stability and zero automatic native/provider calls. Measured normal-text/token contrast: light minimum6.13:1, dark minimum8.16:1 across body/muted/warning and both gradient endpoints. These are selected token-pair calculations, not an exhaustive accessibility certification. The safe-focus guard when the user moves elsewhere while connecting was code-reviewed; this dedicated branch is not separately asserted by the12E harness. Actual virtual keyboard, screen-reader announcements, browser zoom and device audio remain unverified.

## Exact commands and exits

Every logged check uses the wrapper below. It places the pinned runtime first on PATH, invokes its bundled npm, creates a distinct log, and records executable/argv/exit/UTC timestamp in [commands.jsonl](../artifacts/local/12e/commands.jsonl). The wrapper sets only a local evidence-directory override; suite scripts retain their synthetic/no-provider boundaries. Table paths are repository-relative; `npm` means `.tools/node-v24.22.0-win-x64/node_modules/npm/bin/npm-cli.js` executed by the pinned node.

```powershell
.tools/node-v24.22.0-win-x64/node.exe artifacts/local/12e/run.mjs <log-name> <node|npm> <arguments>
```

| UTC completion | Wrapper arguments | Exit |
| --- | --- | --- |
| 2026-10-22T23:17:25.269Z | `before node scripts/verify-ui-12e.mjs before` | 0 |
| 2026-10-22T23:19:10.814Z | `inspection node scripts/verify-ui-12e.mjs inspection` | 0 |
| 2026-10-22T23:20:21.654Z | `taste-inspection node .agents/skills/design-taste-frontend/scripts/inspect.mjs artifacts/local/12e/inspection/index.html --app --allow gradients,palette --out artifacts/local/12e/taste-inspection` | 1 |
| 2026-10-22T23:21:32.193Z | `lint npm run lint` | 0 |
| 2026-10-22T23:21:45.212Z | `typecheck npm run typecheck` | 0 |
| 2026-10-22T23:22:00.317Z | `lifecycle node --require ./tests/transcript-view/no-provider.cjs --conditions=react-server --test tests/unit/text-lifecycle.test.ts tests/unit/text-http-controller.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/voice-interruption.test.ts tests/unit/transcript.test.ts tests/unit/session-assessment.test.ts` | 0 |
| 2026-10-22T23:22:50.268Z | `taste-lint node .agents/skills/design-taste-frontend/scripts/lint.mjs --app src/app/source-workspace.tsx src/app/text-session.tsx src/app/voice-session.tsx src/app/page.tsx src/app/globals.css` | 1 |
| 2026-10-22T23:23:25.378Z | `build npm run build` | 0 |
| 2026-10-22T23:24:05.485Z | `confirmation node scripts/verify-ui-12e.mjs confirmation` | 0 |
| 2026-10-22T23:24:17.460Z | `text-ui npm run test:text-session` | 1 |
| 2026-10-22T23:24:53.878Z | `taste-confirmation node .agents/skills/design-taste-frontend/scripts/inspect.mjs artifacts/local/12e/confirmation/index.html --app --allow gradient,button-fx,emoji --out artifacts/local/12e/taste-confirmation` | 0 |
| 2026-10-22T23:25:22.314Z | `source-ui npm run test:source-ui` | 0 |
| 2026-10-22T23:25:50.684Z | `voice-ui npm run test:voice-session` | 0 |
| 2026-10-22T23:25:58.049Z | `mode-ui npm run test:mode-switch` | 1 |
| 2026-10-22T23:28:27.033Z | `transcript-ui npm run test:transcript-view` | 1 |
| 2026-10-22T23:28:40.066Z | `text-ui-corrected npm run test:text-session` | 0 |
| 2026-10-22T23:28:58.207Z | `youtube-ui npm run test:youtube-ui` | 0 |
| 2026-10-22T23:29:16.609Z | `typecheck-final npm run typecheck` | 0 |
| 2026-10-22T23:29:23.154Z | `lint-final npm run lint` | 0 |
| 2026-10-22T23:29:24.931Z | `smoke npm run test:smoke -- --output artifacts/local/12e/smoke` | 0 |
| 2026-10-22T23:29:27.245Z | `mode-ui-corrected npm run test:mode-switch` | 0 |
| 2026-10-22T23:29:33.488Z | `transcript-ui-corrected npm run test:transcript-view` | 1 |
| 2026-10-22T23:29:59.640Z | `transcript-ui-final npm run test:transcript-view` | 0 |

Supporting actions: `.agents/skills/impeccable/scripts/impeccable.cmd context --target src/app/page.tsx` exit0 (conversation record); pinned `node artifacts/local/12e/contact-sheets.mjs before|inspection|confirmation` exit0; inspection-image openings are read-only. Regression evidence path/assertion update scripts exit0. `Copy-Item` text/mode backups exit0; erroneous09c backup exit1 and successful09b-second-attempt backup exit0, as described above. The documenter ran `git diff --check -- DESIGN.md` exit0. No `npm ci` or browser download was necessary; installed dependencies/browser were used.

## Changed files, hashes and remaining work

Product changes are limited to `src/app/source-workspace.tsx`, `text-session.tsx`, `voice-session.tsx`, `page.tsx` and `globals.css`. New verification is `scripts/verify-ui-12e.mjs` and `tests/ui-12e/harness.tsx`. Existing six UI verifier/config groups and their selected test/preparation files were redirected from12D to12E evidence paths; assertions now recognize the first-use labels, hidden composer and absent empty-transcript listener. Three unit-test files only change evidence paths. Smoke expectations match the new h1/availability copy. DESIGN.md, PROJECT_STATE.md and TESTING.md are updated without rewriting old evidence.

[FIRST_USE_POLISH_12E_HASHES.json](FIRST_USE_POLISH_12E_HASHES.json) records exact SHA256s for this task's changed files and evidence, excluding the manifest itself. The scoped pre-task originals are retained in `artifacts/local/12e/before/` and `prior-files/`; `scoped-diff.patch` compares those originals to this task's result, because a HEAD diff also includes accepted earlier dirty work. Unrelated pre-existing modifications/deletions/untracked files remain intact.

PM decision required: review F05, then assign a bounded correction or explicitly accept its residual. Task12E is not declared accepted. Hosted YouTube remains disabled; enabled YouTube evidence is synthetic. Deployment, live caption/source-grounded conversation and physical phone/audio checks are not performed by this task. No claim of browser emulation proving real-device behavior. No later implementation task was started.
