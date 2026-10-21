# Task 03F — source-resolved evidence for YouTube text answers

Use prompts/WORKER_PROMPT.md and required handoffs. Sole worker task under original Steps03/07/10; no deployment or later task. This is a bounded response-validation change, not another prompt-only retry.

## Evidence and outcome

Read YOUTUBE_CITATIONS_03E.md and ignored answer-checks.json. PM matched5hashes and freshly passed149tests (youtube-text-citations, text-caption-packing, provider-admission, priming). Candidate03E preserved setup/source/voice/PDF and produced a correctly cited factual follow-up, but summary emitted mismatched ID/time pairs and unsupported claim/reference associations. No deterministic locator corruption was found.03E is accepted as partial implementation/evidence, NOT a reliable citation feature. Full03D grounding remains blocked.

Outcome: YouTube text references use trusted stored timestamps and source excerpts, with malformed/unmatched evidence explicitly unresolved; same-video summary and follow-up pass factual and semantic-support checks. Preserve full captions, fast setup, genuine streaming text and Stop behavior. No claim that deterministic validation proves semantic truth.

## Narrow design and implementation

Inspect actual text response/store/stream/render path: src/shared/text-lifecycle.ts, src/shared/transcript.ts, src/server/text/registry.ts, src/app/text-session.tsx, src/app/transcript-view.tsx, priming manifest/admission and related tests. Record the selected small data contract and affected boundaries before coding in the report; do not create a competing architecture document.

Authorize one text-YouTube-only evidence contract: each short source claim carries supplied segment ID(s) and a short exact supporting excerpt per ID. Code resolves timestamps and displayed excerpts against the current authorized source. The model does not author displayed timestamp numbers. Keep concise natural answer text; do not expose raw JSON/control markers in the product. Choose a bounded incremental format compatible with current API and output cap; do not assume JSON-schema support. Avoid duplicating whole captions in generation; short excerpts suffice.

Validate known IDs and exact nonempty quote membership within the identified original caption, with a documented minimal newline/whitespace policy if needed. No fuzzy matching, translated-quote matching, ordinal-to-ID guessing, nearest-timestamp repair or source substitution. Claims spanning captions may supply several separately validated pieces. Exact quote existence proves a source match only: an unrelated authentic quote still fails semantic support and must fail the live evaluation. Never label matched excerpts as fact-checked or verified claims. Preserve speaker attribution and uncertainty.

Resolve only from the current session's owned source snapshot; source change, Stop/restart, stale responses and late events must not attach evidence to another source/turn. Use narrow safe DTOs across boundaries; never raw database models or authorization secrets. Generate any YouTube link only from validated active video ID and stored time, never model URLs. If an ID/quote is absent or invalid, keep the claim visibly unconfirmed or omit its citation with a clear source-reference warning; never silently render it as grounded. An all-warning answer does not pass acceptance.

Streaming must remain useful: render completed natural-language claim units while evidence is pending; incomplete/truncated/stopped structures never become confirmed references or leak raw markup. Preserve partial text and distinguish incomplete from unsupported. Bound response/parser/evidence counts and lengths under existing caps. Do not increase512output/context caps, add extra model calls per answer, change models/dependencies, retrieve/download audio, add embeddings/tools, or redesign the UI. Voice/PDF output and wire behavior stay unchanged. Remove/supersede03E model-authored timestamp instruction for this scoped path and update exact manifest/version/admission bindings coherently.

## Verification

Use authored synthetic cases for correct ID/quote, unknown ID, right quote/wrong ID, empty/nonmatching quote, multiple supporting captions, Unicode/newlines/escaping, fabricated timestamps/URLs, hostile source instructions, malformed/oversized/incomplete output, Stop mid-claim, stale turns/source replacement and late completion. Verify every rendered timestamp comes from stored data. Include an authentic-but-unrelated quote case to document the semantic limitation; do not pretend lexical checks reject it automatically.

Pinned Node24.22.0/npm11.19.1: lint/typecheck/unit/build, test:owned-text and affected transcript-view/text lifecycle/mode-switch checks. Shared manifest/stream/store changes require owned-voice and voice-adapter regression coverage and unchanged voice/PDF evidence. Synthetic tests/build run isolated from real keys/database. Discover scripts before use; respect active browser tools. Apply docs/SKILLS.md: relevant React skill, bounded Impeccable clarify/harden for evidence pending/error states only, playwright-cli for permitted browser verification, OpenAI Docs for API facts and current pricing. No broad redesign or audit.

## Bounded real acceptance

NEW03F ledger, prior03E allocation closed: <=US$0.25 estimated, max2sessions/4responses TOTAL. Check official pricing/reserve costs before calls; start1session/2responses after offline pass. Optional second only after a specific diagnosed correction, never sampling until lucky. No automatic retries/additional model verification calls. Actual missing billing remains unknown.

Retain03D loopback-only/private-env/fresh-owned-visitor authorization. Normal production build, same Ks-_Mh1QhMc real uncached direct acquisition, <=2extractions; record actual language sq if unchanged. No easier short/English source substitution. Real UI/storage/provider; no mocks/seeded captions. Public voice enabled/YouTube disabled; no host/billing/DB administration changes or live voice calls.

Predetermine concise English summary with speaker attribution and the Princeton duration/audience follow-up. Check each material source claim and its excerpts against the full actual transcript. Verify all displayed timestamps and source links deterministically and semantic support independently. Correct facts plus unrelated citations FAIL; warning-only summaries FAIL. No exact-wording or exhaustive-summary requirement. Preserve complete preview/setup and Stop retention; delete only test visitor source via normal UI/API, shut down owned processes, verify private files/port. Response observation<=45seconds each. Save full evidence only in ignored artifacts/local/03f/.

## Return / stop

Return READY_FOR_REVIEW with docs/YOUTUBE_EVIDENCE_03F.md, PROJECT_STATE/TESTING, exact contract/bounds, changed hashes/build/HEAD/dirty identity, commands/exits, regression evidence, live claim-to-excerpt review, ledger/cleanup and remaining limits. If format cannot fit existing caps or needs broad transport/UI redesign, stop with concrete tradeoff before expanding scope. If summary still lacks semantic support after bounded test, report exact failure without further attempts or general reliability claims. No user phone test now; hosted/YouTube voice/device acceptance remain open.
