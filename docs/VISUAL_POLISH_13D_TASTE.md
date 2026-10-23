# User-requested Taste visual polish — READY_FOR_REVIEW

22 October 2026 Toronto / 23 October UTC. Follow-up to13D authorized directly by the user: “Use a high end visual design skill to polish the web site.” This permits the visual changes below; it does not advance original Steps01–14 or accept/deploy a release. Earlier13D cleanup/UI reports and hash manifests remain historical evidence, unchanged.

## Result and design decision

Used the explicitly selected Taste plugin's entry workflow and high-end-visual-design skill, with preserve/evolve guidance for the existing app. Existing product composition, icons, gradient actions, microphone, moon/sun switch and centered starts remain the design anchors. Direction: calm premium document workspace; design variance4, motion3, density3.

- Locally served, preloaded Geist variable typography; larger editorial welcome heading and a split desktop layout with stacked import choices. Mobile retains natural single-column flow.
- Cooler neutral light and dark palettes, a thin outer workspace tray, nested surfaces and restrained highlights/shadows. Rounded controls, source menus, replacement/reader dialogs and the text composer share the same visual treatment.
- Short transform feedback and one welcome entrance, disabled by reduced-motion preference; dialog backdrop has a reduced-transparency fallback.
- Fixed active-dock horizontal overflow from routine visually-hidden status text at320px/200% text. The selector now preserves the existing clipping utility. The narrow composer places Send question below its textarea so enlarged text remains readable.

No production controller, source acquisition, provider, ownership/expiry, conversation semantics or database changes. No dependency changes. Original one-source/one-conversation, anonymous sessions, explicit starts, genuine text fallback and actual voice-state presentation remain. Public YouTube availability remains server-controlled and disabled in the current accepted configuration; the available variant is synthetic evidence only.

Production edits: `src/app/globals.css`, font preload in `src/app/layout.tsx`, and `public/fonts/{GeistVariable.woff2,OFL.txt,README.md}`. Font is the unmodified69,760-byte WOFF2 from official vercel/geist-font commit `d1d9ce6e929a35f0e24b7cd10573f17db58196a0`, under SIL OFL1.1. Attribution/license retained. No runtime third-party font request.

## Build and commands

Local dirty main HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`. Final production build **JITbvR6CHVJWu4TdniqAZ**, built2026-10-23T02:03:48.459Z–02:03:56.241Z. Pinned Node **24.22.0**, npm **11.19.1**. No commit, push or deployment.

All commands below use `.tools/node-v24.22.0-win-x64/node.exe`; npm is its colocated `node_modules/npm/bin/npm-cli.js`. Exact executable, arguments, UTC times, exit status and log path for every attempt are in `artifacts/local/13d-taste/commands.jsonl`. `run.mjs` supplies blank provider keys, a non-operational synthetic loopback database URL and disabled proof/ingestion flags. Browser suites supply their own deterministic fixtures and never use a real database/provider.

| Command | Final result | Context / evidence |
| --- | --- | --- |
| `npm run build` | PASS, exit0 | `final-build.log`, final build above |
| `npm run lint` | PASS, exit0 | `final-lint.log`, after final verifier/CSS edits |
| `npm run typecheck` | PASS, exit0 | `typecheck.log`; subsequent runtime edits were CSS only |
| `node --conditions=react-server scripts/verify-ui-polish.mjs final` | PASS, exit0 | `final/results.json`;138 rendered states,78 detailed start-layout checks |
| `npm run test:source-ui` | PASS,87 tests, exit0 | `final-source-ui.log`; final production build, parser/synthetic repository and mocked HTTP journeys |
| `npm run test:voice-session` | PASS,208 tests, exit0 | `final-voice-ui.log`; isolated deterministic adapters plus final production exclusion checks |
| `npm run test:smoke` | PASS,18 tests, exit0 | `final-smoke.log`; existing final production build |
| `node artifacts/local/13d-taste/check-built.mjs` | PASS, exit0 | `built-font-reader.log/json`; actual built app on loopback, mocked source HTTP |
| `node artifacts/local/13d-taste/motion.mjs` | PASS, exit0 | `motion.log`, `motion-results.json`; built font loaded, reduced-motion behavior |

Final source/voice/smoke runs began after the final build completed; no rebuild occurred during them. Their evidence is under `artifacts/local/13d-taste/final-regression/`. The isolated voice suite uses its own static CSS bundle and system font fallback; the138-state matrix and separate built-app probes explicitly load the new font. No need to rerun unrelated backend suites for this presentation change; earlier13D cleanup/native evidence is preserved separately.

## Browser and visual evidence

`scripts/verify-ui-polish.mjs` extends the existing12E actual-component/controller fixture, generates inputs directly from committed synthetic priming fixtures and serves the local font. It never adds a production fixture route. It refuses an existing named evidence directory; run in a fresh review checkout/evidence directory to preserve existing captures.

Six combinations: light/dark at390×844,1440×900, and320×600 with200% root text. Twenty-three states each: PDF-only/available-YouTube welcome, text idle/pending/failed/empty-ended/active, source menu/replacement, voice idle/pending/cancelled/empty-ended/failed/cooldown/offline/reconnected/permission-denied/playback-blocked/partial/interrupted/received-ended, and PDF reader. All138 states pass horizontal-overflow checks. Thirteen start states per combination pass78 detailed clipping/overlap/centering/action-reachability checks. Voice/text start geometry matches.

Focus restoration, literal PDF page fidelity, last-page scrolling, explicit starts/no automatic retries, received-turn preservation, source actions and independent microphone/speaker states are exercised. Final matrix has zero page errors, external requests or native media calls; browser/server resources released. Six checked text/background pairs, including primary-gradient endpoints, exceed4.5:1; minimum checked ratio is5.159:1 in light mode and8.32:1 in dark mode. This is scoped token-pair evidence, not a blanket accessibility certification.

Separate built-app probe verifies font preload/load and long filename/unbroken text reader containment at320/390/1440px with200% text in both themes. Reported `width` values in its JSON are measured dialog widths307/377/699, with equal scrollWidth; requested viewport sizes are in the probe source. Reduced motion reports heading animation/transition `none`, versus `workspace-enter`/`transform` with no preference. The full source suite independently verifies keyboard containment, Escape/trigger focus, preference persistence and storage failure.

Visual review covered before/after full-size welcome, centered entry, active text/voice, warning and reader screenshots; light390 contact sheets covered all23 states. Representative full-size final captures were inspected across both themes and all three viewport configurations, including320/200% composer and1440 dark partial voice. All138 screenshots are retained for PM review; this does not claim every image received a separate full-size manual review. Contact sheets are supplementary.

Key captures in `artifacts/local/13d-taste/final/`: `welcome-pdf-light-1440.png`, `welcome-pdf-dark-1440.png`, `welcome-pdf-light-390.png`, `voice-idle-light-390.png`, `text-active-dark-390.png`, `text-active-dark-320-200.png`, `voice-partial-dark-1440.png`, `pdf-reader-dark-390.png`.

## Retained failures and corrections

All attempts remain in the ledger/logs; only the final stable runs above are acceptance evidence.

- Initial `before`, `inspection`, `before-complete` and `confirmation` exited1 because source-menu capture at320/200% changed the viewport/scroll position, closing the native popover before the next action. Capture now avoids scroll and full-page viewport resizing for that menu state. Assertions were retained.
- `before-settled` exited1 because a simultaneous build temporarily removed `.next/BUILD_ID`. Build identity is now read before acquiring browser/server resources. Final verification is sequenced after build completion.
- Completed `before-final` deliberately uses the exact arrival CSS and exits1 with six original horizontal-overflow findings: text-active/source-menu/replacement in both themes at320/200%. Final CSS resolves them; final matrix exits0.
- First source suite exited1 with85 passed/two failed (narrow integrated-PDF console error and reader containment). That run overlapped the final build, so it is invalid as stable-build acceptance evidence; no claim is made that overlap conclusively explains both failures. Fresh complete source rerun after the build passes87/87. Independent built reader probe also passes all six combinations. No source-suite assertion was weakened.
- First build, lint, typecheck, smoke and voice runs passed, but final runtime evidence uses the final build. Initial build identity `1PMWjMbctc9ZBiNNkA_ly` is superseded.

## Preservation and remaining gates

The arrival705-path hash inventory is in `artifacts/local/13d-taste/arrival.json`. New [hash manifest](VISUAL_POLISH_13D_TASTE_HASHES.json) records this follow-up's exact changed files and evidence. All prior deletions and unrelated accepted dirty content are preserved. New PROJECT_STATE/TESTING entries precede their unchanged historical bodies. The old13D report/manifest remain unchanged and describe their earlier source/build identity.

READY_FOR_REVIEW only. Corrected disposable-PostgreSQL cleanup/race execution remains **NOT_RUN** here and PM-owned. Original SQLSTATE23514/setup failure remains historical evidence. No Docker/shared database/cleanup operation/provider calls or deployment performed. Hosted release, real answer quality, physical phone/audio and final recording/access gates remain as documented in13C. Browser emulation and synthetic transport/media do not prove physical sound or device behavior.

## Post-completion hook triage

The Stop hook repeated the same `overused-font Geist` warning four times for globals.css lines2/5. Kept the intentional documented typography. Agent added only `overused-font=geist` through the supported Impeccable ignore-value command; reason names the agent decision, not user confirmation. Hook remains enabled with no ignored rules/files. No UI fixes required; no findings left standing. Ignore/status commands exit0, recorded in `artifacts/local/13d-taste/hook-triage.json`. Runtime/build/tests unchanged; configuration-only follow-up does not require rebuilding. Hash manifest refreshed; pre-hook manifest retained as historical evidence.
