# Task 09B — read-only transcript presentation and PM runbook

Proposed **READY_FOR_REVIEW** for presentation only. PM owns acceptance. Parent Step 09 and live Steps 07–10 remain open. No public conversation activation, provider calls, deployment, DB work or spend.

## Delivery and boundaries

Arrival: clean `main`, HEAD `44033f54a82c6b6d2010ca8ade432cd1ff158983`, including accepted 09A `c95f88c9bf762117225803ab09a795667baca418` plus PM documentation. Delivery is an uncommitted dirty diff. Final production build **T3tKcoJbowWTW-uI0jbnW**; isolated fixture JS SHA256 **11ef2c6ec85d7d1e0006151cc1cecf8c6b0a1341c56cc3b725482741f10ea133**, CSS SHA256 **32c97168af24f5df417edbfac69f26816f227ebc24f07fa916a7801b407b141b**. Use pinned Node **24.22.0**, npm **11.19.1** under ignored `.tools/node-v24.22.0-win-x64`; machine-default Node 26.5.0/npm 12.0.1 were inspected only.

`src/app/transcript-view.tsx` consumes a narrow `TranscriptViewSnapshot`: phase/incomplete/order and display turn fields (stable item ID, role, order, generation/interruption/playback facts and indexed text parts). `viewKey` identifies the presentation lifetime and must change for every source/session. It is not authorization or a browser-supplied owner. There are no event/model/environment objects, response/connection IDs, transport callbacks, credentials, question composer or runtime store import. The transcript type import erases; the only runtime import is React.

Public `source-workspace.tsx` supplies **only `snapshot={null}`**, keyed to the existing safe source DTO ID. Its unavailable copy and disabled Start/Ask controls remain truthful. No synthetic answers appear in production. All existing import/read/preview/replacement/removal logic, proof routes, controller semantics, default admission and server policy remain unchanged. No dependency/lockfile/schema/model/config/analytics/storage change. Original source status remains the sole status role in the unavailable workspace; a blank polite transcript region does not duplicate that status.

Turns use stable `itemId` keys and parts use `index:kind` keys. Ordinary React text nodes preserve exact Unicode, spaces/newlines/tabs and HTML-looking strings. `white-space: pre-wrap`, `overflow-wrap: anywhere` and `dir="auto"` support readable plain text without Markdown/HTML execution or automatic links. 09A remains responsible for validation, ordering, priming exclusion and bounded memory. Its 128-turn/128,000-character bound remains intact; this task does not change reconciliation or add history.

## Scroll, focus and accessible updates

The **page alone scrolls at all widths**. There is no fixed-height transcript scroller. The transcript's sticky help/Jump row stays available while reading long content; `.source-workspace` uses `overflow: clip` to retain its rounded boundary without creating a competing scroll ancestor.

`getSnapshotBeforeUpdate` records the first visible turn heading/content part and its viewport offset before React changes the DOM. After changes, the same stable node is restored to the same viewport position. Its document scroll coordinate can change when earlier content or the help/status copy changes height: the passage's visible position is the invariant. Snapshot changes and unread-state layout changes both preserve this anchor. Browser automatic anchoring is disabled for the transcript to avoid competing corrections. Class lifecycle methods are deliberate: they read the old DOM before mutation; no layout is read during render and no after-paint token effect races this capture.

New content follows only when the old end is visible or within **48 CSS px** below the viewport. Otherwise reading stays anchored and “Updates below” appears. A persistent native **Jump to latest** button scrolls instantly, clears unread state and focuses a `tabIndex=-1` latest-text marker only after that explicit action. Deltas/finals never move focus. Manually returning to the end clears unread state. Source/session keyed remounts clear unread/anchors and start at their own beginning when the preceding transcript was scrolled above the viewport. A single passive page-scroll listener is removed on unmount. No timers, observers, media or storage are acquired.

The named region has an h3 under the existing h2 Conversation, an ordered list of turns, h4 speaker labels and separately styled content parts. Visible labels cover drafts, Stop/unfinished parts, interruption, unconfirmed playback, transcription failure, generation failure/cancellation/incompletion, order uncertainty and limits. A limit freezes ingestion in 09A and the view says text is incomplete rather than still updating. Interruption preserves words and explicitly warns they may include speech not heard.

The turn list is not live. A separate atomic polite summary changes for turn/draft/final/failure/interruption/order/terminal facts and the first unread transition; it does **not** include transcript text or change for each delta. There is no screen-reader execution claim. Existing paper/surface/ink/muted/accent tokens, 48 px minimum controls and 3 px focus outline are reused, with no animation. Reduced-motion checks therefore exercise instant movement. Focused review used the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), retrieved 19 October 2026 UTC, and the four selected local skills. No unresolved scoped accessibility/interaction finding was observed; this is not a comprehensive assistive-technology audit.

## Isolated harness and production exclusion

Run **after `npm run build`**:

```powershell
$env:PATH = "$PWD\.tools\node-v24.22.0-win-x64;$env:PATH"
npm run test:transcript-view
```

The command refuses occupied ports **3115/3116**. It uses the TypeScript dependency and webpack bundled with the installed Next package to compile `tests/transcript-view/harness.tsx` into ignored `artifacts/local/09b/harness/fixture.js`. It serves exactly `/`, `/style.css` and `/fixture.js` on **127.0.0.1:3115**; other paths 404. The production Next build runs separately on **127.0.0.1:3116**, with public/proof/issuance gates disabled, empty provider keys, unusable synthetic loopback database and a provider-blocking preload. All servers are stopped in `finally`.

The harness owns a real 09A `TranscriptStore` and passes its snapshots to the same component used in production. Ordinary React fixture buttons emit synthetic events; tests invoke those button handlers without scrolling away from the passage under test. Actual keyboard input operates source focus, Tab, Enter and Jump. Interruption facts use 08B's safe response-state shape; no live controller/media adapter is activated. StrictMode exercises mount/unmount. All browser contexts are fresh, all external HTTP is blocked and media/peer/socket constructors count and throw. The fixture CSP also blocks connections/images/objects. No production fixture route, query switch, global data injection hook or secret bypass exists.

`identity-audit.json` distinguishes production BUILD_ID, fixture JavaScript SHA256 and fixture CSS SHA256. It scans all emitted `.next/static` and `.next/server` JS/JSON for fixture markers, checks the production route manifest and records forbidden server provider attempts. Browser checks request likely fixture URLs on the actual production server and require 404; fixture/scenario query parameters on `/` still show the empty workspace. Client-boundary audit, safe request/resource counts and the changed-file manifest accompany it. Test source is outside `src/` and is neither imported nor traced into production.

## Acceptance and browser matrix

All rows use local Chromium with synthetic events, not live transcription/audio or a physical device. Four projects: **1440×1000, 390×844, 320×800, 768×1024**. Seven scenarios × four widths = **28 tests**; each scenario contains several behavior assertions.

| Criterion | Expected and observed behavior | Evidence |
|---|---|---|
| 1 — text/IDs/order | Same assistant paragraph survives draft→final; duplicate/late finals/deltas ignored by 09A; late question fills first turn; two distinct parts; exact multilingual/combining/emoji/newline/tab text; script/img strings inert; long URL/token wraps; excluded priming/private errors absent | `transcript.spec.ts` first scenario; safe browser traces; `test:transcript` 63 checks |
| 2 — truthful facts | Empty/active-draft/Stop/interruption/failure/order/limit labels; words retained on Stop/interruption; unknown playback never called heard; limit text remains frozen; source preview stays independently usable | Scenarios 1–3; empty/streaming/interrupted/limit screenshots |
| 3 — scroll/reset | Passage viewport offset preserved through appended deltas, longer final, late earlier question and new turn; sticky Jump remains in viewport; Jump clears unread and resumes following; updates keep latest marker focused; source A→B/new session clears turns/unread | Scroll/reset scenarios, `scroll-evidence.json`, `*-reading-anchor.png` |
| 4 — accessibility/layout | Region/list/headings; native keyboard Jump; ≥48 px button and 3 px focus ring; no nested scroller or horizontal text overflow; reduced motion; 200% CSS layout zoom and separately 200% text scaling with viewport reflow | Scenarios 4–6 at all widths; `*-text-zoom-200.png`; visual review below |
| 5 — public honesty/exclusion | Actual production root empty; Start/Ask disabled; import controls retained with configured unavailable flags; no composer/media/peer/socket/API request; fixture paths 404 and query flag inert; emitted fixtures absent | Production scenario, `identity-audit.json`, `*-production-empty.png`; smoke and existing source regressions |
| 6 — event-driven browser evidence | Actual 09A store receives synthetic committed/item/response/delta/final/transcription/failure/Stop/reset/limit events; rendered incremental updates and focus/scroll assertions | Harness/test source and per-test trace ZIPs under `browser-results/` |
| 7 — boundaries/regression | One memory-only view; local/session storage zero; zero forbidden external/media/peer/socket attempts; no new dependencies; source import/preview/replacement/error/removal regressions | Per-test `safe-browser-audit.json`, `client-boundary-audit.json`, source/YouTube command logs |

200% checks are **CSS layout zoom/text scaling and reflow in Chromium**. Browser-toolbar zoom, actual screen reader, physical phone keyboard/touch/audio and other browser engines are **NOT_RUN**. DOM assertions and screenshots establish only their stated coverage.

## Rendered evidence review

Worker opened and inspected desktop and 390 px **empty, streaming, interrupted and limit** screenshots with the image viewer. Speaker hierarchy, part separation, line spacing, green/neutral text and brown error copy are readable; the source precedes the conversation on phones and stays beside it on desktop. Warning copy wraps inside the panel, controls remain reachable and long text does not force a second scrolling panel. The final confirmation includes production empty, anchored-reading and zoom screenshots. These are observed rendered synthetic states, not a screen-reader or device result.

Representative files under ignored `artifacts/local/09b/screenshots/`:

- `desktop-{empty,streaming,interrupted,limit}.png`
- `phone-viewport-{empty,streaming,interrupted,limit}.png`
- `desktop-reading-anchor.png`, `phone-viewport-reading-anchor.png`
- `desktop-production-empty.png`, `phone-viewport-production-empty.png`
- `{desktop,phone-viewport,narrow-viewport,tablet-viewport}-text-zoom-200.png`

Full-page captures preserve entire synthetic states; viewport captures show the sticky Jump affordance while reading. Traces contain only synthetic text and loopback requests; no credential/session secrets are collected.

## Commands, identity and failure ledger

`artifacts/local/09b/commands.jsonl` records exact UTC starts/ends, commands, exits and log paths, including corrected development failures. `PROJECT_STATE.md` records the final build and exact final command table. All checks use pinned runtime and synthetic/default-disabled configuration, with no real DB/provider.

Required final checks: lint, typecheck, unit829, transcript63, build, transcript-view28, smoke14, PDF source UI75 and YouTube UI99. Builds precede browser suites. Browser source regressions use existing actual built routes/parser workers with explicitly synthetic Prisma/upstream boundaries plus separately authored mocked cases; they prove neither PostgreSQL nor hosted retrieval.

Historical voice/text evidence is retained, not relabeled fresh: **09A build `mr0N_NQANXh4eRxD1_ZIZ`**, voice10/10 at **19 October 2026 00:38:47.7606266–00:38:54.0756937 UTC**, text10/10 at **00:38:54.0817997–00:39:01.7197612 UTC**, both exit0. This task changes no shared runtime/proof contracts; new CSS is scoped to the source workspace/transcript and unused by proof pages. The full unit suite includes existing controller regressions.

Development failures: initial lint rejected a render-time ref read and CommonJS test loader; next lint rejected its anonymous default export. Corrected with lazy initial snapshot and a named ESM loader. First browser run18/28 passed: one actual anchor defect from unread-help wrapping, overly exact 48 px assertion, expected one-time unread announcement and fixture CSP blocking inline style injection. Fixed pre-mutation anchoring for state-driven layout, minimum-target assertion, explicit following before delta-announcement check and DOM style assignment. Second run25/28 passed: fixture-only long heading overflow at CSS200% and an incorrect absolute-scrollY assertion despite stable visible passage. Wrapped fixture heading and asserted viewport anchor, preserving a valid scroll adjustment. Subsequent28/28 passed. Source regression then detected duplicate status roles in the unavailable view; corrected by reserving transcript's status role for an actual supplied snapshot. Exact failures/exits remain in the ledger and original logs; `browser-failure-second.json` retains the second failure report. Final checks supersede earlier builds.

## PM review and remaining gates

1. Compare dirty files against `artifacts/local/09b/changed-files.sha256.json`; inspect component props, plain-text rendering, before-mutation anchor lifecycle and keyed reset. Verify no 09A/08A/B semantics changed and no fixtures are imported by `src/`.
2. Use the pinned runtime and synthetic environment (the ignored worker runner is a reproducible example), build and run `npm run test:transcript-view`; inspect `identity-audit.json`, per-test safe audits, traces and the rendered screenshots. Rerun `test:transcript`, smoke and source regressions as appropriate.
3. To inspect the synthetic harness manually, run the command while its browser checks are active on loopback; use the fixture controls to start Long answer, scroll upward, append/finalize/late question, keyboard Jump, then replace source/new session. For a longer inspection, adapt only an ignored local copy of the runner to pause before teardown. Never add a production route/query/global hook.
4. Review source regressions and unchanged disabled public controls. PM decides presentation acceptance; do not activate live sessions, credentials, keys, microphone or text fallback as part of review.

Live source-session wiring, real ASR/grounding/WebRTC/audio, model budget readiness, physical devices and full Step09 completion remain open. Actual assistive-technology/browser-toolbar-zoom review is NOT_RUN. No human key/phone/purchase step is needed for this bounded review. No Step10 work or deployment is proposed.
