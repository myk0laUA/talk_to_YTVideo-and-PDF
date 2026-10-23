# Task 12D — limits, recovery and UI review

**READY_FOR_REVIEW — 22 October 2026.** PM acceptance pending. Sole assignment under original Steps08/11/13; no later step advanced. Local main HEAD `1d30684b5e5d046197038273f67d2f29db93abf4` plus preserved accepted dirty work. Final production build **Fdy7lYcApHEaHLwDaPG_a**, Node **24.22.0**, npm **11.19.1**. No deployment, paid provider/model call, real database operation or physical device test.

## Limits and recovery

Owned traffic uses dedicated named policies in `src/server/session-policy.ts`; synthetic proof endpoints retain6 preparations /3 issuances per visitor/hour. Cancellation never refunds admission. Windows are process-local fixed one-hour windows.

| Owned lane | Visitor/hour | Aggregate and shared network/hour | Process lifetime | Concurrent operations |
|---|---:|---:|---:|---:|
| Voice preparation | 120 | 1,200 | 20,000 | 2 |
| Voice credential | 60 | 600 | 10,000 | 2 |
| Voice command | 600 | 6,000 | 100,000 | 4 |
| Voice cancellation | 240 | 2,400 | 40,000 | 4 |
| Text start | 60 | 600 | 10,000 | 20 |
| Text command | 2,400 | 24,000 | 400,000 | 20 |
| Text stop | 240 | 2,400 | 40,000 | 20 |

Voice replay tombstones are bounded at20,000; text at50,000 (10,000 starts plus40,000 independently admitted stop tombstones). They never expire into replayability. Existing owner exclusion, preparation entries4, text sessions20, request sizes, source/cookie expiry, ACK gates, deadlines, question/context protections and answer-token caps remain. The server bounds voice preparation/mint operations; it does not acquire visibility into the full lifetime of direct browser WebRTC sessions.

Owned voice errors expose only safe `code: session_admission`, `reason: window|busy|capacity` and optional `Retry-After`. Window values derive from remaining server-window time, rounded up and bounded1–3600 seconds. Busy/concurrent and lifetime/replay capacity do not promise timed recovery. Missing/malformed/date-form Retry-After creates no precise countdown. Adapter bodies are bounded1KiB; raw upstream details, owner/source identifiers and credentials are not projected.

Workspace-owned `VoiceRecovery` survives source/mode remounts using monotonic memory-only timing. Known cooldown disables Start/Retry, with no per-second live announcements. Expiry enables explicit retry; it never starts, mints, requests media or sends a question. Text mode remains usable. Reload loses the local hint but does not reset server limits. Definitive preparation rejection skips unnecessary cancellation; ambiguous/network failures and credential-stage rejection retain cleanup/TTL fallback.

`tests/unit/session-assessment.test.ts` uses actual handlers/registries: four reviewers each complete30 voice mint/cancel and30 text start/source-ACK/stop cycles in one hour. A fifth visitor establishes the process window first, keeping the reviewers' original cookies valid at the timed-reset boundary. Reviewer1 reaches60;61 rejects, then succeeds after reset while replay still rejects. Tests also cover120 preparations, every lane's exact visitor/aggregate boundary, concurrency, lifetime and malformed cooldowns. Built HTTP voice checks independently reach60 and reject61 without another fake upstream acquisition.

These controls are finite and process-local, not a provider/account spending guarantee or reserved capacity. Independent expiry, context, body and concurrency safeguards can still reject work. A cookie/source may expire before a long cooldown ends; expiry was not extended to make tests pass.

## UI findings and verification ledger

One sequential audit → implementation → accessibility/React review → rendered verification assignment. Impeccable context loader ran once. The user's sequential/no-score prompt superseded the skill's independent-agent/scored-report workflow. No subagents, competing design process or metadata repair. Current PROJECT_STATE/12C evidence took precedence over historical PRODUCT scaffold statements.

Evidence root is `artifacts/local/12d/`; baseline means its preserved pre-12D source. All findings remain listed, including hypotheses and residuals.

| ID / priority | State and evidence | Impact | Correction / proposed correction | Verification / disposition |
|---|---|---|---|---|
| F1 P1 observed | Generic admission failure; baseline `src/server/voice/handlers.ts:85` | Limit looks like generic setup failure | Named policies, safe reason and derived cooldown beside retry | Resolved locally: handler/adapter tests, `confirmation/cooldown-*.png`; rejected preparation/credential acquires no native media |
| F2 P1 code risk | Source/mode remount; `src/app/conversation-area.tsx:21` | Local controller recovery would vanish | Workspace-owned recovery memory | Resolved:5s cooldown survives mode change;30s survives successful source replacement; zero automatic starts, eligible explicit retry succeeds |
| F3 P2 observed | `before/text-light-390.png`; baseline source controls | Inspect vague; actions/metadata compete | View source, Source actions menu, replacement choices and confirmed removal | Resolved: both-theme menu/preview/replacement/remove captures;87PDF/99YouTube UI tests |
| F4 P2 observed | `before/voice-dark-1440.png` | End/speaker/state require inference | Start/Retry/End voice, matching SVGs and real state labels | Resolved tested states:208voice UI/579adapter checks; theme preserves controller/transcript and independent mute |
| F5 P2 observed code | Baseline `transcript-view.tsx:88` | Generic empty state lacks next action | Source-aware voice/text/failed/stopped invitation | Main invitation resolved, `confirmation/empty-*` and `cooldown-*`; small redundancy remains F16 |
| F6 P2 observed | `before/text-light-390.png`; baseline dock | Secondary Stop/repeated prose compete with composer | Compact actions, focused composer, adjacent recovery | Layout resolved;108text UI and long-scroll captures. Some restart copy repeats: F16 |
| F7 P1 observed code | Baseline button-only reader Tab trap; current `src/app/dialog-focus.ts:5`, `source-workspace.tsx:147` | Summary/input can be missed at focus boundary | Shared reachable-control containment, native modal, Escape/return focus | Resolved Chromium keyboard tests including320px/200% text and Keep/Confirm loop; not assistive-technology certification |
| F8 P2 observed code | Baseline text restart clears draft; current `src/app/text-session.tsx:69` | Unconfirmed question lost despite recovery copy | Retain draft on explicit restart; clear on confirmed receipt or source/mode reset | Resolved: uncertain receipt and confirmation restart checks; draft retained, transcript reset, no automatic question |
| F9 P2 observed | Baseline reset disclosure; `src/app/conversation-area.tsx:40` | Mode consequence hard to find | Visible clears-chat-and-draft notice linked to group | Resolved:156mode tests, repeated selection inert, mode change clears/disposes; provider memory unchanged |
| F10 P2 observed | Before reader/replacement and historical CSS | Inconsistent hierarchy/styling | Shared themed menu/dialog/composer/reader rules; obsolete disclosure rules removed | Resolved reviewed presentation in both themes; no dependency/branding change |
| F11 P2 hypothesis | Reported dev warning; `src/app/layout.tsx:17` | Possible theme bootstrap issue separate from429 | Inspect installed Next docs and reproduce before changing | **Unreproduced/open.** Existing dev system-dark/preference/reload/HMR checks: messages[], deniedRequests[]. Bootstrap unchanged |
| F12 P2 hypothesis | Long names/text, narrow reflow, scrolling | Potential clipping/focus/anchor loss | Exercise literal long data, anchored streaming and dialogs | No horizontal overflow/overlap in exercised states; full filename in reader and literal-section equality pass. Physical keyboard/audio and other engines unverified |
| F13 P2 observed in inspection | `inspection/reflow-light-390.png` | Enlarged mic label spills out of fixed68px circle |4.25rem/min68px sizing, relative icon/text; `globals.css:229` | Resolved in sole confirmation batch, `confirmation/reflow-*.png` |
| F14 P1 observed keyboard failure | First inspection menu End focus; `src/app/source-actions.tsx:24` | Delayed toggle steals focus to first item | Focus synchronously on open; toggle tracks state only; disable busy items | Resolved End/Escape/return/import-exclusion checks; resize listener cleanup retained |
| F15 P2 observed code in final review | `src/app/voice-session.tsx:128` | Unknown output called Sending; paused input called Listening | Explicit Audio output uncertain / Microphone input paused | Resolved final code-only state correction and208voice tests with new assertions; no second visual polish loop |
| F16 P3 observed remaining | `confirmation/long-name-*.png`; `voice-session.tsx:150`, `text-session.tsx:106` | Redundant No answer yet after idle remount; restart consequences partly repeat | Future small visibility/copy consolidation preserving failure information | **Remaining cosmetic issue**, explicitly visible; not declared fixed by tests |

## Skills, accessibility and React decisions

The selected ElevenLabs composition, supplied rounded VoiceChat control, sliding moon/sun switch and gradient/glow buttons remain binding. Original React/CSS and authored SVG implement the presentation; no external registry code or dependency copied. Supplied reference review records the gradient catalog's MIT claim and Radix/CVA dependencies, not full registry-source verification. Latest ElevenLabs fetch403 in that reference remains a source-access limitation, not a new rendered inspection. Package/package-lock bytes match the12D baseline. Actual decisions are in DESIGN.md.

Impeccable playbooks applied: **critique/audit/operate** to journey/ledger; **polish** to spacing/type/icons; **clarify/distill** to actions, reset/recovery copy and disclosure reduction; **adapt** to dynamic/narrow viewports and enlarged text; **harden** to replacement failure, draft retention, literal overflow and recovery; **animate** only to supplied control/theme transitions. **craft-floor** was read immediately before edits. Empty deterministic hook findings were not treated as acceptance.

Read `web-design-guidelines/SKILL.md` and fetched its [current guideline source](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Actionable findings map to F3/F7/F8/F13/F14/F15: names/state, native semantics, keyboard/focus, associated errors, truthful state and reflow. Menu uses native popover and button/menuitem semantics; removal defaults to Keep. URL validation retains aria-invalid and associated help/error. Source text remains literal. Stable polite status announces recovery; countdown timer has live off. Focus, disabled/error/dialog surfaces share theme tokens. Tested ink/muted/warning/gradient-endpoint contrast pairs exceed4.5:1; not every rendered pixel or screen-reader behavior was audited.

Applied `vercel-react-best-practices` and relevant event-listener cleanup, effect-dependency/event ownership and hydration rules. Controller factories/keys remain stable across theme/menu/dialog changes. Theme owns no transport/media. Cooldown timer cleans up on unmount; menu resize listener detaches; dialog cleanup restores focus. Existing visualViewport/ResizeObserver cleanup and transcript anchoring remain. New policy module imports server-only; safe rejection DTOs carry no environment objects/raw models/keys. No SDK/icon bundle expansion.

Applied `playwright-cli` skill through pinned existing Playwright scripts and offline harnesses. Pinned Taste app-screen guidance was read as aesthetic context, not another design workflow. Installed Next16.4.2 `node_modules/next/dist/docs/01-app/02-guides/scripts.md` and Script-component docs were consulted for F11. A second dev launch failed because the existing user server owned the dev lock; that server was preserved. Fresh isolated browser tested its root page with all API/external requests denied. This narrow reproduction cannot prove the warning never occurs.

## Rendered evidence and state transitions

Before: actual pre-change UI/controller bundle with synthetic boundaries, associated with existing12C build **KIcqUmxyKpGojjnGbp6Xs**. Confirmation: actual UI/controller isolated bundle, build metadata **rw3gUEMjdG79rO1_j_pUv**, exact CSS/bundle hashes in `confirmation/viewport-results.json`. Final build **Fdy7lYcApHEaHLwDaPG_a** adds only F15's exceptional-state labels to application code after capture; final functional suites verify those. Older screenshots are not relabelled as final production/hosted renders.

One complete representative inspection batch was visually reviewed together, defects corrected together, then one confirmation batch reviewed. An early focus assertion stopped the incomplete initial capture; preserved in `inspection-incomplete/`. No further visual polish loop. Contact sheets and individual long-name/removal captures were actually opened. Confirmation has60 full images covering both themes at390×844/1440×900 plus320×400/200% root text enlargement. This is reflow emulation, not physical keyboard or native browser-zoom proof.

| Journey | Before | After / verification |
|---|---|---|
| Entry/import / loaded empty | No dedicated old empty screenshot; baseline code retained | `confirmation/entry-{theme}-{width}.png`, `empty-*` |
| Text / voice | `before/text-*`, `voice-*` | Same names in `confirmation/` |
| Source menu / reader / replace | Before strip in text captures, `before/preview-*`, `replacement-*` | `confirmation/menu-*`, `preview-*`, `replacement-*`, `remove-*` |
| Incomplete/failed text / long reading | `before/error-*`, `long-scroll-*` | Same names in confirmation; anchor stays within1px, focus retained, explicit Jump to latest works |
| Voice cooldown | Generic failure established in brief; no matched old429 capture | `confirmation/cooldown-*`;5s stub countdown, disabled retry, Text available, explicit eligible retry, no extra preparation |
| Long filename / failed replacement | No matched old long-name capture; baseline code retained | `confirmation/long-name-*`; failed replacement retains prior, URL draft survives close/theme/reopen, successful replacement preserves30s cooldown and makes zero new prepare calls |
| Reflow | `before/reflow-*`, `preview-reflow-*`, `replacement-reflow-*` | Same names in confirmation; mic correction specifically `inspection/reflow-*` → `confirmation/reflow-*` |

Additional transition evidence:208voice UI cases cover connection progress, mute, interruption, blocked playback, expiry/offline, partial/failed output and teardown races;156mode cases prove one owner and late-event isolation;87PDF/99YouTube cases cover import/loading, authoritative expiry, read retry, cross-kind replacement and confirmed/uncertain removal;108text cases cover receipt/draft/recovery.579built adapter checks use real app HTTP/lifecycle/adapters with synthetic Prisma, client-secret/SDP/peer/channel/media and zero forbidden network.734owned-voice/532owned-text built checks also record zero forbidden network. These are not model-grounding or audible-output evidence.

## Commands and identity

All commands use `.tools/node-v24.22.0-win-x64/node.exe`; npm uses its `node_modules/npm/bin/npm-cli.js`. Wrapper: `node artifacts/local/12d/run.mjs <log-name> npm|node <arguments>`. Exact executable/argv/UTC exits: `commands.jsonl`. Runner sets OWNED_TEXT_EVIDENCE_DIRECTORY under12d; owned voice explicitly used OWNED_VOICE_EVIDENCE_DIRECTORY=artifacts/local/12d/owned-voice.

| Command | Exit / evidence |
|---|---|
| `npm test` |0,1,742 tests; `tests-final.log` |
| `node --require ./tests/text-relay/network.cjs --conditions=react-server --test tests/unit/session-assessment.test.ts tests/unit/owned-voice.test.ts tests/unit/owned-text.test.ts tests/unit/voice-browser-adapters.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/voice-interruption.test.ts` |0,412 tests before extra preparation-boundary case; `admission-final.log`; full suite includes it |
| `npm run lint` / `npm run typecheck` |0 /0; `lint-handoff.log`, `typecheck-handoff.log` |
| `npm run build` |0; `build-handoff.log`, final Fdy7lYcApHEaHLwDaPG_a |
| `node scripts/verify-ui-12d.mjs` |0; `ui-inspection-complete.log`, `ui-confirmation.log`; capture identity above |
| `node scripts/verify-text-session.mjs` |0,108tests; `text-ui.log`; earlier12D build, text implementation unchanged afterward |
| `node scripts/verify-voice-session.mjs` |0,208tests; `voice-ui-handoff.log`, final build |
| `node scripts/verify-mode-switch.mjs` |0,156tests; `mode-ui-verified.log`, final build |
| `node scripts/verify-source-ui.mjs` |0,87tests; `source-ui-handoff.log`, final build |
| `node scripts/verify-youtube-ui.mjs` |0,99tests; `youtube-ui-handoff.log`, final build |
| `node --conditions=react-server scripts/verify-voice-adapter.mjs` |0,579checks/48scenarios; `native-adapter-verified.log`, final build |
| `node --conditions=react-server scripts/verify-owned-voice.mjs` |0,734checks; `owned-voice-verified.log`, final build |
| `node --conditions=react-server scripts/verify-owned-text.mjs` |0,532checks; `owned-text.log`, final build |
| `node artifacts/local/12d/theme-existing.mjs` |0; `theme-existing.log` / `theme-existing-results.json`; existing local dev |

Intermediate failures retained: initial admission exit1 (old3-start assertion and expired-cookie fake-clock scenario, fixed without extending expiry); initial lint1 (unused test parameter); first UI1 (F14 focus race); dev helper13 then1 (helper exit-wait bug then existing dev lock); initial voice UI1 (old copy); source UI1 attempts (old button/focus selectors and busy menu-item defect); YouTube1 (metadata moved into reader, test follows it); native-adapter1 attempts (old Start selector then old microphone copy); owned-voice1 (obsolete3-start assertion replaced by exact60/61). First mode run interrupted with outer exit1 after obsolete dynamic voice labels caused waits; partial output preserved, corrected full run passed. Interrupted wrapper did not append a completion record to commands.jsonl.

Historical output paths were redirected under12d before running; older fixtures read only. Failed12d attempts were preserved before reuse in regression-first/, source-ui-second/, youtube-ui-first/, native-adapter-first/, native-adapter-second/, voice-ui-second/, mode-ui-first/ and owned-voice-first/. Pre-12D source baseline/SHA256 manifest are retained. `VOICE_LIMIT_RECOVERY_12D_HASHES.json` lists changed-file hashes relative to baseline and evidence hashes. Regenerated diagnostics are not evidence for older builds.

## Remaining limits / handoff

F11 remains unreproduced; F16 remains minor copy duplication. Screen-reader announcements, other browser engines/native popover behavior, physical phone keyboard/audio routing/autoplay/heard words and live grounding remain unverified. User deferred physical phone/audio until deployment. Live YouTube availability is not proven by synthetic caption success. No accounts/history/sidebar/model picker/embeddings/vector store, SDK migration or provider-memory redesign.

All authorized implementation and bounded local verification are returned for review. PM owns acceptance, deployment and follow-up; no self-approved completion of original steps.

