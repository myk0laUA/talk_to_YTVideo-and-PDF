# 03F single caption identity — bounded old/new comparison

**READY_FOR_REVIEW — scoped identity cleanup implemented; semantic support FAIL.** 21 October 2026 Toronto (command timestamps below are 22 October UTC). 03F and original Steps 03/07/10 remain incomplete. PM owns acceptance. No deployment or next task.

The packed owned-provider YouTube text/B representation now exposes only exact `locator.id` as caption identity. Offline preservation/admission passes. Both live conditions named the correct factual ID355, so this pair demonstrates **no identity improvement**. Both summaries fail semantic support; both factual answers have unconfirmed UI references. Stop speculative index/prompt retries and return the product decision to PM.

## Identity and change boundary

Arrival: clean `main`, HEAD `6ec8e842254a5cd0e2cdd8f145f9492c559943f2`. Delivery is dirty, without commit/push. Separate normal, `.env`-free production builds:

| Condition | Build | Runtime/source identity |
|---|---|---|
| Old v4 | `9lGm2dB3JUujfQ-FemR2H` | `old-checkout`; original HEAD product inputs |
| Candidate v5 | `mEb4lhMmDjjGOnuljjrUK` | `candidate-checkout`; candidate product inputs byte-checked at handoff |

Manifest-module SHA256: old `f4d411f69b34468088569baff411836e5aa3f83a010d93ee376b51c84b576115`, candidate `3dc7be430c040c4343b6b79f98580edeb2ac592a0e2559ea2c63c4affb3ba235`.

Both are under ignored `artifacts/local/03f-single-id/`. No inspector, debugger, generation interception, preload, source observer or content-changing instrumentation was used for either live server. Capture uses normal UI/owned HTTP reads only. Later changes are offline test coverage/documentation; production encoding was unchanged after the candidate build/live run.

Runtime change: `src/shared/priming-manifest.ts` conditionally omits `sectionIndex`, bumps `youtube-text-natural-references-v4` to `v5`, and describes first appearance of exact locator ID in ordered messages followed by part/offset continuity. `sectionCount` remains cardinality; part/offset/last stay within-caption positions. All original captions/boundaries/IDs/text/times/durations/empty captions remain. No numeric-ID sorting, renumbering, merging or resolver remapping.

Necessary decoders/regressions: `scripts/lib/full-source-text.ts`, `tests/text-relay/server.mjs`, new `tests/priming/caption-decoder.ts`, and three affected unit files (`provider-admission`, `text-caption-packing`, `youtube-text-citations`). Exact admission already recomputes the complete manifest; its implementation remains unchanged. Tests reject an actual old v4 manifest and resealed forged payloads, not just stale derived hashes. Persisted-source ID validation is unchanged; nonconsecutive IDs remain pure-encoder fixtures only.

All 24 existing voice/PDF wire comparisons are byte-identical. Model `gpt-realtime-2.1-mini`, text512/minimal reasoning, policies, socket pacing, ownership/expiry/provenance, natural-answer visibility, reference limits, Stop, parser, UI and endpoints remain unchanged. No React/Next framework change; no broad design skill workflow. OpenAI Docs was applied to pricing and selected playwright-cli to observable browser verification.

## Offline evidence

Independent decoder uses first-seen IDs, never suffix/ordinal sorting, then checks locator equality, part/offset/last continuity and exact joined fullText. Actual saved source equals the independently parsed XML inventory: **sq, 428 captions, 18,822 UTF-16 units**, SHA256 `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`. Authored fixtures cover nonconsecutive IDs, empty captions, zero/fractional times/durations, Unicode/combining/escaped hostile data and multi-item caption fragments. Actual saved text and third-party excerpts remain ignored.

| Event bound | Candidate items/fragments | Candidate ordered bytes | Old ordered bytes | Largest candidate event |
|---|---|---|---|---|
| 2,048 |65/448|134,324|144,229|2,048|
| 4,096 |27/434|110,325|119,680|4,096|
| 16,384 |6/429|97,525|107,311|16,383|

These deterministic measurements use saved source and `text_1`; they are not a captured provider wire trace. The retained 24-comparison run uses the longer historical `baseline03f-route-a` run label and measures97,771candidate bytes/max16,384. Both reconstruct all428captions exactly; sizes vary with the run namespace. No token-count inference from bytes.

Stale v4 instructions/version/actual manifest reject. Resealed alterations to source/run/mode/version, dropped/reordered/duplicate fragments, text/locator, part/offset/last and reintroduced ordinal reject exact admission. Source serialization and server provenance remain separate. New explicit packed multi-item tests cover withheld last item/final settings, duplicate/foreign/late ACKs, Stop and replacement. Existing server authorization/ACK barrier cases now exercise PDF and YouTube, including expiry/final revalidation. Existing natural-text/reference bounds and source/run/Stop retention tests pass.

All final commands use pinned Node24.22.0/npm11.19.1 in an isolated checkout with empty real keys, unusable synthetic loopback DB, network guard and no private env copy. Integrated suites explicitly inject fake providers/Prisma/media. No synthetic result is counted as live grounding or physical audio.

| Actual command | UTC start–end | Result/exit |
|---|---|---|
| `npm run build` (old checkout) |00:36:48.166–00:37:34.969|normal old build /0|
| `node --conditions=react-server --test tests/unit/youtube-evidence-format.test.ts tests/unit/youtube-evidence.test.ts tests/unit/youtube-text-citations.test.ts tests/unit/text-caption-packing.test.ts tests/unit/priming-setup-timing.test.ts tests/unit/text-socket-pacing.test.ts tests/unit/priming.test.ts tests/unit/text-lifecycle.test.ts tests/unit/owned-text.test.ts` |00:38:48.302–00:38:52.386|267focused tests /0; later20additional matrix cases included in final unit run|
| `npm run build` (candidate checkout) |00:39:32.980–00:39:43.576|normal candidate build /0|
| `npm run test:owned-text` |00:40:22.871–00:40:38.449|417built HTTP/browser checks /0|
| `npm run test:owned-voice` |00:40:38.452–00:40:58.077|125unit +392built checks /0|
| `npm run test:voice-adapter` |00:40:58.078–00:41:30.537|113unit +571built checks/48scenarios /0|
| `npm run lint` (final) |00:45:20.949–00:45:27.790|clean /0|
| `npm run typecheck` (final) |00:45:27.794–00:45:31.382|clean /0|
| `npm test` via `npm run test` (final) |00:45:31.386–00:45:38.369|1,706/1,706; no skips /0|

Exact executable/argv/cwd/start/end/child exits and failed runs are retained in `commands.jsonl`, logs and `commands-corrected.jsonl`. The copied CLI wrapper initially mislabeled its session as task03fa in metadata; actual log headers use `singleid-old`/`singleid-candidate`. Corrected ledger preserves the original labels and actual commands. The focused runner's shortened command label is likewise subordinate to its full recorded `actualArgv`.

Development failures retained: initial longer reconstruction instructions exceeded the2,048-byte event bound; shortened only that required description. First full unit run found the existing diagnostic decoder still keyed by ordinal (2failures); corrected its test-only reconstruction. First owned-text run found the same issue in fake relay reconstruction; corrected the fake decoder. Two authored test typing mistakes (`assert.throws` overload and nonexistent status.runId) failed typecheck and were corrected. Initial preregistration helper hit git stdout buffer limit while hashing a large skill data file; recovered using the untouched old checkout, with zero sessions/responses/acquisitions started. The final audit initially assumed the wrong preview-heading wording; corrected to the observed UI’s timestamp/duration format and verified all428headings per condition. A metadata-normalization helper initially assumed every command row had a command label; corrected to accept actualArgv-only helper records. These were evidence-helper defects, not application defects. No failed live trial was retried or omitted. Final passing checks above supersede these failures.

## Preregistered live comparison

`preregistration.json` recorded questions, order (old then candidate), acceptance and limits before any acquisition/session. Exact saved Route-A strings, in each condition:

1. In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.
2. In the personal story later in the talk, how long was the annual Princeton talk, and how many people was it given to? Include supporting source references.

Predefined identity criterion:20minutes/20people, exact355at1040.594seconds if source unchanged;354fails. Semantic criterion: every material summary assertion must be supported by its actually associated markers, including antecedents/compound assertions and scientific attribution/uncertainty. No nearby-window expansion, claim rewrite or verifier call. Delivery: complete readiness/readability/Stop/preview/source binding and exact stored fields. Right ID is not semantic acceptance. Each response observed below45seconds; no retries.

Real loopback app at127.0.0.1:3133, real PostgreSQL/owned source/direct uncached imports and genuine text mode. Private.env read only into task-owned runtime children; direct/cache-bypass/local-HTTP/text gates process-only; managed providers/proofs/live voice off locally. Public voice-enabled/YouTube-disabled deployment settings were not queried or changed.

| Condition | Normal import/source | Identical source result | Ready | Summary / follow-up observation |
|---|---|---|---|---|
|v4|201; `bc1767b8-e9de-4a65-9b63-0901bce45d59`|sq/428/18,822; all text/IDs/start/duration/order equal saved independent XML and candidate|3,635ms|1,859ms /1,786ms including Stop|
|v5|201; `bba0771d-f000-4f59-b24d-1ddd4a9b9169`|same fullText hash above; fresh source/visitor/session; no English substitution|2,798ms|1,936ms /1,518ms including Stop|

Readiness is observed through the actual question control; full-source/final ACK barriers are verified separately offline. No individual live ACK envelopes were captured. Each browser session starts with clean ephemeral context and no inherited conversation. Raw complete answer/annotation/notices/completion captures and preview reads are retained per condition (`question-1.log`, `followup.log`, `answers.json`, `source.json`); no missing output is scored as a pass. Live screenshots were inspected; viewport Stop screenshots show the controls/source, while full-page cleanup captures and DOM captures retain the answers.

## Separate outcomes and per-claim source review

**Identity:** offline single-ID cleanup PASS. Raw factual association PASS in both conditions: exact355,20minutes,20people; neither selected354. This pair supplies **no demonstrated identity improvement or causal result**. Both factual answers fail the existing citation contract: v4 emits bare `segment-355`, v5 parenthesized `(segment-355, segment-357)`; neither resolves a UI reference. These remain visible literal text with an unconfirmed-reference notice. Do not relabel raw355as a displayed source-matched reference.

**Semantic support:** FAIL in both summaries. v4 has81whitespace-delimited words and four resolved references12/145/227/239in a final supporting-reference list. v5 has82words with grouped bracket text122/239/320; the unchanged parser resolves zero. Neither end list establishes immediately associated support for each compound claim. Even granting the entire raw chosen set to every claim, the selected original captions do not supply complete support:

| Condition/material assertion | Actual selected source review | Result |
|---|---|---|
|v4: posture shapes thoughts/feelings/behavior and other people's judgment|12asks the audience to focus on present posture;145says evidence exists for an unstated antecedent;227introduces the high-power group;239mentions “these” hormone changes. Complete compound assertion absent.|FAIL|
|v4: brief shifts change risk tolerance, hormones and perceived dominance|227omits the result/antecedent and comparison;239is a narrow hormone-change phrase without labels/results. Perceived dominance is not established by the chosen set.|FAIL|
|v4: those changes affect hiring outcomes|No selected hiring result or complete causal link.|FAIL|
|v4: two minutes builds confidence and potentially changes career paths|239only supplies a two-minute hormone phrase. Confidence/career conclusions are unsupported by actual choices.|FAIL|
|v5: powerful posture changes confidence/feelings/judgment/hormones|122is an antecedent-dependent “not surprising” remark after women's relative power;239is narrow hormonal context;320is an isolated “not me” objection. Full compound assertion absent.|FAIL|
|v5: low-power posture reduces confidence|No selected caption states this comparison/result.|FAIL|
|v5: experiments show reliable changes and hiring biases|No selected hiring result;239does not establish experimental reliability. Speaker attribution exists, but “reliable” strengthens beyond the selected evidence.|FAIL|
|v5: controlled small tweaks improve presence without deception|No chosen complete recommendation or its antecedents.|FAIL|
|v5: adopt power posture until natural/authentic|320is an objection, not the later narrative/conclusion. Later401–403were not selected and are not added after the fact.|FAIL|

Both follow-ups' requested numbers are supported by the raw355selection (stored start1040.594/duration3.499). v5 adds fear **and contacting someone**, with raw357:357supports fear, but contact occurs in358, not selected. That extra compound association FAILS; no automatic neighbor expansion. Scientific propositions above are treated as speaker-reported claims, not independently established science. Albanian→English interpretation remains a limitation; no outside translation/model verifier was called. Exact original selected captions and claim-by-claim reasoning stay in ignored `comparison.json`.

**Delivery:** both complete naturally and stay readable. Both full previews remain428captions and four turns survive Stop. All4v4summary UI references have exact stored ID/excerpt/time/link; that membership PASS does not pass semantic support. v5summary/follow-up and v4follow-up references stay unconfirmed, never silently remapped. Both source deletions200and subsequent ownedGET404; microphone permission remains prompt. Browser media was not requested. Actual audible/physical phone behavior NOT_RUN.

## Budget, cleanup and handoff

Official [pricing](https://developers.openai.com/api/docs/pricing) searched/opened before calls; exact model [pricing snapshot](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) saved/hashed. Text input$0.60/output$2.40/cached input$0.06 per million. Conservative128,000input+512output yields$0.0780288/response; reserved$0.079×4=$0.316before all calls, within$0.32. Ledger CLOSED:2sessions/4responses/2acquisitions, no retries/additional verifier calls. UI reported156/82/143/72output tokens (453total). Actual input/cached/reasoning breakdown and actual billing remain UNKNOWN; no billing/admin access.

Both visitors' sources removed through normal UI/API; answers/preview captured before removal. Both exact browser sessions closed and exact task server PIDs45800/50224stopped. Both port3133rebind checks passed. Explicitly stopped Windows children report exit1; this is recorded process teardown, not a failed model condition. Final audit:548protected tracked files unchanged;10delivery files;119product/build inputs match each condition; all428preview IDs/times/durations/headings per condition match. Private-file hashes and absent copied private env verified; ports3126/3128/3129/3133rebind. Package-lock, task brief and prior handoffs unchanged. No migration, reset, cleanup of others' sources, public activation or deployment.

Delivery manifest: ignored `changed-files.sha256.json`; audit/identity/command data are under `artifacts/local/03f-single-id/`. PROJECT_STATE and TESTING updated; original task brief, Step01–14 IDs and handoffs preserved. Both live outputs are failed semantic evidence, not full03Facceptance. Passing offline invariants does not establish universal citation reliability, provider readiness statistics, physical audio or hosted YouTube. No further prompt/index/provider/model task is authorized by this handoff. **READY_FOR_REVIEW; stop and return to PM.**
