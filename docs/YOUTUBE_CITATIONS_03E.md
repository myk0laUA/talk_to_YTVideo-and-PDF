# 03E — text citation candidate; summary gate remains blocked

**READY_FOR_REVIEW for the bounded implementation and failed-live evidence. Partially implemented; full citation acceptance is BLOCKED.** One candidate, one live session, two responses. The factual follow-up passes content and citation checks; the summary does not. No second session, further sampling, deployment or later task.

## Identity and boundary

Local Windows, pinned Node **24.22.0** / npm **11.19.1**, branch `main`, starting/final HEAD `db2a665ecacf0966562ca219f0c1c2220d7103c2`. Clean arrival; dirty delivery, no commit/push. Normal production build **`hsh-GKuPBHnkbzIWSiE6U`**, built 21 October 2026 at 22:48:47.571–22:48:59.042 UTC in ignored `artifacts/local/03e/offline-checkout`. Application source did not change after that build. Changed-file hashes, build-source equality, protected-file/private-file integrity and final dirty identity are in `artifacts/local/03e/identity.json` and `changed-file-hashes.json`.

Only `src/shared/priming-manifest.ts` changes runtime behavior. `tests/unit/youtube-text-citations.test.ts` adds six deterministic cases; this report, PROJECT_STATE and TESTING record the outcome. No UI, renderer, provider/model, policy caps, dependencies/lockfile, storage, schema, SQL, ownership/expiry, voice or PDF change.

Synthetic verification used an isolated copy with no private environment file, blank real keys, unusable loopback DB, external network denial and a dependency junction. Live verification used the same **uninstrumented production build**, fresh owned browser visitor, real PostgreSQL and OpenAI text, `http://127.0.0.1:3133`. A bounded fetch preload captures only the direct YouTube caption XML/status before text setup; no provider-event capture, debugger, source-module instrumentation, runtime telemetry or ACK observer. Thus live readiness timing is browser-observed, not an internal ACK measurement. Private credentials and local flags were passed only to the owned child process. Public voice remains enabled and public YouTube disabled; no hosted operation occurred.

## Inspection and candidate

The actual text path is `TextSessionRegistry` → owned `createProviderTextPreparation` → `sourceContext/contextVariants.B` → `encodeManifest(..., true)` → `matchesProviderPreparation` and `validateProviderAdmission` → `PrimingController`. Preparation re-reads/revalidates the source and binds the immutable projection in its server WeakMap. Admission regenerates the exact manifest. The controller compares effective initial and final instructions/settings and every source item ACK before readiness.

Before this change, packed fragments already retained exact `locator.id`, `startSeconds`, `durationSeconds`, source text, section ordinal, part and character offset. No deterministic locator corruption was found. The earlier ordinal-as-seconds explanation remains a hypothesis. There was no explicit rule separating these numbers or requiring verbatim claim-specific references.

The candidate applies **only to provider text + YouTube + variant B**:

- Adds `citationVersion: youtube-text-citations-v1` to packed envelopes and a copyable `citation` made directly from that fragment's exact segment ID/start time.
- Adds a concise text-only instruction block: locate support first; copy that fragment's reference exactly; cite relevant sections separately for spanning claims; ordinals/parts/offsets are not seconds; do not round, invent precision/ranges or cite unrelated passages; admit missing support; attribute scientific claims to the speaker.
- Keeps all original locators/text and fragment boundaries lossless. All fragments of a split caption carry the same caption citation. No response rewriting or citation remapping exists.

The new representation and instructions are both bound by exact manifest regeneration and final effective-settings ACK validation. Missing/altered citation version, reference, instructions or representation fails admission; a stale final instruction ACK cannot establish readiness. The generic priming/context versions and shared text policy stay unchanged to preserve PDF/voice bytes. The separate citation version plus exact manifest equality distinguishes this candidate.

## Offline verification

All commands below exited **0**. Exact UTC times, exits, cwd, runtime and logs are in `artifacts/local/03e/commands.jsonl`; `commands-extra.json` corrects the focused runner's inherited display label and records supplemental invocations. Pinned executable: `.tools/node-v24.22.0-win-x64/node.exe`; npm CLI: that runtime's `node_modules/npm/bin/npm-cli.js`. Orchestration: `node artifacts/local/03e/verify.mjs focused lint typecheck test build test:owned-text test:owned-voice test:voice-adapter`.

| Command/check | UTC start–end, 21 October | Observed result |
|---|---|---|
| Focused Node tests, exact files in supplemental record | 22:48:19.058–22:48:23.031 | 231/231 |
| `npm run lint` | 22:48:23.035–22:48:32.388 | Clean |
| `npm run typecheck` | 22:48:32.390–22:48:40.310 | Pass |
| `npm run test` (same script as `npm test`) | 22:48:40.313–22:48:47.567 | 1649/1649 |
| `npm run build` | 22:48:47.571–22:48:59.042 | Normal production build above |
| `npm run test:owned-text` | 22:48:59.043–22:49:15.831 | 417 built HTTP/browser checks |
| `npm run test:owned-voice` | 22:49:15.833–22:49:36.196 | 125 unit +392 built checks; zero forbidden network |
| `npm run test:voice-adapter` | 22:49:36.198–22:50:10.991 | 113 unit +571 built checks/48 scenarios; zero forbidden network |
| `node --conditions=react-server artifacts/local/03e/prepare.mjs` | End/start not separately recorded | 24 byte-identical baseline comparisons; preservation/expectations/ledger prepared; exit0 |
| `git diff --check` | Exact time not separately recorded | Pass/0 |

New authored transcript deliberately separates segment IDs from timestamp values, with distinctive beginning/middle/end facts, nonmonotonic fractional times, Unicode, empty captions, long split fragments and embedded hostile instructions. Tests reconstruct exact text/locators/citation pairs at 2048/4096/16384-byte limits, preserve hostile strings as data, reject stale bindings and exercise accepted versus stale final instructions. These prove plumbing and instruction binding, **not model compliance or semantic support**.

Historical full real-source data is used only for offline preservation: 428 sections/18,822 characters reconstruct exactly. Candidate text packs into **8 messages, 125,193 wire bytes** for the documented comparison run ID; max source event16,384 bytes. Wire totals vary with run/source IDs. Eight YouTube voice, eight PDF voice and eight PDF text comparisons (A/B, two bounds, ordinary/UUID IDs) are byte-identical to HEAD's encoder. The retained synthetic voice hash regression also passes.

Development failure retained: the first longer instruction draft exceeded the existing 2048-byte event bound in one packing test (7pass/1fail, exit1). Instructions were shortened; unchanged bounds then passed8/8, and all subsequent required checks passed. This was an offline instruction-size failure, not a live attempt. See `development-checks.json`. No framework changes required a Next.js guide.

## Live claim-to-passage verification

The selected OpenAI Docs and project Playwright skills were used. Official [pricing](https://developers.openai.com/api/docs/pricing) and [model documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) were fetched before calls: text input $0.60, cached input $0.06, output $2.40 per million tokens; 128,000-token context. Existing model and512-output cap retained. Realtime [conversation guidance](https://developers.openai.com/api/docs/guides/realtime-conversations) was also fetched; no API/schema change was made.

`expectations.json` records both natural questions and non-exhaustive expected supporting passages **before sending**. Fresh captions were checked against those passages before session start. Questions ask for an English summary under100words with attribution/timestamps, then the annual Princeton talk's duration and audience size. No answer was required to match predetermined wording or include every optional detail.

One real uncached extraction of `Ks-_Mh1QhMc` returned201, language omitted by UI → **sq**, 428 sections, 3,292 words, 18,822 characters. Provider XML → saved owned source → full preview texts/timestamps match exactly. Fresh full-text SHA256 remains `b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98`. Evidence: `source.json`, `returned-transcript.xml`, `source-preservation.json`, `upstream.jsonl`, `import.png`.

| Check | Expected | Actual / status | Evidence under `artifacts/local/03e/` |
|---|---|---|---|
| Same-source setup | All-source/final-setting gates before editable question | Ready in browser at3464ms from start; full source retained; PASS | `question-1.log`, source/build identity |
| Summary | Concise attributed source content; every emitted reference exact and supporting | Complete; **FAIL citations**. Three references emitted: two combine a segment ID with another segment's timestamp; one is an exact pair but supports only part of the compound hormone claim. An unrelated laughter/focus passage cannot support the broad summary. Scientific claims retain speaker attribution; authenticity/sustainability wording was not established as source-supported. | `answer-checks.json` contains exact answer, all three emitted references, both ID/time lookup results, claim review and actual supporting passages; `answer-1.png` |
| Factual follow-up | Both requested facts and exact supporting reference | **PASS content and citation**; correct duration/audience and exact supplied segment/start time supporting both facts | `answer-checks.json`, `followup.log` |
| Response bound | Each observed≤45seconds | Summary2285ms; follow-up1759ms including Stop observation. Browser wall time/polling, not provider latency accounting; PASS | Same logs |
| Stop retention | Both real answers survive Stop | Four finalized turns retained exactly; PASS | `answers-after-stop.png`, `answer-checks.json` |
| Preview / own deletion | Full preview after Stop; DELETE200, subsequent own GET404 | PASS, plus malformed URL caused zero API requests | `cleanup-browser.log`, `cleanup-browser.json`, `removed.png` |

Exact answers, source excerpts and per-citation evidence remain only in ignored artifacts. The summary's mismatched pairs were **not** silently resolved to make evaluation pass. The follow-up's success does not validate the summary. No second session or third response was sent.

## Ledger and cleanup

Fresh **03E** ledger: maximum$0.25estimated, at most2sessions/4responses. Actual1session/2responses/1extraction. Before setup and both questions, reserved **$0.079 per response**, **$0.158 total**, using the full documented context at uncached input rate plus512output tokens ($0.0780288 rounded up). Reservations are operator estimates, not an application-enforced dollar cap. Numeric actual provider usage/billing was not captured and remains **UNKNOWN**. Ledger closed after the failed summary and completed planned follow-up; no repeated sampling. See `ledger.json`.

Source removed through the actual owned UI/API, browser closed, exact task-owned server process stopped,3133 successfully rebound, private-file hashes unchanged. Forced server termination records Windows exit4294967295; this is deliberate cleanup, not a failed live setup. No private environment file was copied to the isolated checkout. Observer and source evidence are ignored local files. `cleanup.json`, process/exit records, identity and command records retain the checks.

## Acceptance and bounded next design for PM

Manifest fidelity, full-source packing, binding/stale rejection, voice/PDF preservation, regression suites, fresh direct import, factual follow-up, Stop/preview/removal and cleanup pass. **Two passing grounded answers are not established: summary citation accuracy remains BLOCKED.** This is a candidate requiring PM review, not a generally reliable citation feature or full Steps03/07/10 completion. Hosted YouTube, real YouTube voice and physical-phone gates remain open. No phone request now.

Stop per03E. Proposed smallest next design, **not implemented or authorized as a new task here**: a text-YouTube-only per-claim evidence format containing a supplied segment ID and an exact supporting source quote; validate ID/quote membership and resolve the stored timestamp deterministically before rendering. Unknown IDs/nonmatching quotes must remain visibly unsupported, never remapped or labeled verified. A resolver fixes ID/time validity only; claim-to-quote support still requires explicit semantic evaluation on the same summary/follow-up. No retrieval/tool/model/dependency/cap change is proposed. PM should bound that response-validation/renderer design and its new live allocation before implementation, or reject/revise it. The present candidate remains reviewable with its failed evidence; no additional correction or later step was started.
