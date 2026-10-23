# Task 12B — conversation redesign

Status: **READY_FOR_REVIEW** (worker handoff; PM acceptance pending). 22 October 2026, Toronto.

## Result and scope

Implemented the revised `WORKER_TASK_12B.md` and `references/UI_DIRECTION_12B.md`: one concise import surface, compact active-source header, full-width readable conversation, bottom text composer and grouped voice controls. Preview is a native modal side sheet on desktop and near-full-width drawer on phones. Replace/source metadata are disclosures. The visible source inspection label is shortened while its accessible name remains explicit. Mode-clear warnings, actionable failures, incomplete/interrupted text, independent microphone/playback state and recovery remain available.

Taste's pinned app-screen guidance replaced Impeccable as requested; Awesome Design's pinned ElevenLabs analysis supplied reference context. Layout was authored in the existing components/CSS; no kit source, fonts or new dependencies were installed. Native dialog provides modality and inert background; explicit Tab endpoint wrapping, Escape, initial heading focus and trigger restoration are covered in browser tests. The focused Web Interface Guidelines review checked labels, focus, wrapping, literal content, reduced motion, touch size and recovery. No blanket accessibility certification is claimed.

Existing session controller methods, media lifecycle, server/security/expiry/normalization/models/prompts and public feature flags were not changed. Existing uncommitted 03G/03M/08P work remains in place. In particular, citation-removal changes already present in `transcript-view.tsx` are not new 12B work. Original Step 01–14 IDs and prior handoffs are preserved.

## Build identity

Final production build **`EvAHrnkNgv2i8jB43_Tgh`**. Full layout verification build **`6yveCcmRLNIs6zOAnNf1c`** differs only in the visible inspection-button word (Preview → Inspect), changed so the visible label is contained in its accessible name. Baseline screenshots use accepted build `9plm_yr0fscZi-VDwACfo`. Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, dirty working tree with earlier accepted work plus this task. No commit, push or deployment. Node **24.22.0**, npm **11.19.1**, existing lockfile unchanged by this task.

## Changed files

- Presentation: `src/app/{page,source-workspace,conversation-area,text-session,voice-session,transcript-view}.tsx`, `src/app/globals.css`.
- Verification: `tests/{smoke/shell,source-ui/source,youtube-ui/youtube,transcript-view/transcript,text-session/text-session,voice-session/voice-session,mode-switch/mode-switch}.spec.ts`, `scripts/verify-owned-text.mjs`, `scripts/verify-voice-adapter.mjs`.
- Decisions/handoff: `DESIGN.md`, this report, `docs/PROJECT_STATE.md`, `docs/TESTING.md`.

Assertions were adapted for the deliberate import-first empty screen and replacement disclosure; lifecycle, network denial, disabled states, source fidelity, teardown and safe rendering assertions remain. A new browser case exercises long filenames, 320/390/1440px layouts at 200% text size, drawer Tab wrapping, Escape, focus restoration and reachable removal confirmation. There are no CSS-mirroring unit tests.

## Verification and acceptance mapping

Final command results are appended below. Exact commands, UTC timestamps and exit statuses are in `artifacts/local/12b/commands.jsonl`; logs are named by script. The runner uses the pinned Node executable and its bundled npm CLI with the pinned directory first in PATH. Before-change `npm run test:owned-text` used `OWNED_TEXT_EVIDENCE_DIRECTORY=artifacts/local/12b/before` and passed 532 checks. Final equivalent output goes to `artifacts/local/12b/after`.

All verification is **local**, with synthetic repository/storage/upstream/provider/media boundaries and external traffic denied by the existing test harnesses. Source UI integration uses the actual PDF parser on authored PDFs. This is not PostgreSQL, live captions, paid model or physical audio evidence.

| Requirement | Evidence |
|---|---|
| Clear source → conversation hierarchy | Before/after desktop and 390px screenshots; source title/actions remain visible, routine source success announcements recede, selected mode is explicit |
| Preserve source lifecycle | PDF/YouTube suites exercise upload, errors, cancellation, cross-kind replacement, retry/read, confirmation and removal, including actual 384-line parser output |
| Preserve text/voice behavior | Owned text/native voice adapter and isolated text/voice/mode-switch suites retain ACK barriers, draft receipt, Stop, mute, interruption, playback recovery and resource teardown |
| Readable and safe transcript | Transcript suite verifies Unicode/long strings, literal script-like text, partial/final/failure notices, stable nodes, reading anchors, Jump to latest and no token focus theft |
| Responsive accessible preview | Native modal, own scroll area, first/final page reachability, 48px controls, visible focus, Tab wrapping/Escape/return; long title at 320px/200% text |
| Mobile/zoom/keyboard | Chromium viewport checks at 320/360/390/768/1440 as applicable; 200% root text/CSS zoom and reduced motion in existing suites; no physical-device claim |

## Visual evidence

Before: `artifacts/local/12b/before/{pdf,youtube}-{390,1440}.png`, matching `*-stopped-preview.png`, and `context-recovery-390.png`.

After: `artifacts/local/12b/after/{pdf,youtube}-{390,1440}.png` and `*-stopped-preview.png`. Task-specific source images include `artifacts/local/12b/desktop-entry.png` and `desktop-320-zoom-drawer.png`. Final voice/actionable microphone-denial images are copied into `artifacts/local/12b/voice/`. Screenshots were opened and visually inspected, including desktop/390px transcript, source drawer and denial recovery. Screenshot capture returns the page to its top so the sticky transcript navigation does not obscure an answer in full-page evidence.

## Repairs and evidence limitations

The initial implementation left a duplicate text transcript during composer relocation; integration checks detected it and it was removed. Initial lint caught an effect-cleanup ref warning, fixed by capturing the trigger. Earlier harness assertions expected visible conversation controls before import or used replacement buttons without opening the new disclosure; these were updated to the intended UI. PDF suites initially lacked archived fixtures/manifest; only their three authored PDFs and manifest were copied back from the documented local archive. A new focus test found that native dialog alone let Tab leave the document for browser chrome; explicit endpoint wrapping now passes. The old failing text-session subprocess tree was stopped after diagnosis, and its harness tore down the server; final runs are separate.

Failed intermediate runs remain recorded in `commands.jsonl`, `first-checks.json`, `first-run/` and `second-run/`; subsequent focused results supersede them, not historical project accuracy failures. Existing diagnostic output directories were backed up where present to `artifacts/local/12b/preserved/` before reuse. No real source was imported or deleted.

## Remaining gates / PM handoff

Physical iOS Safari/Android Chrome microphone, audible playback, interruption, on-screen keyboard and device preview scrolling are **NOT_RUN** here. The larger-default live voice check, hosted YouTube restriction, prior accepted accuracy limitation and remaining recovery/storage/security/release gates are unchanged. No full unit suite rerun was required for these presentation changes; the voice adapter command includes its focused 113-unit suite. No deployment or paid calls occurred.

For device review, use a PM-approved build/source: import → inspect/close → start text → send/follow up → Stop → switch to voice after reading the clear warning → Start/mute/interrupt/playback recovery → Stop → remove/keep/confirm. Check the software keyboard and long source scrolling on the actual device. Report actual OS/browser/audio results separately. Stop at **READY_FOR_REVIEW**; PM decides acceptance and sequencing.

## Verification results

| Command | Result / exit | Build / scope |
|---|---|---|
| npm run lint | PASS / 0 | Final sources |
| npm run typecheck | PASS / 0 | Final sources |
| npm run build | PASS / 0 | EvAHrnkNgv2i8jB43_Tgh |
| npm run test:smoke | 18 PASS / 0 | Final build |
| npm run test:transcript-view | 40 PASS / 0 | 6yveCcmRLNIs6zOAnNf1c + unchanged isolated transcript component |
| npm run test:source-ui | 78 PASS / 0 | Final build; 75 prior checks + 3 drawer/zoom cases |
| npm run test:youtube-ui | 99 PASS / 0 | 6yveCcmRLNIs6zOAnNf1c; same final behavior and accessible inspection name |
| npm run test:voice-adapter | 113 units + 571 integrated checks, 48 scenarios PASS / 0 | Final build; synthetic media/provider/storage, zero forbidden network |
| npm run test:owned-text | 532 PASS / 0 | Final build; synthetic storage/provider, no media |
| npm run test:text-session | 108 PASS / 0 | 6yveCcmRLNIs6zOAnNf1c + unchanged isolated text component |
| npm run test:voice-session | 208 PASS / 0 | 6yveCcmRLNIs6zOAnNf1c + unchanged isolated voice component |
| npm run test:mode-switch | 156 PASS / 0 | 6yveCcmRLNIs6zOAnNf1c + unchanged isolated conversation components |

Final source/owned-text/native-adapter runs also regenerate final-build images. No unchanged full-suite rerun was needed after the final visible-label correction. Changed-file SHA-256 values are in the companion docs/UI_POLISH_12B_HASHES.json (working-tree artifact, not a Git commit); raw evidence remains ignored under artifacts/local/12b/. Hashes cover this task's complete delivered files, which may also contain accepted earlier changes.

`git diff --check`: PASS / exit 0 (line-ending notices only). Task server ports were all released; see `artifacts/local/12b/ports.json`. Final modal screenshots use viewport capture so a fixed-height dialog is not misleadingly composited over a full-page image.
