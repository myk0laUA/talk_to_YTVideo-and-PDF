# Task 12B correction — READY_FOR_REVIEW

Implemented; PM visual acceptance remains pending. Local build **Z_2-uMoAcfOuQhEor-fEH**, branch main, HEAD 1d30684b5e5d046197038273f67d2f29db93abf4, dirty working tree including preserved earlier work. Node **24.22.0**, npm **11.19.1**, Windows/Chromium. No commit, deployment, real database mutation, provider generation or paid call.

## Result and preservation

The loaded workspace gives the transcript a bounded scrolling region and reserves a separate bottom dock for the text composer/session controls or compact voice actions. Reading anchors now use the actual scroll container, while short viewports and enlarged text use natural page flow. A cleaned-up visualViewport/ResizeObserver listener responds to keyboard/viewport and text-size changes; streaming never invokes focus movement. Bottom padding includes the safe area.

Source name/type, Inspect and Source options form the header. Replace, Remove, routine Check source and metadata are inside the native disclosure; failed reads expose Retry text. Expanded maintenance reflows instead of covering Inspect. The YouTube URL draft survives source-form reparenting and expired-source recovery. Removal confirmation, native preview dialog, ownership and source controllers remain authoritative.

One session state remains visible. Routine transcript summaries, receipt mechanics and input-help text become accessible descriptions; actual input validation, incomplete/failed/interrupted answers, uncertainty, microphone denial and playback recovery remain visible. Voice shows Start or Stop according to state, Mute when applicable, Interrupt when available, and playback activation/recovery when needed. Mode-switch clearing is stated beside the action; restarting still clears conversation/draft. No answer content rewriting, fake audio activity, model/backend/transport change or dependency migration.

**Evidence-preservation gap:** the inherited source test hardcoded twelve root-level PNG paths under artifacts/local/12b/. Early runs refreshed those three entry and nine zoom/drawer images before this was discovered. Their original bytes were not backed up, so those paths must no longer be treated as original-build captures. The original before/, after/, voice/ evidence, original logs, UI_POLISH_12B.md and UI_POLISH_12B_HASHES.json remain retained. The test now writes only to 12b-correction for these captures. Exact affected names and timestamps are in legacy-capture-gap.json. This limitation is explicit for PM review; full original-PNG preservation is not claimed.

## Verification

All rows below ran on the final build above. Commands use the pinned executable through `.tools/node-v24.22.0-win-x64/node.exe artifacts/local/12b-correction/run.mjs <task>`; that runner executes the pinned npm CLI with the pinned runtime first on PATH. Exact start/end times, commands and exit codes are in commands.jsonl; task logs are adjacent. Boundaries are synthetic storage/providers/native media with external traffic denied. The source suites also exercise the real PDF parser against authored PDFs.

| Actual command | Result | Exit |
|---|---|---|
| npm run lint | PASS | 0 |
| npm run typecheck | PASS | 0 |
| npm run build | PASS | 0 |
| npm run test:source-ui | 78 PASS | 0 |
| npm run test:youtube-ui | 99 PASS | 0 |
| npm run test:owned-text | 532 PASS | 0 |
| npm run test:voice-adapter | 113 units + 571 integrated checks (48 scenarios) PASS | 0 |
| npm run test:transcript-view | 44 PASS | 0 |
| npm run test:text-session | 108 PASS | 0 |
| npm run test:voice-session | 208 PASS | 0 |
| npm run test:mode-switch | 156 PASS | 0 |
| node scripts/verify-ui-correction.mjs | Both viewport sizes; four static text exchanges, completed voice turn, error, long-scroll, focus/anchor, keyboard disclosure, short-height/200% reflow | 0 |

The viewport harness bundles the actual SourceWorkspace, conversation components and controllers in a separate loopback entry; only acquisition, provider/media/storage adapters are simulated. Static questions/answers use existing authored Alder station material from tests/context/fixtures.ts. They are not generated answers or live-provider proof. Both sizes assert eight text turns, dock reachability, no transcript/dock overlap, no horizontal overflow, stable reading position within one CSS pixel, explicit Jump focus and no token focus theft. Native API attempts, external attempts, browser errors and browser storage are zero in that harness. viewport-results.json records runtime, build and CSS/bundle hashes.

The transcript suite retains the original page-reflow checks and adds bounded-container late-text/final/new-turn/Jump/reset checks at all four projects. Hidden unavailable controls remain disabled and covered by lifecycle assertions; geometry checks now measure rendered controls. Pixel anchoring uses the documented one-pixel tolerance rather than rounding to half a pixel. Source tests exercise the disclosure before its nested controls; native adapter and owned-text replacement helpers do likewise.

## Viewport screenshots

All requested normal-state images are **actual viewport captures**, not full-page substitutes. Desktop 1440×900; mobile viewport 390×844. The additional reflow captures use 320×400 with 200% root text, not a physical keyboard/device.

| State | Desktop | Mobile |
|---|---|---|
| Ready text; four static exchanges | [text-1440.png](../artifacts/local/12b-correction/text-1440.png) | [text-390.png](../artifacts/local/12b-correction/text-390.png) |
| Ready voice; completed static turn | [voice-1440.png](../artifacts/local/12b-correction/voice-1440.png) | [voice-390.png](../artifacts/local/12b-correction/voice-390.png) |
| Actionable connection failure with retained text | [error-1440.png](../artifacts/local/12b-correction/error-1440.png) | [error-390.png](../artifacts/local/12b-correction/error-390.png) |
| Reading earlier content while updates arrive | [long-scroll-1440.png](../artifacts/local/12b-correction/long-scroll-1440.png) | [long-scroll-390.png](../artifacts/local/12b-correction/long-scroll-390.png) |
| Expanded source maintenance | [source-options-1440.png](../artifacts/local/12b-correction/source-options-1440.png) | [source-options-390.png](../artifacts/local/12b-correction/source-options-390.png) |

## Acceptance and gaps

1. Reachable interaction: non-overlapping dock and actual-container anchor/Jump/reset assertions pass, with normal and long-scroll viewport captures. Short-height/enlarged-text reflow passes. Physical keyboard/safe-area behavior remains NOT_RUN.
2. Compact source header: name/type and Inspect remain primary; the single disclosure contains routine maintenance. Source/YouTube suites preserve retry, expiry, confirmation, replacement, literal preview and focus behavior.
3. Reduced instruction clutter: routine prose recedes; validation, partial/failed/interrupted text and recovery remain covered by the retained behavior suites. No generated-text edits.
4. Compact voice dock: conditional actions preserve ACK barriers, mute, interruption, playback recovery, Stop and cleanup. The completed voice fixture retains conservative playback uncertainty; a fake adapter cannot establish heard audio.
5. Normal-state evidence: static source-based text/voice plus actionable-error and long-scroll captures exist at both required sizes; no live-proof claim. PM decides visual acceptance.

## Intermediate failures and recovery

Earlier logs are retained with .previous suffixes. Initial checks exposed hidden-button geometry/locator assumptions and a 0.58px anchor delta; these were adjusted to rendered controls and the explicit 1px invariant, with behavioral assertions retained. An early voice run overlapped a build replacement and is not used as final-build evidence. A temporary edit script had a quoting syntax error before mutation; corrected. A new harness lint warning was fixed.

The expanded source popup initially covered Inspect after replacement failure; changing it to a bounded in-flow disclosure fixed that. A long filename at 200% text then exposed workspace clipping; natural enlarged-text reflow and stacked narrow-screen actions fixed it. Unclipping also exposed header/device-description wrapping at 320px/200%, now corrected. Moving the import form initially lost the YouTube URL during expired-source recovery; controlled local draft state fixes that, without weakening the failing assertion. The owned-text harness initially failed to open the new parent disclosure; its user workflow is updated. The new viewport harness initially sampled before its final React paint; it now waits for each rendered exchange, ready state and actionable failure before capture. An explicit UTF-8 charset also corrected the isolated capture document. Superseded running checks were stopped by their own process trees; final checks complete normally and port release is recorded separately.

No physical iOS/Android microphone, speaker, interruption, real on-screen keyboard, live provider/DB, hosted YouTube or deployment acceptance is claimed. Existing semantic limitations and Steps 01–14 remain unchanged. Full unrelated unit-suite rerun is not part of this presentation correction. PM may review the screenshots and then perform the existing bounded physical-device gates; this worker starts no later task.

Changed-file SHA-256 values are in UI_POLISH_12B_CORRECTION_HASHES.json. They describe complete working-tree files, including pre-existing accepted changes. READY_FOR_REVIEW.
