# Release 13G — 23 October 2026 Toronto

User explicitly authorized deployment and remaining checks. PM owns this release; no active implementation task. Accepted 13C–13F candidate has no new application changes. Observed deployment and check results are recorded below. This is not full project completion.

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

## Release identity and verification

Frozen application commit **a7ef8fb02134c0386011e30818574ec9cdd15c22** was pushed to main and manually deployed to the existing service. Render showed **Deploy succeeded | Live**, exact SHA, build success and service live at 04:05:40 UTC (23 October). Deployment **dep-dbddpfd9fdbs73apgoc0**; served Next build **-GBIbY7cdnluCBPKqweeN**. Auto-deploy remains disabled; subsequent documentation-only commits do not change the running application. No hosting plan, secret or activation-scope changes.

Explicit freeze inventory reconciled 732 candidate paths (including 16 intentional removals); private exact-value/pattern scan found no candidate secret findings. This is a bounded scan, not proof of absence. Historical transcript/font-license/verifier trailing whitespace made staged diff-check exit 2; retained as formatting-only evidence in staged-whitespace.log, not reported as a passing check. No application patch was made in this turn.

| Verification | Actual result |
|---|---|
| Pinned local boundary command | `node --conditions=react-server scripts/verify-boundaries.mjs --http-only`: 59 PASS, exit 0, zero external calls; local accepted build hdDQACZgIfajgeL0RF7GG |
| Pinned local smoke | `npm run test:smoke`: 18 PASS, exit 0; production build reused, no app edits |
| Render build/start | `npm ci --include=dev && npm run build`, existing gated start command; dashboard successful/live exact release |
| Hosted HTTP harness | `node artifacts/local/release-13g/hosted-http.mjs`: PASS, exit 0, 04:08:20–04:08:37 UTC, zero model calls |
| Hosted PDF | Small 201; exactly 25,000,000 bytes 201; 25,000,001 bytes 413; failed replacement retained previous source; 12-page final marker present |
| Ownership/recovery | New visitor bootstrap 401/cookie; foreign read/delete 404; successful replacement made old source unavailable; cross-origin POST 403; fixture deletion 200 |
| Feature gates | YouTube 503; actual `/api/realtime/client-secret`, `/api/proof-source`, `/api/proof-pdf`, `/api/proof-captions` all 503 |
| Voice preflight only | Real owned-source preparation 201, policy provider-voice-full-source-default-2026-10-22-v8 / gpt-realtime-2.1; cancellation 200. No voice credential minted, WebRTC/audio NOT tested by this check |
| Hosted browser text | IAB desktop, three-page authored release-check.pdf; one real session, two finalized source-grounded answers; no microphone request; Stop preserved four turns and disabled send |
| Preview/theme/reload | All three authored pages visible; dark/light rendered; light persisted after reload; reload returned to empty source entry without restarting conversation |
| Anonymous repository | No authentication/cookie headers: GitHub repository HTTP 200, repository and README visible, 04:10:00 UTC |

Hosted API responses were checked for accidental owner/database/credential fields and returned no-store. Browser semantic sample: Q1 coordinator/location/tile count → Mira Solen / Violet Pier / exactly 18, matching pages 1–2. Q2 access phrase/ticket cost → KITE-482 / price unspecified, matching page 3. Both answers were in English. This proves this small sample, not universal summary reliability or long-source provider capacity. No retry or further model comparison.

Evidence under ignored `artifacts/local/release-13g/`: commands.jsonl, named logs, freeze-inventory.json, hosted-http.json, anonymous-repository.json, text-answers.txt, render-live.png, hosted-text-pass.png, hosted-light.png and authored fixture. HTTP fixtures were deleted. The browser's nonprivate authored PDF is left to normal ownership expiry/cleanup after reload. No raw credential, cookie, SDP or audio is in committed evidence.

## Allocation outcome

PM used exactly one real text session/two responses and zero voice credentials or audio sessions. Session was explicitly stopped after the second answer (within the 120-second operational window). Token/billed usage is not exposed in the captured UI, so actual billed cost is **unknown**, not zero. Conservative two-response text estimate remains **at most $1.122304 under the stated model/context assumptions**; it is not a provider billing guarantee. PM automatic model checks are closed; no retries or extra experiments. The single short physical voice check remains for the user under the $3 operational allocation; further demo recording usage is separate and must stay deliberate/bounded.

## Remaining gates and next actions

1. User physical phone on this deployment: record model/OS/browser; source upload/preview, heard English answer, interruption, separate microphone/speaker mute, Stop, text without microphone, keyboard/scroll/theme, and brief offline/reconnect with explicit restart. Current desktop and earlier user reports do not close this fresh device gate. Other unavailable phone platform stays an explicit gap.
2. User records 10–15 minute walkthrough from WALKTHROUGH_14A.md, including current hosted PDF voice/text and explicitly labeled local YouTube demo. The latest caption entity and English-selection fixes have offline evidence; exact originally reported upstream payload/13-hour video and fresh live local YouTube are not revalidated by this release. Demonstrate a short working captioned source in the recording rather than claim unlimited video support.
3. PM verifies provided recording URL anonymously, playback/audio/duration and release identity; then closes submission. App and repository anonymous checks already passed. Real connectivity and audible behavior remain pending, not waived.

Original Steps 01–14 are preserved. Step 11 cleanup operation plan/execution is now established; Step 12 physical device, Step 13 final device/recovery evidence and Step 14 recording remain incomplete. No new worker implementation task unless a concrete defect is found. Hosted YouTube disabled/local exception, model accuracy limitations, output/context bounds, manual cleanup and accepted development dependency residual remain disclosed. Free Render can cold-start slowly.
