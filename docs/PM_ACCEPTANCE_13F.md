# Task 13F — PM acceptance, 22 October 2026 Toronto

**ACCEPTED for the bounded caption-decoding scope.** No blocking finding. No active worker task remains. Resume release preparation, not another parser/model/UI experiment.

Reviewed dirty main at HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, local production build **hdDQACZgIfajgeL0RF7GG**. All 51 task/evidence hashes and four reference hashes matched before PM tracker edits; 716 unchanged arrival entries reconcile, including retained deletions. Seven expected arrival edits plus six additions match the worker inventory. No application edits, provider/DB calls, spend, commit, push or deployment in this review.

## Review findings

The correction is confined to direct-caption raw XML normalization and cache representation versioning. Exactly two decoding passes handle the demonstrated extra escaping layer and decimal/hex references consistently, independently of the installed parser's incomplete entity allowlist. Timing, language, order and duplicates remain unchanged; final content bounds still apply. Invalid/unknown references are retained. Supadata JSON, PDFs, source reads, validators, packing and rendering do not decode again.

Old direct cache version 1 is a miss; version 2 stores canonical text. Managed cache version 1 remains valid. Existing owned sources are not mutated behind active sessions. Failed reimport retains the prior source. The literal-notation ambiguity is explicitly accepted for this bounded fix: intentionally encoded entity notation can become a character after the extra pass; deeper layers deliberately remain encoded. This is not a promise to recover arbitrary author intent.

All content remains untrusted plain text. The browser tests confirm markup-looking captions create no child elements, execute no sentinel, and cause no external requests. No HTML rendering workaround or dependency upgrade was introduced.

## Fresh PM evidence

Pinned Node 24.22.0; commands, UTC timestamps and exit codes in `artifacts/local/13f-pm/review/commands.jsonl`:

- `--require ./tests/text-relay/network.cjs --conditions=react-server --test` with caption-entities, captions, caption-cache, english-captions, supadata, caption-automatic and youtube-sources unit files: **224 PASS**, no failures/skips, exit 0. New tests include identical saved/preview/text/voice-preparation content, old/new cache behavior, failed replacement and final-size checks.
- `--conditions=react-server scripts/verify-caption-entities.mjs`: **PASS**, exit 0, on the reported production build. Fresh 390px import and 1440px cache hit both show 19 segments / 429 characters / 52 words. One injected three-request extraction, one cache write, zero forbidden network/page errors/added caption elements; server teardown recorded. Four screenshots retained. PM inspected mobile initial preview and desktop inert-markup preview.
- Hash and arrival checks: `hashes.json` and `preservation.json` in the same PM directory. Worker evidence remains untouched; later PM documentation intentionally changes tracker hashes.

The browser uses actual production UI/routes/parser with injected upstream and in-memory Prisma. No live-service, PostgreSQL, phone/audio or model-answer claim follows. Worker 554-test suite, lint/typecheck/build and retained intermediate failures were reviewed through matching evidence rather than all repeated.

## Next actions and limitations

For the user's local confirmation, restart the local app on this code if needed, then use Source actions → Replace source and reimport the same URL. Reopening an old preview does not repair stored text. Confirm contractions display correctly; no extra model call is needed just to verify this bug.

The user's original upstream payloads have not been captured. The reproduced encoding mechanism and canonicalization are verified offline; exact-video confirmation remains a user/live observation. Prior 13E long-video capacity and live English-response caveats remain.

Next PM work: exact release freeze, production cleanup/configuration/migration checks, deployment and bounded hosted PDF/text/voice/recovery verification. User physical-phone check, recording and signed-out access checks follow. Hosted YouTube stays disabled under the accepted local-demo exception. No project-completion or deployment claim is made here.
