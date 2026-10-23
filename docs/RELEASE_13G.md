# Release 13G — 23 October 2026 Toronto

User explicitly authorized deployment and remaining checks. PM owns this release; no active implementation task. Accepted 13C–13F candidate has no new application changes. Deployment/check results are pending below until observed.

## Target and preflight

Existing Render Free Ohio service `srv-dba4fuvbtjjs73dong50`, https://talk-to-document-4pre.onrender.com, repository myk0laUA/talk_to_YTVideo-and-PDF, main. Fresh dashboard read confirmed old live commit `52ba0a013c5693127343915b05a685fc6adefc7a`, deploy `dep-dbcidpd9fdbs73a1gt9g`. Build command `npm ci --include=dev && npm run build`; existing start command enables owned PDF/text/voice and disables YouTube/proof routes. Existing DATABASE_URL, NODE_VERSION, PORT, OPENAI_API_KEY and VISITOR_COOKIE_SECRET names are present; secrets were not revealed or changed. Retain Free hosting and existing activation scope.

Main was 20 commits ahead of fetched origin/main with no divergence before release freeze. No Prisma schema/migration changes from deployed commit. Pinned `npm run db:status` on the intended Render database passed: all three migrations applied. No migration execution/reset needed.

## Cleanup operations

Real disposable PostgreSQL cleanup/race verification previously passed in 13D. Current production CLI execution was authorized by this release request and limited to expired rows in the verified existing application database. Pinned commands, times and results are in ignored `artifacts/local/release-13g/commands.jsonl` and named logs:

- Dry-run at 04:01:27 UTC: 21 expired Source rows, zero eligible TranscriptCache rows, zero deletes, complete, exit 0.
- Bounded `--execute` at 04:01:57 UTC: 21 Source rows deleted, zero TranscriptCache rows, complete, exit 0.
- Confirmation dry-run at 04:01:58 UTC: zero eligible rows in either table, complete, exit 0.

All runs: batch-size 100, max-rows 1000, max-batches 20, timeout-ms 30000. No live rows selected. No shared database fixture insertion or blanket table deletion.

Operational model for this free assessment deployment is manual. PM operates during release; Myk is the ongoing operator/escalation owner. Run a dry-run and inspect it before bounded execution before the demo, after testing when data expires, and once daily while assessment access remains open. Use the same commands from CLEANUP_11A. Capture sanitized reports in artifacts/local/cleanup/<date>. Exit 2 requires another deliberate bounded pass after reviewing counts; exit 1/unknown outcome requires inspection before retry. Access expiry is automatic; physical deletion depends on these operator runs. No scheduler or unattended deletion SLA is claimed.

## New bounded hosted-check allocation

All previous experiment ledgers remain closed. This release request authorizes one new bounded verification allocation, not a model comparison: small authored nonprivate PDF, at most one text session/two short responses and one voice session/one response, each at most 120 seconds. Stop on the first provider/contract failure; no blind retries. Capture usage when exposed and distinguish estimates from billed cost. No key/credential/SDP in evidence. Physical audible speech and interruption remain user checks.

Current official gpt-realtime-2.1 pricing checked 23 October: text input $4/M, output $24/M; audio input $32/M, output $64/M. Source: https://developers.openai.com/api/docs/models/gpt-realtime-2.1. Text worst-context bound for two responses at 128,000 input plus 2,048 output each is $1.122304. Use a **$3 estimated allocation** for the bounded text and voice transport check, with tiny PDF/context and no ongoing microphone stream in automated verification. The application output cap remains 2,048; this operational allocation is not a provider-enforced billing cap. If automated voice requires uncontrolled audio capture, defer that portion to the explicit user phone test instead. Record actual/estimated spend after checks; no claim of $0 billing without usage evidence.

## Remaining gates

Release commit/deployment identity, hosted PDF/limits/ownership/recovery, text/voice results, physical phone, recording and anonymous repository/video access are pending. Hosted YouTube remains disabled under the accepted local-demo exception. Prior semantic failures and accepted development dependency residual remain documented; no perfect-answer claim.
