# Task 03F — source-resolved YouTube text evidence

**READY_FOR_REVIEW — partially implemented; live summary and follow-up evidence acceptance FAIL.** The bounded resolver/renderer and synthetic checks pass. The real summary has three unmatched-reference warnings (two readable claims); the real follow-up is warning-only. Zero resolved references were displayed. This is not grounded-answer acceptance. One session/two responses only; no correction session, deployment or later task.

## Selected contract (recorded before coding)

Only provider text + YouTube variant B uses `youtube-text-evidence-v2`: newline-delimited JSON objects, each `{"claim":"short natural-language claim","refs":[["segment-ID","short exact source excerpt"]]}`. No schema API assumption, new provider call, model or cap change. At most 8 units per output part, 600 claim characters, 3 reference pieces per unit, 240 characters per quote, 16,000 response-part characters (existing transcript cap). Prompt asks for at most 3 brief attributed claims with short quotes to fit 512 output tokens.

The owned registry captures a checked safe source DTO during preparation, compares its ID/sections with the exact admitted variant, and retains it only for that entry. A server-only pure projection parses bounded output, validates known IDs and exact quote substrings in that original caption, and resolves excerpts/times/video links from the snapshot. Matching is exact UTF-16 substring membership, with no whitespace, newline, Unicode or translation normalization. Displayed quote is sliced from stored text. No timestamp or URL supplied by the model is used. Validated membership is called a source match, never fact checking or semantic verification.

The transcript wire adds optional per-part evidence units and replaces scoped provider markup with natural claim text. Claims may stream before their reference record closes; partial JSON strings decode only complete escapes. Incomplete/stopped records remain incomplete, invalid/missing pairs are unconfirmed, and malformed output never exposes raw control markup. Existing run/source/item/event gates remain authoritative; new entries own independent snapshots, Stop retains the final projection before clearing its source reference, and late events cannot mutate it. PDF and voice use their existing wire and rendering paths. The renderer displays plain claims, source excerpts and stored timestamps with distinct pending/incomplete/unconfirmed copy, using the incumbent styles.

Affected boundaries: `priming-manifest` instruction/version and exact admission binding; new server-only evidence projection; owned text registry capture/projection/release; optional shared transcript DTO; transcript presentation. Text lifecycle/store/provider transport semantics remain unchanged. Semantic support is evaluated independently against the actual full transcript during the bounded live run.

## Identity and implementation

21 October 2026 Toronto, local Windows, branch `main`, HEAD `1bd6fd31bc69693b5acd677a8881396bd761d9ba`. Clean arrival; dirty delivery, no commit/push. Final normal, uninstrumented production build **`J-lENP9V9Be4S-20jqugC`**, built 23:14:45.366–23:14:50.061 UTC. All 233 application/test/script inputs in the recorded build comparison equal the workspace and remained unchanged during/after live verification. Final dirty identity, SHA256 hashes and protected-file/private-file checks are in ignored `artifacts/local/03f/identity.json`, `changed-file-hashes.json`, `before-live-source-hashes.json` and `cleanup.json`.

Changes:

- `src/server/text/youtube-evidence.ts` parses/project bounded response units and resolves exact stored evidence. It rejects missing/unknown IDs, quotes in another ID, empty/nonmatching/translated quotes, extra fields and oversized structures. A multi-piece claim matches only if every pair matches. No fuzzy/ordinal/time repair exists.
- `src/server/text/registry.ts` retains a checked DTO only after an owned re-read and exact admitted-section comparison. It projects text only for that entry, emits the final Stop projection, then releases the snapshot. No raw database model, owner hash or credential crosses the relay.
- `src/shared/youtube-evidence.ts` and the optional part field in `src/shared/transcript.ts` carry safe display facts. Ordinary transcript storage/lifecycle behavior is unchanged.
- `src/shared/priming-manifest.ts` supersedes03E's copied ID/time instructions and fragment citation strings with the v2 claim/excerpt contract. Exact manifest regeneration, representation/version equality, effective settings and final ACK bindings remain enforced. YouTube text/B only; 512-output/context bounds unchanged.
- `src/app/transcript-view.tsx` renders natural claims, expandable inert excerpts and stored-time links. It differentiates pending, incomplete and unconfirmed states without claiming semantic verification. Existing classes preserve excerpt newlines and wrap long text. `src/app/text-http-controller.ts` also changes pending evidence to incomplete on local Stop/connection loss, since browser cancellation can precede the server's final snapshot.
- New authored evidence tests, real registry projection/Stop tests, HTTP cancellation tests and four-viewport presentation cases cover the changed boundaries. The03E locator tests now assert obsolete model-authored citation strings are absent, retaining exact locator/packing/stale-binding coverage.

No dependency/lockfile, model, schema, storage/SQL, source preview, provider transport, voice policy, PDF behavior, public gate or hosting change. No Next.js framework API change required a version-matched framework guide. The selected React, bounded Impeccable clarify/harden, Playwright CLI and OpenAI Docs skills were applied. Desktop and390px screenshot inspection found the four evidence states legible and inert; this is Chromium viewport evidence, not a phone/audio test.

## Offline verification

Pinned Node **24.22.0** / npm **11.19.1** throughout. Synthetic checks/build ran in `artifacts/local/03f/offline-checkout`, with no private `.env`, blank real keys, unusable loopback database and denied external network. The dependency junction was reused; no install/upgrade. The command ledger records actual argv, UTC start/end, cwd, exit and per-command log: `artifacts/local/03f/commands.jsonl`. Invocations use `.tools/node-v24.22.0-win-x64/node.exe` and its `node_modules/npm/bin/npm-cli.js`.

| Command / check | Environment | Observed result | Exit/status | Evidence under03f |
|---|---|---|---|---|
| `npm run lint` | Final isolated inputs | Clean | 0/PASS | `lint-2026-10-21T23-14-31-354Z.log` |
| `npm run typecheck` | Final isolated inputs | Pass | 0/PASS | `typecheck-2026-10-21T23-14-36-247Z.log` |
| `npm run test` | Final isolated inputs, synthetic | **1673/1673**; includes22 evidence cases plus registry and HTTP regressions | 0/PASS | `test-2026-10-21T23-14-38-846Z.log` |
| `npm run build` | Final isolated production build | `J-lENP9V9Be4S-20jqugC` | 0/PASS | `build-2026-10-21T23-14-45-366Z.log` |
| `npm run test:owned-text` | Final built HTTP/browser, synthetic | **417** checks | 0/PASS | `test-owned-text-2026-10-21T23-14-50-063Z.log` |
| `npm run test:owned-voice` | Final built HTTP, synthetic credential boundary | **125** units + **392** built checks, forbidden network0 | 0/PASS | `test-owned-voice-2026-10-21T23-17-45-558Z.log` |
| `npm run test:voice-adapter` | Final built HTTP/browser, fake RTC/media | **113** units + **571** checks/48scenarios, forbidden network0 | 0/PASS | `test-voice-adapter-2026-10-21T23-18-03-722Z.log` |
| `npm run test:transcript-view` | Final UI, isolated Chromium at4viewport widths | **40** cases, including4new evidence-state cases; inert text, stored URL, replacement clearing and overflow checks | 0/PASS | `test-transcript-view-2026-10-21T23-18-31-336Z.log`; nested `offline-checkout/artifacts/local/09b/` |
| `npm run test:text-session` / `npm run test:mode-switch` | Final build with isolated synthetic UI harnesses | **108 /156** browser cases; lifecycle/Stop/late-event/source/mode boundaries | 0/PASS both | `test-text-session-2026-10-21T23-18-44-336Z.log`, `test-mode-switch-2026-10-21T23-19-14-989Z.log`; nested `offline-checkout/artifacts/local/10b/` and `10c/` |
| `node --conditions=react-server artifacts/local/03f/prepare.mjs` | Offline historical source used only for preservation | **24** voice/PDF manifest comparisons byte-identical to HEAD; full428captions lossless,7text items,107339wire bytes for comparison run | 0/PASS | `preservation.json` |
| Build-input/private/protected-file/process/port audit; `git diff --check` | Local final workspace/isolated build | Equality/integrity/cleanup pass; final counts and exits in identity/supplement | 0/PASS | `identity.json`, `cleanup.json`, `commands-extra.json` |

Authored cases cover correct ID/quote; unknown/wrong ID; empty, translated, whitespace/newline/Unicode mismatches; multiple caption pieces; escaping/inert hostile strings; fabricated times/URLs; invalid/oversized/pretty/incomplete JSON; partial escapes; Stop mid-record; source replacement/run mismatch and late completion. A separate authentic-but-unrelated quote deliberately matches lexical membership and fails the independent authored semantic review. These checks establish deterministic behavior, not a general semantic validator or model compliance.

Development evidence is retained: final malformed-output test initially expected only a readable claim, but pretty printing consumed more than8lines and correctly added the explicit limit warning (1672pass/1fail, exit1, `test-2026-10-21T23-14-08-007Z.log`). The assertion was corrected to require the readable claim **and** that warning; no parser bound was relaxed. Earlier passing checkpoints are in the ledger. An artifact audit initially compared Git LF blobs to Windows CRLF files and failed; it was corrected to compare the pre-live disk hashes. Neither failure was a live retry. Final checks pass. The first focused-run display label omitted some actual file arguments; the supplemental command record names the exact252-test invocation.

## Real summary and follow-up — failed gate

Official [pricing](https://developers.openai.com/api/docs/pricing) and [model documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) were searched and opened before calls: text input$0.60, cached input$0.06, output$2.40 per million tokens; documented128000 context. Existing Realtime socket/512-output policy remains unchanged; no JSON-schema support is assumed.

The real normal production build ran at `http://127.0.0.1:3133` with private environment passed only to the task-owned child, fresh browser visitor, real owned PostgreSQL storage, direct uncached YouTube acquisition and actual OpenAI text. Public configuration was untouched: voice stays enabled, YouTube disabled. Local voice/PDF import/proof gates were disabled for the bounded check. No debugger, mocked/seeded captions, model-response mock, provider-event capture or live voice call. A bounded fetch preload captures only YouTube XML/status; it does not capture provider events or measure ACK timings.

`expectations.json` records the English summary and Princeton duration/audience questions and non-exhaustive source passages before sending. The actual full transcript was independently read and the fresh passages/hash matched the historical full transcript. No exact answer wording or exhaustive summary was required.

| Check | Expected | Actual | Status / evidence under03f |
|---|---|---|---|
| Fresh direct acquisition/storage/full preview | Same video `Ks-_Mh1QhMc`, uncached real captions, complete content/locators | One extraction,201, **sq**,428sections/3292words/18822characters. XML→owned DTO→all preview texts/times/durations match. SHA256 `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98` | PASS; `source.json`, `returned-transcript.xml`, `source-preservation.json`, `upstream.jsonl`, `import.png` |
| Full-source setup | Ready before asking | Browser ready **3458ms** after Start; complete preview retained | PASS; `question-1.log` |
| Summary | Concise attribution and every material claim supported by associated matched excerpts | Provider terminal completed,386output tokens. **3unconfirmed units,0references; first unit has no readable claim,2later claims remain readable.** No timestamps/links rendered as grounded. Broad body/self feedback and sharing themes occur in the full transcript, but the emitted associations lack matched excerpts; daily/practice/tool-not-gimmick/fairness qualifications are not established by displayed evidence | **FAIL**; full safe rendered output, per-claim support review and actual source passages in `answer-checks.json`, `question-1.log`, `answer-1.png` |
| Princeton follow-up |20minutes,20people, supported by actual segment355 at1040.594s | Provider terminal completed,101output tokens; **warning-only, no readable factual answer and no reference.** Actual supporting passage exists in the fresh source. Underlying model facts are not observable from the sanitized projection | **FAIL evidence; factual correctness NOT_ASSESSABLE**; `answer-checks.json`, `followup.log` |
| Response observation | Each≤45s | Summary **3323ms**, follow-up including Stop **1906ms**; browser wall-clock observations, not provider latency accounting | PASS; same logs |
| Stop retention | Received text/warnings survive | Four turns remain; both readable summary claims and all warnings retained exactly. No raw markup rendered | PASS for received projection; does not prove preservation of unparsed raw claims; `answers-after-stop.png`, `cleanup-browser.json` |
| Preview/removal/invalid URL | Full preview after Stop; only owned source removed | Full preview equality; malformed URL zero API requests; DELETE200 then ownGET404 | PASS; `cleanup-browser.json`, `removed.png` |

There are **zero displayed evidence timestamps/links** to validate in this live run. This is not a vacuous citation pass: all-warning answers fail acceptance. Synthetic tests establish stored-time/link resolution for actual matched pairs. The live run does not demonstrate that successful path. No raw provider output was retained outside the existing memory-only lifecycle, so the exact parse-versus-ID-versus-quote failure category is **UNKNOWN**; do not invent it. Completed386/101token responses do not establish an output-cap failure. The missing first claim/follow-up text is a material live limitation of this strict projection. No further model call or post-live product correction was made.

## Ledger, cleanup and acceptance mapping

NEW03F ledger closed: maximum$0.25estimated /2sessions /4responses; actual **1session /2responses /1extraction**, **$0.158reserved**, no second session or automatic retry. Each response reserves$0.079 using full128000uncached input tokens plus512output ($0.0780288 rounded up). This is an operator estimate, not a provider-enforced dollar cap. Safe UI reported386+101output tokens; input/cached usage and actual billed USD remain **UNKNOWN**. `ledger.json` records reservations before session/questions and final failed status.

Source removed through normal owned UI/API; browser closed; identity-checked server PID17616 stopped. Windows child exit4294967295/parent exit1 is deliberate forced cleanup. Port3133 rebound successfully; private files unchanged, no private `.env` copied; application/test/script hashes match the final build. Expected console entries are the initial anonymous-visitor bootstrap401 and intentional cleanupGET404; no assertion of a console with zero errors. `cleanup.json`, `process.json`, `process-exit.json`, command ledgers and hash audit retain evidence. Screenshots/full source/full safe answer evidence remain ignored under `artifacts/local/03f/` (browser test captures nested there).

| Criterion | Decision |
|---|---|
| Small scoped contract, exact owned-source membership, trusted timestamps/links, bounded parser and admission version binding | Implemented; synthetic/registry tests PASS |
| Pending natural text, incomplete/invalid distinction, no raw JSON, Stop/stale/source isolation | Synthetic and rendered-state tests PASS; live **unparsed first/follow-up claim loss remains a limitation** |
| Full captions, fast setup, genuine text streaming, Stop, PDF/voice preservation | Scoped checks PASS; no general voice/device claim |
| Same-video factual and semantic summary plus follow-up, with useful matched references | **FAIL / unfinished**; no all-warning acceptance |
| Budget, one owned visitor, no deployment/admin/extra calls, cleanup | PASS within bounded allocation |

Return to PM with **READY_FOR_REVIEW for partial implementation and failed-live evidence**. No general citation-reliability claim or original Step03/07/10 completion. A future correction needs its own bounded PM decision and enough safe diagnostic evidence to distinguish contract parsing from ID/quote mismatch before choosing a correction; none is assigned or implemented here. Hosted YouTube, YouTube voice, physical phones/audio and later release gates remain open. No phone test requested.
