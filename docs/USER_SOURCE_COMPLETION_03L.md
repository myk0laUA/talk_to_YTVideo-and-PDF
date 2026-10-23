# Task 03L — remaining user-source checks

**PM review22October2026: partial evidence and required stop ACCEPTED; accuracy/cutoff acceptance NOT achieved.** Verified3delivery/142evidence hashes and freeze seal. Read exact answers and checked PDF physical12 own-ball timing plus video lecturer's M/Harrington contrast against saved source. Uphold two larger video PASS results, Mini failures and larger PDF-detail FAIL: the question expressly asks when balls are spotted and its frozen key includes the own-ball exception. This is not an optional summary omission; larger's end-of-turn statement lacks the applicable exception. Completed421tokens is below2048, so no cap increase is justified. Recomputed six-call cost$0.4428538; ledger CLOSED/resources closed. Two real-provider PDFapp checks remain NOT_RUN. No PM generation, product change or deployment. No new experiment/task allocated automatically; short-source reliability, model-selection policy and livePDFapp acceptance remain unresolved.

**READY_FOR_REVIEW — partially executed; mandatory stop.** Six new direct responses completed in the frozen order. Video summary and technical detail: Mini **FAIL**, larger **PASS**. PDF detail: Mini **FAIL**, larger **FAIL**. The larger PDF answer omits the explicitly required 8-ball own-ball spotting exception, triggering the brief's whole-batch stop. Both real-provider PDF app checks are **NOT_RUN**. No retry, prompt/cap/model change, product patch, deployment or further spend follows. PM owns acceptance and next sequencing; Steps 07/10/13 remain open.

Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, preserved dirty arrival tree. Reused accepted local root production build **`z-ZMCK6ul_aC9cv1h0_TM`**; no rebuild or commit. All 242 accepted product/test/build-input hashes match 03K, and 539 copied build files match the root. Pinned executable `.tools/node-v24.22.0-win-x64/node.exe` reports Node **24.22.0**; its bundled npm reports **11.19.1**. Default shell Node26.5.0/npm12.0.1 were inspected but not used for task execution. Only this report, `PROJECT_STATE.md`, and `TESTING.md` are delivery changes; helpers and raw evidence remain ignored under `artifacts/local/03l/`.

## Freeze and independent source review

New freeze SHA256 **`7020b0b34121ce6850c503a4c06b9599ffe40be5d43216dbd7b368356a6ae46d`** (`frozen.json`, `freeze-seal.json`). Prior frozen file remains **`058b0cdc408fc0d839262e56e1f86fcc93cc45a188ff12338bf4f21ff9dbd95c`**. Source bytes, original questions, support passages, expected meanings, acceptable criteria, ambiguity notes, empty histories and original rubric are copied unchanged. Only accepted text output settings/revisions and the new task/order/reservations differ. All prior 03J-user/03K evidence and closed ledgers are preserved. The freeze includes input, build and runtime-helper hashes; preflight verifies these before every live reservation.

| Complete source | Full-text SHA256 | Sections / messages | Accepted input estimate |
|---|---|---|---|
| APA booklet, 22 physical PDF pages | `da590b29bdd6ca14eedac9bcafa403d0707a009aabc63c8e5bdc70ef952589cc` | 22 / 22 | 9,620 |
| Introduction to Poker Theory, complete English captions | `879fc9a7cdc17cb7c1cc2cf00adf72c120776cb556854895db64fd8c0db55195` | 750 / 10 | 40,042 |

PDF file SHA256 remains `4b481b042e6b4e084fbb5982c85460395ae335d1f6a196cf4c1b6d2eb931a9e2`. Source snapshot file identities are in `frozen.json`; original provenance is [USER_CALIBRATION_FIXTURES.md](USER_CALIBRATION_FIXTURES.md). Reconstructed ordered fragments equal complete source text byte-for-byte. The video begins at 0.08 seconds and includes its closing sign-off/applause; the user's 1121-second navigation pointer does not clip it. Token estimates are the existing surrogate, not measured provider input or capacity admission.

Before any call, independently read all 22 extracted PDF pages and 750 captions and checked the existing support keys. Relevant rules are textual; no new PDF rendering was needed. Physical PDF page 8 / printed 7 gives 8-ball break-scratch loss; physical 9 / printed 8 gives 9-ball respot and opponent turn; physical 12 / printed 11 gives delayed 8-ball spotting, the **own-ball exception**, 8-ball floor loss, and immediate 9-ball spotting; physical 20 / printed 19 gives opponent ball-in-hand for a complete miss at the 8-ball. Video segments 231–246/267–343 explain practice, 431–500 maximum-loss effective stack, 618–700 M/blind ratios/antes, and 720–745 the Harrington contrast. Embedded source instructions were treated as data. No answer-generated key or paid grader was used.

The exact questions and copied expected meanings appear below with each answer. Full support passages/ambiguities are retained in the freeze. Citations are optional under the original rubric. Useful concise overview coverage is allowed; detailed PDF spotting exceptions are expressly required by its frozen acceptable criterion.

## Verification and actual commands

All task commands below use the pinned Node executable. `node artifacts/local/03l/run.mjs ARGS` logs the exact executable, argv, working directory, UTC start/end, exit and full output to `commands.jsonl` and a task log. No unchanged full-suite rerun, dependency installation, production implementation edit or voice change was performed.

| Check / command after runner | Environment / expected result | Observed / exit / evidence |
|---|---|---|
| `--conditions=react-server artifacts/local/03l/setup.mjs --baseline` | Local read-only identity/private-file hashes | PASS0; `baseline.json`; 609 arrival entries |
| `--conditions=react-server artifacts/local/03l/freeze.mjs --freeze` | Offline unchanged source/question/key/input/build/policy identities and conservative new reservations | Final PASS0; freeze/seal/build-parity. Initial attempt exit1 on a directory link during build-file discovery; corrected task-only walker to hash regular files before any live call. No product changes. |
| `--conditions=react-server artifacts/local/03l/dry.mjs` | Network-denied fake direct/video/PDF success/failure; built-app PDF both routes and injected deletion failure; budget/closed/order/unknown-usage/audio gates | PASS0; `offline-results.json`; six child checks. Success exits0, intentional direct-provider and DELETE failures exit1. Real attempts0 before batch. |
| `--require ./artifacts/local/03l/app-network.cjs --conditions=react-server artifacts/local/03l/direct.mjs ID` | Real OpenAI Realtime, one fresh session/response, exact model/2048/minimal/text/disabled-truncation ACKs, complete source, deadlines, usage, socket closure | All six IDs below protocol PASS0. Semantic grades are independent. `ID-result.json`, raw command logs. |
| `--conditions=react-server artifacts/local/03l/grade.mjs ID` | Offline source review using frozen key; no generation | Six PASS0 grading commands; grades 2PASS/4FAIL; `ID-review.json`, `ID-score.json`. Last grade closes ledger on larger material omission. |
| `--conditions=react-server artifacts/local/03l/finish.mjs` | Offline usage/cost/resource/NOT_RUN reconciliation | PASS0; `ledger.json`, `results-summary.json`, `cleanup.json`, `official-prices.json` |
| `--conditions=react-server artifacts/local/03l/audit.mjs`; `git diff --check` | Offline unchanged arrival/product/private/prior evidence/copied build/questions/answers; additive docs only | PASS0; `preservation.json`, `changed-files.sha256.json`, `evidence.sha256.json`, `diff-check.log` |
| Real-provider built-app PDF detail, upload/PostgreSQL/deployed/physical phone/audio | Two real-provider app cells conditional on preceding quality gates; other environments outside scope | **NOT_RUN** after mandatory stop. No real app source/server/browser created. |

Live direct IDs, exact order: `video-summary-mini`, `video-summary-large`, `video-detail-mini`, `video-detail-large`, `pdf-detail-mini`, `pdf-detail-large`. Each has empty prior history and exactly one question/one `response.create`/one provider `response.created`. No PDF summary was repeated. Sources/settings/question match within each pair. Both session ACKs check exact instructions/model, output2048, minimal reasoning, text-only output and disabled truncation; every source item ACK matches sent content. All six terminals are `completed`, status details null, and below the cap. This establishes protocol delivery, not semantic accuracy.

### Built-app offline harness evidence, explicitly simulated

Before live calls, prepared task-only instrumentation from 03J-user plus accepted 11D `captureVisible`, `stopSession`, and `removeSource` helpers against the accepted 03K build. Runtime directory has no `.env*`; server environment has unusable synthetic DB address and fake key for these dry runs. Network denial permits local traffic only. No fake provider ran in live direct mode; no live app mode ran.

Both simulated app routes use fresh anonymous owners and seeded in-memory PDF rows, all 22 actual extracted pages, test-only cutoff 1,000,000 (Mini) or 1 (larger). PDF attachment/upload response is explicitly intercepted; conversation, stream, Stop, source GET and DELETE use real built-app routes with synthetic storage/provider boundaries. These are **not PDF upload or PostgreSQL proofs**. Checks pass: complete preview DOM parity/beginning-middle-end screenshots; 22 source ACKs; exact selected model/current2048/minimal/text/truncation ACKs; visible synthetic answer equals terminal synthetic text; Stop HTTP200 and transcript retention; real Remove→Confirm remove DELETE200→GET404; sourceRows0, provider opens=closes=1, active/open sockets0, registry sessions/attached/pending0, browser/context closed, server exited, ports3142/3143 released. Stop's replay tombstone is discarded at process exit, not an active session.

Project Playwright CLI0.1.22 attaches to the task Chromium CDP endpoint, captures a snapshot and detaches, all exit0, in both positive cases and the negative case. Exact CLI argv/exits/logs/snapshots and PNGs are under `dry-app-mini/`, `dry-app-large/`, and `dry-app-delete-failure/`. The fake larger-answer screenshot was visually inspected; it visibly contains the synthetic answer and real question. No physical-device claim follows.

Injected DELETE503 deliberately yields subsequent GET200, exits1, and closes sockets/context/browser/server. Its one in-memory row is discarded with the process; no persistent row remains. All fake ledgers are closed. All six real direct sockets also close; no real app resources were created. Final bind probes confirm both ports free.

## Costs, usage and timing

Before freeze/calls, used OpenAI Docs official-domain search followed by opening [pricing](https://developers.openai.com/api/docs/pricing), [Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), and [larger](https://developers.openai.com/api/docs/models/gpt-realtime-2.1). USD per1M text input/cached/output remains Mini **0.60/0.06/2.40**, larger **4/0.40/24**. Conservative reserve per fresh session is 128,000 uncached input + 2,048 output: Mini **$0.0817152**, larger **$0.561152**. Four of each would reserve **$2.5714688≤$3**. Each reservation was persisted before socket creation; order/closed-ledger/previous-protocol/grade/resource/cost checks prevent retries or continuation after larger FAIL.

Ledger **CLOSED** after 6 sessions / 6 response starts / 6 provider response-created events. Attempt reservations **$1.9286016**; usage-derived estimate **$0.4428538**. Totals: **180,110 input**, **0 cached**, **2,359 output**, **155 nested reported reasoning**, no audio/image tokens. Bill `output_tokens` once; do not add nested reasoning again. Invoice/billing **UNKNOWN**. Unused allocation cannot be reused. Prior 03K and 03J-user ledgers remain closed unchanged.

Live UTC **2026-10-22T06:52:43.107Z–06:56:18.661Z** (22 October Toronto). Times below are direct socket timings, not app/phone/audio latency.

| Source / question / model | Semantic | Input / output / reasoning | First text / terminal / session ms | Estimated USD |
|---|---|---|---|---|
| Video summary / Mini | FAIL | 40125 / 359 / 41 | 1324 / 3127 / 6065 | 0.0249366 |
| Video summary / larger | PASS | 40125 / 305 / 11 | 1570 / 4083 / 5706 | 0.1678200 |
| Video detail / Mini | FAIL | 40139 / 554 / 17 | 1076 / 3836 / 5484 | 0.0254130 |
| Video detail / larger | PASS | 40139 / 336 / 15 | 1829 / 4462 / 5996 | 0.1686200 |
| PDF detail / Mini | FAIL | 9791 / 384 / 56 | 759 / 2394 / 4603 | 0.0067962 |
| PDF detail / larger | FAIL | 9791 / 421 / 15 | 798 / 3874 / 6088 | 0.0492680 |
| Built app PDF detail / Mini | NOT_RUN | — | — | — |
| Built app PDF detail / larger | NOT_RUN | — | — | — |

## Acceptance mapping and remaining work

| Criterion | Evidence / outcome |
|---|---|
| Only previously unrun frozen cells; unchanged full sources/keys/instructions/settings except accepted2048 policy | PASS; freeze/reconstruction/242inputs; no PDF summary rerun or new corpus |
| New manifestations/hashes and independently reviewed support before calls | PASS; freeze seal/source review above, exact original key equality audited |
| Fixed direct ordering, independent fresh sessions, one response/model | PASS for all six direct cells; exact ACKs/source equality/usage/closed sockets |
| Actual local built-app PDF detail both models with real provider | **NOT_RUN**; mandatory stop after larger direct detail FAIL; fake harness evidence kept separate |
| Meaningful semantic evaluation, including exceptions/instructor viewpoint | Completed; 2PASS/4FAIL. Larger PDF omission is material under the original explicit own-ball criterion. No forced PASS or new citation criterion. |
| New ≤$3 / ≤8 allocation, no retries, reserve-before-call, deadlines, close on stop | PASS; closed6/6ledger, all under60s/session and30s/answer; no spending after stop |
| Offline fake success/failure including PDF teardown; resource closure | PASS; six dry checks/negative failures/final free ports; live direct sockets6closed |
| No product/dependency/voice/sharedDB/deployment changes | PASS; baseline/preservation/changed-file hashes. Only three delivery docs changed. |

Remaining: both real-provider PDF app cells, short-source calibration region, source-fidelity quality blockers, and broader delivery gates. No numeric size cutoff is approved: Mini already failed near9.6K estimated input, and the short region remains untested. These two larger video passes establish only those question/source samples; the larger PDF detail failure rebuts blanket reliability. Historical512failures and previous Mini errors are unchanged. Nothing here proves PDF upload/PostgreSQL, physical-phone/audio, deployed routing or whole-release completion.

PM should review exact answers/claims below and decide the next gate. Any future actual-app check requires a newly issued bounded task/allocation, fresh synthetic owner/source, current frozen identities, and the prepared real-provider runtime: inspect all22pages, Start text session, send the exact frozen detail question, compare visible/terminal text, Stop200, Remove/Confirm DELETE200→GET404, then close all resources. Do not reopen this ledger or continue automatically.

Delivery SHA256s (including this report) are recorded externally in `artifacts/local/03l/changed-files.sha256.json`; complete ignored evidence hashes are in `evidence.sha256.json`. Source snapshots, full terminal answers, claim reviews, usage, commands/exits, screenshot/CLI evidence and cleanup are retained locally for PM review. No secrets are included.

## Exact answers and claim review

The following terminal text is copied verbatim from each result file. Claim counts are discrete review findings, not calibrated accuracy percentages; coverage omissions are separately listed. Frozen questions/expected meanings precede each answer.

### video-summary-mini — FAIL; protocol PASS; completed

**Question:** Give a useful overview of this whole introductory lecture: what the course is trying to teach, how its play and analysis are organized, and the main poker concepts and decision-making perspective introduced.

**Frozen expected meaning:** Instructor introduces poker theory/analytics focused on live tournament decisions, play-money private league, beginner access/credit and repeated daily turbos plus larger tournaments. Save hand histories for analysis (cannot recover uncaptured play-money histories); PokerTracker analytics and universal replayer visualization. Framework: fundamental unexploitable/basic concepts first, practice fast real decisions/rules of thumb, advanced adjustments/metagame later. Value/ROI with hourly earnings tradeoff, preflop emphasis and fast practice. Effective stack caps chips at risk and changes deep/shallow hand play. Tight-aggressive solid baseline, loose-aggressive may win depending opponents, passive types criticized. M=effective stack/(blinds+antes), accounts differing blind ratios/antes and relative blind importance; instructor emphasizes blind value rather than Harrington survival/when-to-move/effectiveM. Q and effectiveM described but instructor does not generally use them. A useful overview covers orientation/practice/tools plus core technical concepts and instructor viewpoint; not every administrative detail or named sponsor required.

**Frozen acceptable criterion:** English faithful concise paraphrase; central conceptual coverage, not every subtheme/numerical detail.

```text
Based on the course text, the lecture is trying to teach a structured approach to understanding and improving poker play through analysis and decision-making, especially for online tournaments.

From the source, the course is framed as a poker analytics class: it introduces tools and a method for analyzing hands and making consistent choices under pressure. The instructor repeatedly emphasizes basic strategy, pre-flop analysis, and an emphasis on stack and blind dynamics—how much you can lose relative to your stack and how that changes when you should act.

Factually stated, the lecture focuses on using analytics tools like PokerTracker and a hand replayer to analyze hand histories, and it emphasizes improving the decision-making framework. It also introduces the idea of organizing play into fundamentals, practice, and advanced concepts—first understanding how to think, then implementing it efficiently.

Inferred from the source content, the main concepts and decision-making perspective include the importance of effective stack size, blinds, and why they matter more than raw chip counts. Another key concept is the M-ratio (effective stack divided by blinds/antes) as a way to gauge how critical the next move is in a tournament. I’m drawing that inference from the discussion of M-ratio and how decision pressure changes as stacks shrink.

Overall, the course aims to move players toward being “unexploitable” and strategic, using analytics to reveal patterns in play and to make decisions that maximize value efficiently, rather than relying on intuition alone.

If you want, I can also summarize it into a quick “study checklist” for what to focus on next.
```

**Review:** Misstates primary course emphasis as online tournaments, omits the requested actual league/tournament organization, and substitutes move-timing framing for the lecturer's explicit M interpretation. A labeled inference is not supported when the lecturer directly distinguishes his view from that framing.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| especially for online tournaments | FAIL | video192-199,344-399 | Online league is the practice/analytics vehicle; instructor explicitly emphasizes live tournaments. |
| basic strategy, pre-flop analysis | PASS | video231-246,267-343 | Named subjects and practice framework are source-supported. |
| PokerTracker and a hand replayer to analyze hand histories | PASS | video100-146,407-429 | Accurate tool/hand-history purpose. |
| fundamentals, practice, and advanced concepts | PASS | video267-343 | Accurate sequence at a useful level. |
| M-ratio (effective stack divided by blinds/antes) as a way to gauge how critical the next move is | FAIL | video618-700,720-745 | Formula shorthand is acceptable, but lecturer explicitly prefers relative blind value rather than when forced to move; labeled inference does not resolve this material reversal. |
| “unexploitable” and strategic | PASS | video288-301,344-399 | Accurate basic framework/value perspective. |

Claim findings: 4 supported, 2 failed, 0 unresolved.

- orientation/live course focus: **FAIL**
- play organization/daily turbos and larger tournaments: **FAIL** — No substantive explanation of actual play organization.
- analysis/hand-history tools: **PASS**
- fundamentals/practice/advanced progression: **PASS**
- core concepts/instructor decision perspective: **FAIL** — M framing wrong; style and ROI/hourly themes omitted, with no exhaustive list requirement imposed.

Limits: Completed359output; no cutoff/truncation or provider-protocol failure. Offer to make checklist is an offer, not unsupported source advice. No mandatory citations scored.

Answer SHA256: `2cfc3c65c3ad5a70f918cfcc56fd3b02713a284fabbee3d17c34ad7b999f5bed`. Exact source-bound score: `artifacts/local/03l/video-summary-mini-score.json`.

### video-summary-large — PASS; protocol PASS; completed

**Question:** Give a useful overview of this whole introductory lecture: what the course is trying to teach, how its play and analysis are organized, and the main poker concepts and decision-making perspective introduced.

**Frozen expected meaning:** Instructor introduces poker theory/analytics focused on live tournament decisions, play-money private league, beginner access/credit and repeated daily turbos plus larger tournaments. Save hand histories for analysis (cannot recover uncaptured play-money histories); PokerTracker analytics and universal replayer visualization. Framework: fundamental unexploitable/basic concepts first, practice fast real decisions/rules of thumb, advanced adjustments/metagame later. Value/ROI with hourly earnings tradeoff, preflop emphasis and fast practice. Effective stack caps chips at risk and changes deep/shallow hand play. Tight-aggressive solid baseline, loose-aggressive may win depending opponents, passive types criticized. M=effective stack/(blinds+antes), accounts differing blind ratios/antes and relative blind importance; instructor emphasizes blind value rather than Harrington survival/when-to-move/effectiveM. Q and effectiveM described but instructor does not generally use them. A useful overview covers orientation/practice/tools plus core technical concepts and instructor viewpoint; not every administrative detail or named sponsor required.

**Frozen acceptable criterion:** English faithful concise paraphrase; central conceptual coverage, not every subtheme/numerical detail.

```text
Source-based overview: This intro lecture presents an MIT course on poker analytics. The instructor explains that the course blends play and data analysis, using a private PokerStars league (play-money) to generate hand histories, then analyzing them with tools like PokerTracker and a hand-history replayer. A stated goal is to help students learn to play well without punishing beginners, so there’s a beginners league and a more competitive path, plus weekly “major” tournaments with prizes and a final live event.

Source claims say the structure mirrors online multi-table tournament life: frequent daily “grind” events and more important, different big events. Gameplay is organized around turbos for quick practice and heavy focus on pre-flop decisions, and students can multi-table if they want. The analytics side relies on saving hand histories, loading them into software, and using stats to learn faster than live play alone.

Main concepts introduced include stack size, effective stack (the practical amount you can lose in a hand), and Harrington’s M ratio (effective stack divided by blinds and antes). The instructor’s perspective (source claim) is about playing in an “unexploitable” way, focusing on ROI and practical decision-making, and starting from solid “tight-aggressive” fundamentals before advanced adjustments. My inference: overall, it’s a pragmatic, data-informed approach—practice, measure, and refine decisions, especially pre-flop, with tools and a structured league.
```

**Review:** Useful whole-lecture overview accurately covers play/analysis organization, core concepts and the instructor's practical framework. Concise coverage may omit individual administrative details and subthemes under the frozen rubric.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| private PokerStars league (play-money) | PASS | video19-40,41-99 | Accurate course gameplay vehicle. |
| generate hand histories, then analyzing them with tools like PokerTracker and a hand-history replayer | PASS | video100-146,407-429 | Correct analytics workflow. |
| without punishing beginners | PASS | video24-40 | Faithful paraphrase of accessible gameplay credit; no requirement to enumerate10tournaments. |
| weekly “major” tournaments with prizes and a final live event | PASS | video180-228 | Accurate league organization. |
| frequent daily “grind” events and more important, different big events | PASS | video204-230 | Accurate rationale/structure. |
| turbos for quick practice and heavy focus on pre-flop decisions | PASS | video231-265 | Source-supported purpose. |
| saving hand histories, loading them into software, and using stats to learn faster than live play alone | PASS | video100-179 | Accurate analysis perspective. |
| effective stack (the practical amount you can lose in a hand) | PASS | video431-500 | Correct maximum-loss interpretation. |
| Harrington’s M ratio (effective stack divided by blinds and antes) | PASS | video604-645 | Correct ratio and naming; answer does not assert he invented it. |
| “unexploitable” way, focusing on ROI and practical decision-making | PASS | video267-343,344-399 | Supported framework/value perspective. |
| solid “tight-aggressive” fundamentals before advanced adjustments | PASS | video267-343,501-595 | Combines explicit recommendation with learning progression. |
| My inference: overall, it’s a pragmatic, data-informed approach | PASS | video100-179,267-343 | Clearly labeled synthesis, consistent with lecture. |

Claim findings: 12 supported, 0 failed, 0 unresolved.

- orientation/play organization: **PASS**
- hand histories/analysis tools: **PASS**
- technical concepts: **PASS**
- instructor/practice perspective: **PASS**

Limits: Does not enumerate hourly earnings tradeoff, effectiveM/Q or lost-history irrecoverability. These omissions do not defeat this useful overview; no exhaustive subtheme rubric imposed. Completed305tokens. No general larger-model reliability inference.

Answer SHA256: `b400ffb63d28924507647e9169a9923708f8936676616752503de748c1d1c277`. Exact source-bound score: `artifacts/local/03l/video-summary-large-score.json`.

### video-detail-mini — FAIL; protocol PASS; completed

**Question:** Why does the lecturer emphasize pre-flop practice, and how do effective stack and M help frame those decisions? Explain why he prefers M to counting big blinds, and how his interpretation differs from Harrington's use of effective M at a short-handed table.

**Frozen expected meaning:** Daily turbos prioritize preflop because instructor sees much novice value lost there and live play involves many preflop decisions; practice applying concepts quickly without calculators. Effective stack is maximum chips one could lose in hand, illustrated by shorter opposing stack limiting1500-versus300 to300; same queens differ deep/shallow. M=effective stack/(small blind+big blind+antes), useful unlike counting BB because blind ratios vary and antes matter, also normalizes scaled chip/blind levels. Harrington survival framing: rounds you could fold through, when forced to move; effectiveM reduces M proportionally for short-handed tables since blinds recur sooner, equivalent ten-handed survival. Instructor instead uses M to assess importance/value of blinds relative to stack for decisions, not forced-move timing; says he/community do not really use effectiveM. HighM blinds relatively insignificant, lowM winning them important. No requirement to calculate or invent precise effectiveM formula absent transcript.

**Frozen acceptable criterion:** Concise clear explanation connecting practice, chips-at-risk, denominator/antes and the instructor-versus-Harrington interpretation.

```text
From the source, the lecturer emphasizes pre-flop practice because it’s where a lot of value can be lost, and it’s the part that’s hardest to “reason about” live (you don’t have all the info and you’re under time pressure). Pre-flop also shapes the rest of the hand, so getting it right is a big jump in overall skill.

Source claims: “turbos encourage you… pre-flop,” and “this is the area where value ad is going to be… getting this right.”

In terms of framing, he uses effective stack and M as a way to judge how important the blinds are relative to the real action. Effective stack tells you how many chips you could lose in one hand (the tighter decision boundary), and M tells you how much “room” you have left to play before you’re in a critical situation. His claim is that the decision depends much more on the smallest stack than on counting big blinds, because that’s what determines how quickly the action will be forced.

Source claims: “effective stack is the relevant stack for decisions,” and “M is say the percentage of your stack that is the blinds and the antes, and how many rounds you can survive folding.”

He prefers M to big blind counting because big blinds don’t capture the influence of antes or the fact that you’re in a multi-handed situation; “big blinds” can mislead you about how much time you actually have to operate before you must act aggressively. His view is that M better tells you the strategic weight of the situation.

Source claims: “big blinds is not indicative of anything,” and “M is how important the blinds are to your stack… a good way to talk about hands.”

Regarding Harrington’s effective M at a short-handed table, his interpretation differs in application: the lecture frames M as a general “decision pressure” tool, emphasizing when you need to move and how much of your stack is tied to blinds/antes. He notes that Harrington’s M is a ratio for when to make moves, but this lecturer focuses more on whether M makes the blinds matter or not—especially from a broader daily/structural perspective of the tournament, not just at a specific short-handed moment.

Source claims: “effective M… reduces your M proportionately when short-handed… it’s more about timing moves.”

My inference: the lecturer is using M as a more general situational metric, and he’s skeptical of reliance on big-blind counts because they don’t fully incorporate ante structure, table size, and action pressure—while Harrington’s approach is more move-oriented and specific to short-handed game dynamics.
```

**Review:** Despite some correct definitions, repeatedly frames lecturer's M as forced-action timing, substitutes multi-handed/table-size rationale for varying blind ratios, and omits the explicit blind-ratio explanation. These are central requested distinctions, not harmless wording differences.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| where a lot of value can be lost | PASS | video231-246,267-277 | Accurate preflop emphasis. |
| you don’t have all the info and you’re under time pressure | PASS | video325-343 | Accurate practice constraint. |
| Pre-flop also shapes the rest of the hand | FAIL | video231-246,267-343 | Plausible generic poker rationale is attributed as source explanation without support or inference label. |
| how important the blinds are relative to the real action | PASS | video658-684 | Loose but recognizable relative-blind-value interpretation. |
| how many chips you could lose in one hand | PASS | video431-500 | Correct effective stack definition. |
| M tells you how much “room” you have left to play before you’re in a critical situation | FAIL | video648-684,736-745 | Attributes survival/forced-move view to instructor despite explicit contrast. |
| big blinds don’t capture the influence of antes or the fact that you’re in a multi-handed situation | FAIL | video618-645 | Antes supported; multi-handed claim replaces explicit varying small/big blind ratios, which are absent. |
| emphasizing when you need to move | FAIL | video653-661,736-745 | Directly reverses lecturer's stated application, even though later sentence partially recovers relative blind value. |
| reduces your M proportionately when short-handed | PASS | video720-745 | Correct reduction; does not clearly explain increased blind frequency/equivalent ten-handed survival. |

Claim findings: 5 supported, 4 failed, 0 unresolved.

- preflop practice rationale: **PASS** — Main rationale present with unsupported added claim separately failed.
- effective-stack maximum loss: **PASS**
- M formula and blind ratios/antes: **FAIL** — No clear correct ratio; varying blind ratios absent.
- Harrington versus lecturer/short-handed effect: **FAIL**

Limits: Completed554tokens;10source ACKs. No output-cap failure. Source-claim quotation marks contain paraphrases, but quotation exactness is not an added mandatory scoring criterion; wrong substantive attributions sustainFAIL.

Answer SHA256: `3ba7efb3cb914e5629fae8df5679b4f83a86ecefde14e63bf23c2d47821df38f`. Exact source-bound score: `artifacts/local/03l/video-detail-mini-score.json`.

### video-detail-large — PASS; protocol PASS; completed

**Question:** Why does the lecturer emphasize pre-flop practice, and how do effective stack and M help frame those decisions? Explain why he prefers M to counting big blinds, and how his interpretation differs from Harrington's use of effective M at a short-handed table.

**Frozen expected meaning:** Daily turbos prioritize preflop because instructor sees much novice value lost there and live play involves many preflop decisions; practice applying concepts quickly without calculators. Effective stack is maximum chips one could lose in hand, illustrated by shorter opposing stack limiting1500-versus300 to300; same queens differ deep/shallow. M=effective stack/(small blind+big blind+antes), useful unlike counting BB because blind ratios vary and antes matter, also normalizes scaled chip/blind levels. Harrington survival framing: rounds you could fold through, when forced to move; effectiveM reduces M proportionally for short-handed tables since blinds recur sooner, equivalent ten-handed survival. Instructor instead uses M to assess importance/value of blinds relative to stack for decisions, not forced-move timing; says he/community do not really use effectiveM. HighM blinds relatively insignificant, lowM winning them important. No requirement to calculate or invent precise effectiveM formula absent transcript.

**Frozen acceptable criterion:** Concise clear explanation connecting practice, chips-at-risk, denominator/antes and the instructor-versus-Harrington interpretation.

```text
Source claim: He emphasizes pre-flop practice because, in his view, that’s where most value is lost—people “screw up pre-flop” a lot, and live play makes it hard to consistently do the “right” thing. Turbos push players into many pre-flop decisions quickly, which he thinks is especially useful for newer players.

Source claim: Effective stack is used because decisions depend more on how many chips you can actually lose in a hand than on your full stack. He describes it as essentially the most you can lose in that hand, which is simpler to think about than a formula.

Source claim: M (effective stack divided by the sum of blinds and antes) frames decisions by showing how important the blinds are relative to your stack—how many rounds you can “survive” and how much pressure the blinds apply.

Source claim: He prefers M over counting big blinds because big-blind counts can be misleading: blind structures aren’t always a neat 1:2 and big-blind counts don’t account for antes, which can dramatically change how strong a stack really is.

Source claim: Harrington’s “effective M” adjusts M downward when you’re short-handed, because you pay blinds more often and therefore have less time before you must act.

Source claim and his stated interpretation: He looks at M as a measure of the blinds’ value relative to the stack, not primarily as a “when must I make a move” trigger. He says he doesn’t really use effective M, even if it makes sense from Harrington’s perspective.
```

**Review:** Accurately explains preflop practice, maximum-loss effective stack, M denominator, varying blind ratios/antes, and the specific lecturer-versus-Harrington distinction. Survival wording in the initial M paragraph is mathematically/source-supported and expressly distinguished from lecturer's decision use in the final paragraph.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| that’s where most value is lost | PASS | video231-246,267-277 | Faithful attribution of instructor's judgment. |
| Turbos push players into many pre-flop decisions quickly | PASS | video231-265,325-343 | Accurate practice emphasis and speed. |
| the most you can lose in that hand | PASS | video431-500 | Correct effective-stack definition. |
| M (effective stack divided by the sum of blinds and antes) | PASS | video618-645 | Correct formula. |
| blind structures aren’t always a neat 1:2 and big-blind counts don’t account for antes | PASS | video627-645 | Both requested reasons preserved. |
| adjusts M downward when you’re short-handed, because you pay blinds more often | PASS | video720-740 | Correct adjustment and rationale; exact formula not required. |
| blinds’ value relative to the stack, not primarily as a “when must I make a move” trigger | PASS | video653-684,736-745 | Correct lecturer/Harrington contrast. |
| he doesn’t really use effective M | PASS | video741-745 | Accurate lecturer position. |

Claim findings: 8 supported, 0 failed, 0 unresolved.

- preflop practice rationale: **PASS**
- effective-stack maximum loss: **PASS**
- M formula/blind-ratio and ante reasons: **PASS**
- short-handed adjustment and lecturer contrast: **PASS**

Limits: No worked numerical stack example or proportional effectiveM equation; both nonmandatory when concepts/rationale faithfully conveyed. Completed336tokens. One sample only.

Answer SHA256: `d7241b34fa35e267348c896e81f04854ea8ecc3ff5ddcfda731ba8e0133159ce`. Exact source-bound score: `artifacts/local/03l/video-detail-large-score.json`.

### pdf-detail-mini — FAIL; protocol PASS; completed

**Question:** Under this booklet, compare 8-ball and 9-ball when the game ball is pocketed on a legal break with a scratch, and when an object ball is knocked onto the floor during a shot. Also explain what happens if a player shooting at the 8-ball misses it completely without pocketing the cue ball. State when balls are spotted and whether the game ends or continues.

**Frozen expected meaning:** 8 on legal break with scratch loses.9 on legal break with scratch does not win/end: spot9, opponent turn/ball-in-hand anywhere; other pocketed balls stay down. Off-table object balls spot foot spot or directly behind occupied spot, multiple in numerical order.8 format: after legally pocketing a ball while knocking others off, continue turn, spot other balls at end of turn; own off-table ball when all other own balls pocketed;8 knocked off is loss.9 format off-table balls immediately spot, including9;9 also respots if pocketed with any foul. Complete miss at8 without cue-ball scratch gives opponent ball-in-hand, not automatic loss. Critical distinction is ball-in-hand vs actual scratch loss and delayed vs immediate spotting.

**Frozen acceptable criterion:** Any clear paraphrase of all three requested scenarios and important8-ball own-ball/8-ball exception; no exact words or required citations.

```text
Great question! Using the booklet, here’s how those situations play out.

When the game ball is pocketed on a legal break with a scratch, in 8-Ball it’s a loss if you pocket the 8-ball on the break and then foul (the booklet says pocketing the 8-ball on the break is a win unless you foul the cue ball, in which case it’s a loss). In 9-Ball, pocketing the 9-ball on the break is a win unless the player scratches; if you scratch, the 9-ball is spotted and the turn passes to the opponent, and the game continues. (Page 7)

If an object ball is knocked onto the floor during a shot, for 8-Ball the ball is not a foul, but it doesn’t stop the player’s turn; it stays off the table until it’s restored, and the player continues shooting their turn. For 9-Ball, the ball is immediately spotted on the foot spot when it gets knocked off the table. (Pages 10–11)

If a player misses the 8-ball completely without pocketing the cue ball, that is a normal miss; the turn simply passes to the opponent (or the table remains open depending on other conditions), and you do not win without legal contact on the 8-ball. (Pages 8–9, 19)

So in these cases: balls are spotted when they’re knocked off, and the game either ends on a foul condition or continues with the opponent’s turn if the game ball was legally pocketed but no foul occurred.
```

**Review:** Calls complete miss at8 a normal miss rather than opponent ball-in-hand; unconditionally continues8-ball floor-ball turns, omits required spotting timing/own-ball/game-ball exceptions, and ends with a false general game-continuation rule.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| in 8-Ball it’s a loss | PASS | physicalPDF8/printed7 | Correct8on legal break plus cue-ball scratch loss. |
| the 9-ball is spotted and the turn passes to the opponent, and the game continues | PASS | physicalPDF9/printed8 | Correct9break scratch outcome, but opponent ball-in-hand anywhere is omitted. |
| it doesn’t stop the player’s turn | FAIL | physicalPDF12/printed11 | 8continuation is conditional on legally pocketing a ball;8off table loses. Answer gives unconditional rule. |
| it stays off the table until it’s restored | FAIL | physicalPDF12/printed11 | Fails requested when: ordinarily end of turn, own ball after all other own balls pocketed.8off-table loss absent. |
| immediately spotted on the foot spot | PASS | physicalPDF11-12/printed10-11 | Correct9floor-ball spotting, but9pocketed with foul respot distinction omitted. |
| that is a normal miss; the turn simply passes to the opponent | FAIL | physicalPDF20/printed19note1;17/printed16 | Complete miss at8 is ball-in-hand foul for opponent, not ordinary miss/open-table situation. |
| continues with the opponent’s turn if the game ball was legally pocketed but no foul occurred | FAIL | physicalPDF8-9,20-21 | Legal game-ball pocket without foul wins/ends game, does not continue as stated. |

Claim findings: 3 supported, 4 failed, 0 unresolved.

- 8legal-break scratch loss: **PASS**
- 9legal-break scratch/spot/opponentBIH: **FAIL** — BIHanywhere absent.
- floor-ball delayed8/immediate9/ownball/8loss exceptions: **FAIL**
- complete miss8/opponentBIH/continues: **FAIL**

Limits: Page-citation accuracy not separately required/scored. Completed384tokens, not an output cutoff. No inference of transport/source loss from semantic failures.

Answer SHA256: `9bc1bdbcbd840c5217fde58b78229e70d39425c9313e399d1b8e9f74a88a8773`. Exact source-bound score: `artifacts/local/03l/pdf-detail-mini-score.json`.

### pdf-detail-large — FAIL; protocol PASS; completed

**Question:** Under this booklet, compare 8-ball and 9-ball when the game ball is pocketed on a legal break with a scratch, and when an object ball is knocked onto the floor during a shot. Also explain what happens if a player shooting at the 8-ball misses it completely without pocketing the cue ball. State when balls are spotted and whether the game ends or continues.

**Frozen expected meaning:** 8 on legal break with scratch loses.9 on legal break with scratch does not win/end: spot9, opponent turn/ball-in-hand anywhere; other pocketed balls stay down. Off-table object balls spot foot spot or directly behind occupied spot, multiple in numerical order.8 format: after legally pocketing a ball while knocking others off, continue turn, spot other balls at end of turn; own off-table ball when all other own balls pocketed;8 knocked off is loss.9 format off-table balls immediately spot, including9;9 also respots if pocketed with any foul. Complete miss at8 without cue-ball scratch gives opponent ball-in-hand, not automatic loss. Critical distinction is ball-in-hand vs actual scratch loss and delayed vs immediate spotting.

**Frozen acceptable criterion:** Any clear paraphrase of all three requested scenarios and important8-ball own-ball/8-ball exception; no exact words or required citations.

```text
Here’s what the booklet says, with a couple of inferences clearly labeled.

1) Game ball pocketed on a legal break with a scratch
Source claim (8-ball): If the 8-ball is pocketed on the break, it’s a win unless the player fouls the cue ball; if they do foul, it’s a loss (page 7).
Source claim (9-ball): If the 9-ball is pocketed on the break, it’s a win unless the player scratches; if they scratch, the 9-ball (or another adequate high-numbered ball) is spotted and the turn passes to the opponent (page 8). Inference: the game does not end on that scratched 9-on-the-break because the ball is spotted and play continues.

2) Object ball knocked onto the floor during a shot
Source claim (8-ball): If you legally pocket a ball while also knocking other ball(s) on the floor, it’s still your turn, and those balls are not spotted until your turn ends. If the knocked-off ball is the 8-ball, you lose the game (page 11). Inference: if it’s not the 8-ball, play continues and the ball(s) will be spotted later as described.
Source claim (9-ball): Any balls knocked off the playing surface are immediately spotted on the foot spot; the 9-ball is spotted anytime it’s knocked off the table (other than being pocketed), and also if it’s pocketed and the shooter fouls (page 11). Inference: the game continues unless a separate rule says the game is over.

3) Missing the 8-ball completely (no cue ball pocketed)
Source claim: If a player is shooting at the 8-ball and misses it altogether, they have fouled and the opponent receives ball-in-hand. You do not win because of this foul (page 19). Inference: the game continues with the opponent taking ball-in-hand.
```

**Review:** Material omission in a specifically requested spotting comparison: the frozen key expressly requires the8-ball own-ball exception (spot the shooter's knocked-off ball when all other own balls are pocketed). Answer instead gives only end-of-turn spotting. Opponent ball-in-hand anywhere after9break scratch is also omitted. Mandatory whole-batch stop; two real-provider app cases NOT_RUN.

| Exact claim excerpt | Verdict | Source support | Review |
|---|---|---|---|
| if they do foul, it’s a loss | PASS | physicalPDF8/printed7 | Correct8break scratch loss. |
| the 9-ball (or another adequate high-numbered ball) is spotted and the turn passes to the opponent | PASS | physicalPDF9/printed8 | Accurate9break scratch respot and turn; opponent ball-in-hand anywhere omitted separately. |
| the game does not end on that scratched 9-on-the-break | PASS | physicalPDF7,9/printed6,8 | Clearly labeled, supported continuation inference. |
| If you legally pocket a ball while also knocking other ball(s) on the floor, it’s still your turn | PASS | physicalPDF12/printed11 | Correct conditional8continuation; inference remains within this condition, not graded as unconditional. |
| those balls are not spotted until your turn ends | FAIL | physicalPDF12/printed11 | Ordinary delayed spotting is supported, but presented without required important exception: shooter's own off-table ball is spotted when all other own balls have been pocketed. Frozen acceptable criterion explicitly requires this exception and question specifically asks when balls are spotted. |
| If the knocked-off ball is the 8-ball, you lose the game | PASS | physicalPDF12/printed11 | Correct8floor game loss. |
| Any balls knocked off the playing surface are immediately spotted on the foot spot | PASS | physicalPDF11-12/printed10-11 | Correct9immediate spotting. |
| also if it’s pocketed and the shooter fouls | PASS | physicalPDF12/printed11 | Correct9pocketed-with-foul respot. |
| they have fouled and the opponent receives ball-in-hand | PASS | physicalPDF20/printed19note1 | Correct complete-miss8 consequence; no automatic loss and game continues. |

Claim findings: 8 supported, 1 failed, 0 unresolved.

- 8legal-break scratch loss: **PASS**
- 9legal-break scratch/spot/opponentBIHanywhere: **FAIL** — Respot/continuation right; opponentBIHanywhere absent.
- ordinary delayed8/immediate9spotting: **PASS**
- required8own-ball timing exception: **FAIL** — Absent; material omission under pre-call frozen acceptable criterion.
- 8floorloss/9foulrespot: **PASS**
- miss8/opponentBIH/gamecontinues: **PASS**

Limits: Completed421tokens, no truncation. This is a targeted omission failure, not a claim every factual assertion is wrong. Multiple-ball positioning omission is harmless per original key and not scored as failure. No mandatory citations added.

Answer SHA256: `42a013a7963798b554f154462566a760d5fd0ce4f7094ad1e6e88c4a564de0eb`. Exact source-bound score: `artifacts/local/03l/pdf-detail-large-score.json`.

Worker returns **READY_FOR_REVIEW** and stops. PM owns completion decisions.
