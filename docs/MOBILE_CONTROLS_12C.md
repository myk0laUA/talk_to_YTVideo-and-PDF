# Task 12C — READY_FOR_REVIEW

22 October 2026, America/Toronto. Implemented for local review under original Steps 08/09/11/12. PM retains acceptance/sequencing ownership.

## Identity and scope

Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, with pre-existing dirty work preserved. Final production build **KIcqUmxyKpGojjnGbp6Xs**. Node **24.22.0**, npm **11.19.1**. No commit, deployment, paid call or real database operation. Dependencies/lockfile, models, caps, prompts and provider enablement policy unchanged by 12C.

Product edits: app CSS/layout/header/theme toggle, source workspace, transcript presentation, voice UI/native adapter, shared voice lifecycle and theme constants. Other edits are offline tests/fixtures/selectors/evidence destinations. Baseline-relative inventory: `artifacts/local/12c/changed-files.json`; delivery hashes: `MOBILE_CONTROLS_12C_HASHES.json`. The whole Git diff is not attributed to this task.

## Acceptance mapping

| Requirement | Result / evidence |
|---|---|
| Compact voice dock | End, circular labelled microphone/pressed state, independent speaker mute, contextual Interrupt. Routine device/ready/generated-speech prose visually hidden with accessible status retained. Collapsed Voice help holds diagnostics. Normal completion details omitted; failed/incomplete/interrupted/transcription warnings remain. 208 voice UI / 44 transcript cases. |
| Automatic playback | One intended-on attempt after source/settings ACK and microphone attachment. Adapter waits for actual remote binding. Existing 30-second media deadline bounds binding/play. Rejection/timeout exposes explicit Tap to enable sound; no automatic retry loop. Abort cancels pending binding/play and pauses pending native playback. Late results cannot revive stopped sessions. |
| Output mute | `speakerMuted` changes audio-element mute only. Track delivery/play resolution never reset it; microphone, response commands and transport are unchanged. Unmute does not replay audio or call play. New sessions reset the choice. 247 focused lifecycle/native/interruption tests and 579 built native checks cover pending/late track/play, deadlines, source/expiry/Stop cleanup and ACK barriers. |
| Mobile header | Wrapping source-name block and aligned action row at 390px; long names and 320px/200% text remain reachable. |
| Replacement | Dedicated native dialog with Back, PDF and YouTube choices, retained draft/errors and conditional Retry. Existing source transaction/retention stays authoritative. No routine Check source. Removal confirmation/focus return retained. 87 source / 99 YouTube cases. |
| Reader | Original pages, text, line breaks and caption precision/order retained. Larger line-height/page spacing; collapsed extraction notes; internal untrusted-content sentence omitted from display only. No storage mutation, invented hierarchy or HTML rendering. Integrated checks retain all 384 PDF lines. |
| Theme | Native keyboard switch, sliding sun/moon pill, system default and exact preference key `talk-to-document-theme-v1` with light/dark values only. Static pre-hydration initialization, system CSS fallback and caught storage errors. Active owners, acquisitions, transcript and microphone/speaker state survive toggles. |
| Component styling | Original CSS rounded tactile controls, circular state-driven microphone/ring, restrained gradient/glow actions in both themes. Shared tokens cover dialogs/errors/disabled/focus states. Reduced-motion fallback; no random waveform, analyser, idle loop or new dependency. |

Pinned Taste app-screen guidance remains the user's design authority, with supplied-component requirements overriding generic gradient advice. Relevant React storage/listener and focused Web Interface Guidelines guidance applied; local Next 16.4.2 client/script guides consulted. No external component code copied. Playback interpretation follows [MDN play()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play) and [autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay); automatic audible output is not guaranteed.

## Commands and verification

All runs local: synthetic provider/storage/media boundaries, no live calls. Integrated PDF tests use actual parser workers with synthetic storage. Runner: `.tools/node-v24.22.0-win-x64/node.exe artifacts/local/12c/run.mjs <log-name> npm <arguments>`; it invokes pinned npm and supplies pinned Node to children. Use `node` instead of `npm` for a direct script. Exact argv/timestamps/exits: `artifacts/local/12c/commands.jsonl`. Logs below are relative to that directory.

| Command | Result / exit | Log |
|---|---|---|
| `npm run lint` | PASS 0 | `lint-verified.log` |
| `npm run typecheck` | PASS 0 | `typecheck-verified.log` |
| `npm run build` | PASS 0, final build above | `build-final.log` |
| `npm test` | PASS 0, 1732 tests | `full-final.log` |
| `node --conditions=react-server --test tests/unit/voice-lifecycle.test.ts tests/unit/voice-browser-adapters.test.ts tests/unit/voice-interruption.test.ts` | PASS 0, 247 tests | `voice-units-final.log` |
| `npm run test:voice-adapter` | PASS 0, 118 units + 579 checks / 48 scenarios, final build | `native-final.log` |
| `npm run test:voice-session` | PASS 0, 208 cases | `voice-ui.log` |
| `npm run test:transcript-view` | PASS 0, 44 cases | `transcript.log` |
| `npm run test:text-session` | PASS 0, 108 cases | `text-ui.log` |
| `npm run test:mode-switch` | PASS 0, 156 cases | `mode-switch.log` |
| `npm run test:source-ui` | PASS 0, 87 cases, final build | `source-final.log` |
| `npm run test:youtube-ui` | PASS 0, 99 cases | `youtube-ui-2.log` |
| `npm run test:owned-text` | PASS 0, 532 checks, final build | `owned-text-final.log` |
| `node scripts/verify-ui-12c.mjs` | PASS 0, four theme/viewport combinations | `viewport-final-verified.log` |
| `git diff --check` | PASS 0 | `diff-check.log` |

Voice/text/transcript/mode UI suites use separately bundled actual components/controllers with synthetic boundaries. Their passes precede the final cosmetic Back-label/Jump-CSS changes. YouTube built suite used `Iq_kbGahXYD1o6eBk6nOw`; only those cosmetic changes followed. Final viewport/native/source/owned-text checks use the final identity. No physical/device result is inferred.

Viewport checks cover anchored dock/reading focus, no overflow, toggles without new owners/acquisitions or lost transcript/mute state, zero external/native API attempts, exact theme-only storage and 320×400/200% fallback. Main text contrast is 14.58:1 light / 13.94:1 dark; secondary 6.13 / 8.16; warnings 7.64 / 9.69; gradient endpoints at least 7.15 / 9.19. These token-pair checks are not comprehensive accessibility certification.

### Screenshots / component mapping

Under `artifacts/local/12c/viewport/`, for each `light`/`dark` and `390`/`1440`:

- `text-{theme}-{width}.png`: calm transcript, rounded composer/actions, sun/moon switch.
- `voice-{theme}-{width}.png`: circular ready microphone ring, End and independent speaker controls.
- `replacement-{theme}-{width}.png`: dedicated modal and gradient/glow PDF action.
- `preview-{theme}-{width}.png`: literal page/text structure and themed reader.
- `error-{theme}-{width}.png`, `long-scroll-{theme}-{width}.png`: recovery and anchored reading.
- `reflow-{theme}-{width}.png`, `preview-reflow-{theme}-{width}.png`, `replacement-reflow-{theme}-{width}.png`: 320×400 with 200% text. Suffix denotes the originating normal viewport, not another reflow width.

Actual captures were visually inspected during iteration. Large-text dialogs require vertical scrolling. Screenshot hashes and `viewport-results.json` identify final evidence.

## Mode-switch history feasibility — assessment only

**Visible retention is a bounded UI feature; provider conversational continuity is a separate change.** No history behavior was implemented.

`ConversationArea` conditionally mounts one owned mode component. Each owns its transcript/controller/session/draft state. Unmount detaches observers and disposes the controller. Voice disposal releases microphone/peer/playback and clears TranscriptStore. Text disposal stops its HTTP session/stream and clears the local projection; server registry closure releases source/transcript references too. Start resets to a fresh provider session and full source priming. Source replacement changes ownership.

Smallest honest retention: lift a bounded immutable presentation snapshot into a source-keyed conversation owner before disposal. Show it as a separate previous-session section with explicit “Earlier messages are for reference; the new session does not know them.” Preserve interrupted/unfinished/failure markers and session/mode boundaries; cap memory; reject late writes by source/session generation; clear on source replacement/removal/expiry/reload. Draft retention requires an explicit decision and must never auto-send. Keep only one live transport. No browser or server persistence is needed.

A shared transcript does not give the new model context. Keeping both transports mounted would violate resource expectations and still not merge provider sessions. True continuity requires a reviewed replay contract: canonical completed-turn selection/order; estimated user speech and unheard/interrupted/failed output handling; history/context accounting alongside the complete source; source/model/session binding and ACK-before-input; cancellation/idempotency and duplicate-response/audio prevention. Verify provider-supported roles/session semantics before implementation. Replay must not silently treat estimated speech or unheard output as confirmed conversational history.

**Recommendation:** separately assign presentation-only retention if the goal is continued reading. If the expectation is “continue the same conversation,” assign replay design/verification first. This is not just state lifting. Keep the current truthful clears-chat warning until that behavior is reviewed. Assessment stayed within current component/controller/store/registry ownership and existing mode tests; no replay, second live session or new storage was introduced.

## Iterations and evidence-preservation limitation

Retained intermediate failures: obsolete manual-play counts/labels; old nested-modal/collapsed-note selectors; redirected read-only fixture paths (restored); a UTF-8 helper failure; and a harness click on intentionally hidden Jump. Final harness reveals Jump via keyboard focus before a real click; visible/focused control has explicit layout space. Native fixtures now distinguish pause attempts from one final release. One failing source-suite process was stopped, with server teardown; later full runs passed.

Most browser/preparer outputs were redirected before execution; 12B screenshots were not touched. **Historical gap:** the first broad unit run regenerated old JSON diagnostics in 07b/07d/08b/08o/09a/11c without preserving original bytes. The first owned-text run used inherited `artifacts/local/10d` before failing on an obsolete replacement selector, refreshing eight PDF/YouTube screenshots, `context-recovery-390.png` and server logs. Their original bytes are unavailable; do not use these refreshed files as evidence for older builds. Named 03M/12B/12B-correction reports/manifests and their separately scoped evidence remain. Subsequent unit and owned-text outputs use 12c; final owned-text runner sets `OWNED_TEXT_EVIDENCE_DIRECTORY=artifacts/local/12c/owned-text`.

## Remaining checks

**NOT_RUN:** real desktop/mobile autoplay and audible routing; actual microphone/interruption; physical iOS Safari/Android Chrome keyboards; poor-connectivity/device behavior; deployment. Existing semantic/security/release gates remain unchanged. Plain text cannot safely reconstruct flattened PDF columns/typesetting.

Device procedure: import a source, start voice, verify automatic sound or one explicit recovery action; mute speaker independently from microphone, toggle theme during a response, confirm no restart/replayed audio/lost chat; Stop during setup/playback and start fresh. Open replacement/preview with the keyboard visible and verify source retention until replacement succeeds. Record exact device/OS/browser/build and actual audible outcomes.

**Handoff: READY_FOR_REVIEW.** No automatic next task or self-approval of later steps.
