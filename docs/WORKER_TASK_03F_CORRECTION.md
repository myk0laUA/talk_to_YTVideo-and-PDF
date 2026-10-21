# Task 03F correction — diagnose rejected evidence and preserve readable answers

Use prompts/WORKER_PROMPT.md and required repository handoffs. Sole active task, continuation of03F, not a new feature. PM does NOT accept03F for completion or deployment. Preserve current work for correction; do not roll back unrelated accepted setup/pacing work.

## Evidence / concrete failures

Read YOUTUBE_EVIDENCE_03F.md. PM matched16hashes and freshly passed51tests covering youtube-evidence, owned-text and text-http-controller. Synthetic resolver/source isolation checks pass, but live summary had zero matched references and follow-up became warning-only. Readable-answer preservation is materially worse than03E. No raw response or rejection-category trace was retained, so root cause is UNKNOWN. Completed386/101output tokens do not prove truncation.

Inspect src/server/text/youtube-evidence.ts: line-by-line JSON parsing and claimPrefix require a narrow framing/order. Pretty printing, fences, arrays, reordered fields, or plain text are plausible failure modes; exact ID/quote matching is a different issue. Do not diagnose the live run from these hypotheses alone or repeatedly tweak the prompt.

## First stage — no provider calls

Inspect existing ignored artifacts for any already retained exact response content; do not assume it exists. Add private, bounded resolver diagnostics distinguishing malformed/framing/schema, unknown ID, quote mismatch, bounds, incomplete output and missing references. Record counts and first rejection category without secrets. Pure unit diagnostics must preserve the distinction between parsing failure and evidence failure.

Create authored regression cases for equivalent valid record formatting (pretty printing/fences/reordered fields), incremental escapes/partial chunks, interrupted generation, plain-text fallback and invalid evidence. Demonstrate current answer-loss cases before correcting. Choose a bounded parser/contract adjustment that preserves recognizable natural claim text while leaving evidence unconfirmed; do not expose raw JSON, blindly regex-strip arbitrary payloads, infer missing claims, invent source facts or mark malformed evidence matched. If text cannot be safely recovered, show a clear answer-format failure instead of an empty claim with only a reference warning. Bounds apply to parsed units, not decorative newlines. Support only documented bounded formats; no permissive repair engine.

Keep quote/ID membership and stored timestamp guarantees strict. Whitespace-only normalization is permitted only if a demonstrated mismatch motivates it, is documented/tested and maps the displayed excerpt back to the exact original source; no fuzzy/translational/nearest-ID repair. Authentic unrelated quotes still require semantic review. Source/session isolation, partial Stop retention, caps, full captions, setup, voice/PDF remain unchanged.

## Evidence-first bounded live allowance

NEW correction ledger, prior03F closed: <=US$0.25 estimated TOTAL and at most3responses/2sessions. Verify pricing and reserve each call before sending. No extra model calls for validation. Use standing03D loopback/private-env/fresh-owned-visitor permissions, same public Ks-_Mh1QhMc transcript, <=2uncached acquisitions, no hosted/voice/managed-provider/admin operations.

Before any call, prepare a task-only bounded capture of the model's actual output-text string BEFORE sanitizing projection, alongside resolver reason categories and terminal state. This explicit authorization covers only responses to this public test transcript in ignored artifacts/local/03f-correction/; no headers, credentials, raw event envelopes, user/private documents or permanent production content logging. Capture must be wired/tested offline first, with no debugger breakpoints, extra model request, behavior-altering response interception or per-token disk I/O. Flush once at terminal/Stop. Raw evidence stays local and out of committed reports; copy only authored/sanitized structural reproductions into tests. Preserve exact capture-layer patch/build differences.

If no usable old response exists, first live call is the previously failed factual follow-up to obtain a precise structural/rejection reproduction, on existing contract behavior with diagnostic capture only. Stop that session afterward. Do not spend a second response on the known-broken contract. If exact evidence is already available, skip this diagnostic call and retain budget.

Implement the narrow demonstrated correction and regression offline. Then use at most two final responses in a corrected normal production build for the same summary/follow-up. Any task-only observer must be documented as a build difference; no hidden capture in release sources. Check every material claim/excerpt semantically against source and every timestamp deterministically. Confirm readable answer text even when references cannot match. Warning-only or zero-reference answers FAIL grounded acceptance. If this bounded correction still fails, return exact reason and a small alternative design; no further sampling, scope expansion or deployment.

## Verification and handoff

Use pinned Node24.22.0/npm11.19.1. Run lint/typecheck/unit/build plus owned-text and affected transcript-view/text-session tests; shared transcript/manifest changes require owned-voice/voice-adapter regression evidence. Synthetic environments have no real credentials. Select skills under docs/SKILLS: bounded React/Impeccable clarification only for changed UI states, permitted browser tools/playwright-cli, OpenAI Docs for current facts. No design overhaul.

Real test cleanup: explicit Stop, retain answer/preview, delete only owned test source normally, close exact task processes/browser, verify private files/port. Public voice remains enabled; public YouTube disabled. No phone request.

Return docs/YOUTUBE_EVIDENCE_03F_CORRECTION.md, tracker updates, hashes, exact commands/exits/build identity, diagnosis from actual raw output versus parser categories, red/green regressions, raw-capture safety/bounds, final live claim checks and fresh ledger/cleanup. Distinguish functionality accepted offline from live acceptance. Do not label generic parser hardening as the proven live fix without matching the captured failure.03F remains IN_PROGRESS until PM review; later tasks remain unassigned.
