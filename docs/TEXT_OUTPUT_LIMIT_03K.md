# Task 03K — owned text output allowance

**PM review22October2026: ACCEPTED for03K correction scope.**9delivery/92evidence hashes match; inspected shared2048text/v2policy and harness propagation, exact saved answers and source rules. Fresh pinned network-denied routing/provider-admission/provider-voice-admission checks282/282PASS, exit0/no skips (`artifacts/local/03k/pm-review-tests.log`). Uphold completed Mini semanticFAIL (ball-in-hand recipient) and larger scopedPASS; nonexhaustive omissions do not violate frozen summary rubric. Completion737/643output demonstrates the former512cap was binding, not that2048 guarantees accuracy/completeness. Worker full/build/built results remain reviewed worker evidence. No PM paid call or deployment; cutoff still unapproved. Sole next03L covers only previously unrun user-fixture cells, not another summary retry.

**READY_FOR_REVIEW — implemented; diagnostic semantic results Mini FAIL / larger PASS.** Both unchanged PDF summary samples completed under the new 2048 ceiling. The demonstrated 512-token truncation is absent in these two samples; Mini still gives the wrong player ball-in-hand after missing the 8-ball. This is a bounded output-limit correction and one direct paired diagnostic, not whole-app acceptance, a validated quality cutoff, or a guarantee of completeness. PM owns acceptance and sequencing. Steps 07/10/13 remain open.

Branch `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`; arrival tree already dirty and preserved. Local root production build **`z-ZMCK6ul_aC9cv1h0_TM`**, built 2026-10-22 06:34:37.563–06:34:43.066 UTC (22 October Toronto). No commit, push, dependency change, real DB/service provisioning, flag change or deployment. Private configuration preserved. Working WebRTC voice declarations/instructions unchanged; no physical phone/audio claim.

## Changes and propagation

| File | Change |
|---|---|
| `src/shared/priming-provider-policy.ts` | Mini text ceiling512→2048; Mini revision `provider-text-full-source-2026-10-22-v2`, larger revision `provider-text-full-source-large-2026-10-22-v2`. Larger still inherits the shared allowance. Voice object is byte-for-byte unchanged. |
| `tests/unit/text-model-routing.test.ts` | Both source kinds/models: session configure/finalize and each response2048; provisional output reserve2048 without altering input estimate; reject stale revisions/caps/manifests and initial/final ACK512/2047/2049/infinity; retain explicit incomplete/max-output transcript without retry/model switch; preserve ownership/context/Stop regression coverage. Fix former invalid2048 ACK probe to512. |
| `tests/unit/provider-admission.test.ts` | Response expectation2048; existing full-source/admission/overflow/cleanup regressions retained. |
| `tests/unit/provider-voice-admission.test.ts` | Update only text policy expectations; all voice expectations remain fixed. |
| `tests/text-relay/server.mjs` | Built fake-provider outbound session/response contract requires2048 for either model/kind. |
| `scripts/lib/full-source-text.ts` | Developer harness session ACK, response and usage checks consume current text policy instead of stale512 literals. Old frozen results/ledgers untouched; no old live allowance reopened. |
| This report, `PROJECT_STATE.md`, `TESTING.md` | Additive handoff/evidence entries. Task helpers/raw sources/answers/logs/screenshots stay ignored under `artifacts/local/03k/`. |

Inspected actual dependency chain: `encodeManifest` reads the common text cap; exact provider-admission reconstruction rejects stale session settings; preparation/provenance and socket allowlists match exact revisions; `PrimingController` compares both effective session ACKs with desired settings; `TextLifecycle` copies the immutable selected policy into each permit/response; routing reserves read `policy.maxOutputTokens`. These consumers required no product edits. Source packing, full source, concise/grounding/citation instructions, minimal reasoning, disabled truncation, routing estimator/boundaries/default-off gate, visitor ownership/expiry, context-limit recovery and no-switch/no-retry lifecycle remain unchanged. The allowance is an application ceiling, never a target answer length, measured input count, capacity admission or completeness promise. Realtime does not ACK an application revision string: offline admission checks revisions; live ACKs check model/instructions/cap/reasoning/modalities/truncation.

## Verification

All commands used `.tools/node-v24.22.0-win-x64/node.exe` (Node24.22.0) and its bundled npm11.19.1. Runner `artifacts/local/03k/run.mjs NAME` executes the exact npm script (or focused argv below), sets synthetic configuration/blank keys/unusableDB, and denies external network through `tests/text-relay/network.cjs`. No `npm ci` was needed; dependencies/lockfile match arrival. Full argv, absolute executable/cwd, UTC/exits are in `commands.jsonl`.

| Check / actual command | Environment / expected and observed | Status / exit / evidence |
|---|---|---|
| `node --conditions=react-server --test tests/unit/text-model-routing.test.ts tests/unit/provider-admission.test.ts tests/unit/owned-text.test.ts tests/unit/owned-voice.test.ts tests/unit/priming.test.ts tests/unit/text-lifecycle.test.ts tests/unit/voice-lifecycle.test.ts tests/unit/model-budget.test.ts` | Local fake provider/storage; policy/full-source/authorization/voice/lifecycle regressions;560/560 | PASS0, `focused.log` |
| `npm run lint` | Local offline;0warnings | PASS0, `lint.log` |
| `npm run typecheck` | Local offline Prisma/Next type generation and TypeScript;0errors | PASS0, `typecheck.log` |
| `npm run test` (equivalent `npm test`) | Local offline full unit suite;1735/1735 | PASS0, `test.log` |
| `npm run build` | Local root default production build, real TypeScript checks; expected complete BUILD_ID produced | PASS0, `build.log`, build above |
| `npm run test:owned-text` | Built Next HTTP/browser/real WS adapter, explicit fake WS+synthetic Prisma;532checks, both models/kinds,2turns/Stop, retained preview/text, denials/recovery; external attempts0, opens=closes, active/listeners0, port3126released | PASS0, `owned-text.log`, `owned-text/integrated-results.json`, PNGs/server logs |
| `node --conditions=react-server artifacts/local/03k/freeze.mjs --freeze` | Full22page snapshot/question/key/old-newsettings/input+helper hashes frozen; old512 representation reconstructed exactly,9620estimated input unchanged | PASS0, `frozen.json`, `freeze-seal.json` |
| `node --conditions=react-server artifacts/local/03k/dry.mjs` | Network-denied fake pair,2048session/response/full22ACKs, closed-ledger rejection and injected provider failure teardown. No real attempts. Intentional negative children exit1. | PASS0, `dry-results.json`, `dry-positive/`, `dry-negative/` |
| `node --conditions=react-server artifacts/local/03k/direct.mjs pdf-summary-mini` | Real direct Realtime; one fresh session/response,full22ACKs/exact settings;completed737tokens;semanticFAIL | Protocol PASS0; `pdf-summary-mini-result.json`, `pdf-summary-mini-score.json` |
| Same with `pdf-summary-large` | Real paired larger, identical full source/instructions/question;completed643tokens;semanticPASS | Protocol PASS0; matching result/score files |
| `node --conditions=react-server artifacts/local/03k/finish.mjs`; `audit.mjs`; `git diff --check` | Offline cost/resource/preservation/freeze/input/delivery/evidence integrity | PASS0, `ledger.json`, `cleanup.json`, `preservation.json`, `changed-files.sha256.json`, `evidence.sha256.json`, `diff-check.log` |
| Real-provider app/PDF upload, video/detail cases, realDB, deployed/physical device/audio | Outside03K; no inference from synthetic browser checks/direct samples | NOT_RUN |

Focused checks passed before the full checks. Full-unit initial run found9stale512 developer-harness contract failures; harness now uses the policy. Initial new-test fixture omitted variantB (4failures), then omitted required ACK object discriminator (4failures); both corrected. Initial typecheck found missing response typing and explicit clone types in the new tests; corrected. Initial freeze reconstruction read the metadata-only separator instead of variant separator and failed before any call; corrected and exact old representation/source equality then passed. Failure logs and command exits retained. Read-only inspection errors for guessed filenames/runtime location were not behavioral failures. Final lint/typecheck/full units/build/built checks all passed before real calls; no paid retry occurred.

## Freeze, rates and closed ledger

Freeze UTC **2026-10-22T06:37:37.769Z**, SHA256 **`26cf3397e7b9bd104387b135d275f639e6d6342f1e8677b447cbac13f2108052`**. Prior frozen03J file remains `058b0cdc408fc0d839262e56e1f86fcc93cc45a188ff12338bf4f21ff9dbd95c`. New freeze copies the exact PDF summary question and complete original key/rubric, original source0 bytes/full22pages, all22ordered source messages and instruction strings. Only configure/finalize output cap differs in wire representation; application revisions change independently. Prior two512FAIL answers/scores/ledger are hash-checked unchanged. All242current product/test/build inputs and helper identities checked before each live reservation. Full PDF source SHA256 `da590b29bdd6ca14eedac9bcafa403d0707a009aabc63c8e5bdc70ef952589cc`; saved source file `8c80c127999333c42bcaac4e67c21409429d2a3607d8c0de327f0acc2c6c1499`. Key never sent to provider. All22extracted pages independently read for grading; no diagram is needed for the frozen question.

Official OpenAI documentation fetched before freeze: [pricing](https://developers.openai.com/api/docs/pricing), [Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), [larger](https://developers.openai.com/api/docs/models/gpt-realtime-2.1). Text input/cached/output per1M tokens: Mini$0.60/$0.06/$2.40, larger$4/$0.40/$24; local `official-*.html` snapshots retained. Reserve128000uncached input+2048output for each independent empty-history call: **$0.0817152 Mini**, **$0.561152 larger**, combined **$0.6428672≤$1**. This intentionally conservative estimate covers complete9620estimated source+instruction input/question/framing; it is neither exact token binding nor a hard invoice cap. Both sessions received9760actual input tokens, identical to the old512samples; no input-context diagnosis follows.

| Sample / semantic score | Terminal / usage input,out,reasoning | First text / terminal / session ms | Estimated USD |
|---|---|---|---|
| Mini **FAIL**, output completion **PASS** | completed /9760,737,24 |455 /3458 /5879 |0.0076248 |
| Larger **PASS**, output completion **PASS** | completed /9760,643,12 |816 /5946 /8118 |0.0544720 |

Both status_details null; neither hit the output cap. Latencies are socket timing, not app/phone/audio latency. Live UTC06:38:26.950–06:39:23.818 on22October2026Toronto. Ledger **CLOSED**,2sessions/2response sends/2provider response.created,19520input,0cached,1380output,36nested reported reasoning, noaudio/image. Usage-derived estimate **$0.0620968**; billing/invoice UNKNOWN. Output billed once from output_tokens; nested reasoning is not added. Both sockets closed immediately after terminal and processes exited; built browser/server/provider cleanup separately passed. No real source persisted or DB touched. Closed allowance cannot be reused.

## Independent semantic review

Frozen rubric: judge material assertions against whole source; useful requested overview, no mandatory exact wording/citations/every-subtheme demand. Completion and semantics are graded separately. Scores are qualitative criterion grades rather than an invented post-hoc numeric threshold. Full claim-by-claim scores, supports/ambiguities and answer hashes are in each `*-score.json`.

| Criterion | Mini | Larger / source support |
|---|---|---|
| Groups/goals/lowest-first and ordinary continuation | PASS; old category-call/mark invention absent | PASS; physical3–4 |
| Lag/start | PASS for lag; break mechanics omitted | PASS for lag/nonbreaker rack/head-string/minimum movement and illegal scratch breaker; physical4–7 |
| Main foul penalty and break exception | PARTIAL: vague sometimes ball-in-hand; omits8break head-string restriction | PASS for common fouls and8break restriction; physical17–19 |
| Miss8 vs opponent ball-in-hand | **FAIL**: says the player who misses8 gets ball-in-hand | PASS: opponent does not win merely from miss, gets ball-in-hand; physical20 |
| Main game endings | Several supported endings but generic “or fouling” ambiguous; failure does not rely on ambiguity | PASS: legal8, out-of-turn/wrong-pocket8, last-own-ball+8loss, legal9; physical20–21 |
| Complete terminal / unsupported invention | Completed; still material factual reversal | Completed; no clear material unsupported rule found |

Mini exact problematic sentence: “In 8-ball, if you miss the 8-ball, you don’t win by that foul; you just get ball-in-hand rights”. It addresses the shooter as “you”; physical20gives the opponent ball-in-hand. Earlier “miss ... ends your turn” does not correct that reversal. Its accidental-movement/dead-ball phrase and generic foul-loss wording remain explicitly ambiguous, not extra decisive failures. Missing legal-break mechanics/8break restriction weaken usefulness, but the clear recipient error independently establishes FAIL.

Larger supplies a useful broad overview under the unchanged rubric. Its legal-break “minimum movement/pocketing requirement” is less concrete than the four-rail criterion. It omits some Masters variants, off-table8loss and explicit cue-ball scratch while shooting8loss. These nonexhaustive omissions are disclosed, not a new every-subtheme failure rule; it correctly states the explicit miss8exception and major endings. One PASS does not establish repeatability or approve a routing cutoff. PM can independently review the saved complete source/answer/claim scores.

## Acceptance mapping and remaining work

|03K criterion | Evidence / result |
|---|---|
|2048both models/kinds/session+response/reserve; exact revision rejection | policy plus both-kind/model matrix;560focused/1735full/532built PASS |
|Full input, authorization/expiry, no switch/retry, partial/context/Stop cleanup | Existing regressions retained/new2048partial terminal tests; unchanged input reconstruction; full suite/built PASS |
|Working voice and prompts preserved | Exact reconstructed baseline policy hash proves only3text declarations differ; all other product inputs unchanged; voice regression tests PASS; physical voice NOT_RUN |
|Offline gate before bounded unchanged pair | Commands/build/freeze/dry evidence predates2live starts; original source/key/question/instructions exact |
|Cost/time/session/resource bounds; history preserved | CLOSEDledger2/2,observed sessions<60s/answers<30s,$0.0620968estimate,socketsclosed; original03Jfails untouched |
|Scoped diagnostic result and handoff | Both complete; Mini semanticFAIL/largerPASS; no broader app/cutoff/deployment acceptance |

No new worker task started. PM decides whether to accept the correction and resume the still-unrun video/detail/livePDFapp cells with a new scoped brief/allocation. Short-source calibration, genuine full-app accuracy, voice/device/recovery/security/release gaps remain open. Routing stays default-off and deployed configuration is untouched; public voice/YouTube flags were not queried or changed. No manual phone test is required for03Kreview.

## Changed implementation input SHA256

| Path | SHA256 |
|---|---|
| `tests/unit/text-model-routing.test.ts` | `c0917cdb15872b88b8b42a56de8f372b63b2a9e4e814ff275f11fe823a21c371` |
| `scripts/lib/full-source-text.ts` | `60ee093e015e6db17df2bfbbed5205c2b6a227c9b4dfe3b23bd0960788efab8e` |
| `src/shared/priming-provider-policy.ts` | `774a590ab961b721a2ce7bbb252043c44606c4793d7c5f79697afc52ce71b116` |
| `tests/text-relay/server.mjs` | `37ae3878512bcdcdd34759b0ccd2246b2dd32664d7f39f8dc2dde0a71c390a5e` |
| `tests/unit/provider-admission.test.ts` | `94c4cee64d1c93ffe7359182f9591c2a3565bc0b03d4f29569ccb445db1258f1` |
| `tests/unit/provider-voice-admission.test.ts` | `40549bc2df6522d41b343dd8fffa740307dcc37f1293c9bf8f639a06ed6cc08d` |

All9delivery hashes (six implementation/test/harness files plus three docs), baseline preservation and complete evidence manifest are in ignored `changed-files.sha256.json`/`preservation.json`/`evidence.sha256.json`. Report hash is external to avoid self-reference.

## Exact saved Mini answer — semantic FAIL; completed

```text
Here’s a concise summary of the APA league rules booklet for a new player, based on the source.

For 8-Ball and 9-Ball, the differences are clear. In 8-Ball, you first pocket a ball to determine whether you’re a “solids” or “stripes” player, and your goal is to pocket your category and then legally pocket the 8-ball (with the 8-ball pocket marked in League play; see page 3). In 9-Ball, it’s a rotation game: you must hit the lowest numbered ball first, and you continue shooting as long as you hit the lowest-numbered ball first and pocket a ball (page 3).

How a game (or turn) starts and continues: To begin, players “lag” to see who breaks, and the winner then breaks (with specific division rules like Masters choosing format; page 4). After the break, if you pocket a ball, you keep shooting—otherwise your turn ends. In 9-Ball, if you pocket a ball, you still keep shooting. In 8-Ball, if you pocket a ball of your category, you continue (page 3). For 9-Ball, if you pocket multiple balls, you have to keep going; if you miss or foul, the turn passes to the opponent (page 3; page 8).

Main fouls and game-ending rules: A foul that’s called, or other violations, can end a turn and sometimes give ball-in-hand to the opponent (page 15). Common ball-in-hand situations include scratching the cue ball, not hitting the correct ball first, or causing the cue ball not to contact an object ball on a legal shot (page 15, page 17). There are other fouls too (like touching a ball when it’s not allowed), and many of them are listed as “ball-in-hand” penalties.

Game-ending conditions: In 8-Ball, you win when you pocket all your category balls and then legally pocket the 8-ball, but there are also ways to lose, such as pocketing the 8-ball out-of-turn, in the wrong pocket, or fouling. A foul on the break that results in scratching the cue ball also has specific consequences, and in match rules the 8-ball is game-winning if pocketed legally; a miss on the 8-ball doesn’t win you the game, it ends your turn. In 9-Ball, pocketing the 9-ball wins the game, unless the shooter scratches; then the 9-ball is spotted and play continues from the opponent (page 8; page 19; page 20).

Exceptions and special notes: Masters Divisions use different rules for 9-ball in ball count/points, and push-outs are allowed there (page 3; page 8). In 8-ball, if you miss the 8-ball, you don’t win by that foul; you just get ball-in-hand rights (page 19). Also, there are accidental movement rules; if a ball moves accidentally, it may need to be replaced, unless it has to be spotted or it’s somehow dead due to contact rules, and the rules say which ball is playable and what happens (page 11; page 19).

This is a summary, not a full quote, and the source provides specifics (for example, ball count/points differences between formats) that you should follow exactly on the table.
```

## Exact saved larger answer — semantic PASS; completed

```text
Sure! Here’s a newcomer-friendly summary based on the booklet.

Source claim (pages 2-3): 8-Ball uses 15 balls plus the cue ball. Players are assigned solids (1-7) or stripes (9-15) once someone legally pockets a ball. You win by clearing your group and then legally pocketing the 8-ball (in league play, the 8-ball must go in a marked pocket).
Source claim (page 3): 9-Ball uses balls 1-9 in rotation. You must hit the lowest-numbered ball first, but you can continue if you legally pocket any ball. The game ends when the 9-ball is legally pocketed. In league play, balls 1-8 are worth one point and the 9-ball is worth two points.

Source claim (pages 3-6): Games start with a lag to decide who breaks. Balls are racked by the non-breaking player. A legal break requires breaking from behind the head string and meeting the minimum movement/pocketing requirement. If the break is not legal, it’s reracked and rebroken; if it’s an illegal break with a scratch, the other player breaks.

Source claim (pages 6-9): After the break, if you pocket a ball legally, you keep shooting; if you miss or foul, your turn ends. In 8-Ball, if the 8-ball is pocketed on the break it’s a win unless you foul the cue ball, which makes it a loss. If both categories drop on the break, the table is open. In 9-Ball, pocketing the 9 on the break is a win unless you scratch; then the 9 is spotted and your opponent shoots.

Source claim (pages 16-18): Common ball-in-hand fouls include scratching, hitting the wrong ball first, failing to hit a rail or pocket a ball after contact, moving the cue ball outside ball-in-hand placement, double-hits/altering a moving cue ball, and the cue ball contacting an accidentally moved ball. In 8-Ball, a scratch on the break gives ball-in-hand behind the head string, not anywhere.

Source claim (pages 19-20): In 8-Ball, you win by legally pocketing the 8-ball after your group is cleared, or if your opponent commits certain 8-ball-ending errors (like pocketing it out of turn or in the wrong pocket). You don’t automatically win if your opponent misses the 8-ball entirely; you get ball-in-hand instead. Also, you can’t pocket the 8-ball at the same time as your last group ball; that’s a loss. In 9-Ball, you win by legally pocketing the 9-ball.

Inference (helpful framing): Think of 8-Ball as “claim a set, clear it, then finish on the 8,” and 9-Ball as “always hit the lowest ball first, but any legal pocket keeps you at the table—finish by making the 9.”
```

Worker returns **READY_FOR_REVIEW** and stops. PM owns completion decisions.
