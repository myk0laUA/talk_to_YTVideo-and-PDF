Current deployment: see [Release 13G](RELEASE_13G.md) for exact a7ef8fb / hosted build / deploy identity and completed checks. Use that release for the recording; phone/audio and the recording itself remain unverified.

# Final walkthrough — Step 14

Updated for candidate13C, 22 October 2026 (Toronto). Target **13 minutes**, within the required 10–15 minutes. This is a recording script, not a recording or a passed deployment gate. The user records; PM checks release identity, prerequisites and public access using [SUBMISSION_13C](SUBMISSION_13C.md).

## Before recording

Complete the unresolved gates in [RELEASE_CANDIDATE_13C](RELEASE_CANDIDATE_13C.md). Choose the exact release commit, Next build and deployment ID. Prepare one nonprivate text PDF and one captioned video already approved for a local demo; inspect source passages and choose a summary plus one checkable detail question for each. Do not repeat historic model comparisons or spend without the separately authorized live allocation.

Use a clean browser profile, uncluttered desktop and approved microphone. Hide `.env`, keys, provider dashboards, cookies, authorization headers, raw network panels, personal notifications and terminal history. The phone segment must name the actual device/OS/browser or be labeled **viewport emulation**. Keep public-host and local-app origin/build labels visible when switching. Rehearse camera/audio capture; a transcript is not evidence of audible playback.

## Recording sequence

| Time | Show and do | Narration / evidence boundary |
|---|---|---|
| 00:00–00:45 | App, repository and intended use. Briefly show the release identity. | “One source, anonymous visitor, voice or text. This is the release demonstrated today.” State any gate still open; do not call an unverified candidate final. |
| 00:45–02:15 | **Hosted PDF:** import the approved PDF, inspect first and final source sections, close preview. Toggle light/dark theme. | Explain selectable text, no OCR, complete extraction and explicit size/context limits. Distinguish extraction success from model accuracy. |
| 02:15–04:45 | Start voice. Show the wait for readiness, ask the planned summary, then interrupt and ask the detail question. Demonstrate independent mic/speaker mute and End voice. | Actual microphone, audible response and audible interruption must be captured. If playback is blocked, use Tap to enable sound and show recovery. Do not claim displayed words were all heard. |
| 04:45–06:00 | Choose Text mode, Start chat, ask the planned detail question without mic permission. Inspect the relevant source passage. | Explain the genuine server text relay, fixed larger model and cleared mode history. Show the real response, including any error or omission; do not replace it with a scripted answer. |
| 06:00–07:30 | **Local application YouTube:** visibly switch to the labeled local app, import the prepared captioned URL, inspect captions and ask a short source-specific question. | “Hosted direct-caption retrieval was blocked. This is the same application running locally under the accepted cloud exception; hosted YouTube remains disabled.” If this local attempt fails, show it and report the gate honestly. |
| 07:30–08:30 | Source replacement/removal, Stop and a brief reviewed recovery path. Show the phone interaction or separately labeled current phone evidence. | Replacement owns one source. Restart needs explicit action; partial text/draft retention is not permanent history. Emulated offline events cannot stand in for real connectivity. |
| 08:30–10:00 | Compact architecture view: `src/app`, `src/server`, `src/shared`, Prisma schema and the two transport paths. | PDF/captions → owned PostgreSQL Source → complete source preparation/ACK → WebRTC voice or server-relayed text. No accounts, embeddings or vector DB. Browser gets a temporary voice credential; permanent key stays server-side. |
| 10:00–11:30 | Release report command table and a few meaningful assertions: ownership/expiry, blocked pre-ACK send/mic, late-resource teardown, source replacement and cleanup. | State exact build and local/synthetic versus live scope. Mention 1,742 units and current browser/HTTP evidence only if still applicable to the frozen release. Show actual failure evidence or unresolved rows, not a wall of green badges. |
| 11:30–12:30 | Limits and security: one-hour anonymous ownership, 60 starts per mode/hour, output cap, process-local limits, bounded bodies and cleanup operation status. | Explain known PDF semantic omission and context rejection. Disclose the unresolved development-tool advisory and PM disposition. Expiry denies access; physical deletion requires the cleanup operator. |
| 12:30–13:00 | AI assistance disclosure and public app/repository/video submission checklist. | “AI assistants helped write and verify code and documentation. Responses can still be wrong; compare them to the source.” State any remaining limitation precisely. |

Timing: 45 + 90 + 150 + 75 + 90 + 60 + 90 + 90 + 60 + 30 = **780 seconds / 13:00**. These are planned slots, not measured playback. Keep actual recording between 10 and 15 minutes. If a live response takes longer, shorten code narration; never hide a failure or silently swap in a prerecorded result.

## Architecture talking points

- Server entry points authorize signed visitors and source ownership/expiry before provider work. Browser owner IDs are not trusted. Method/origin/fetch-metadata checks, bounded bodies, deadlines and sanitized errors protect the routes.
- PostgreSQL stores complete extracted source text and separately caches public native captions. Successful replacement is transactional. Services recheck expiry and ownership; a database client alone is not authorization.
- Complete source/settings acknowledgments gate readiness. Voice uses WebRTC and an ephemeral credential; text uses a server WebSocket with a browser HTTP stream. Both defaults are gpt-realtime-2.1, with 2,048 output tokens and disabled truncation. No validated exact provider capacity or guaranteed grounded accuracy is claimed.
- One mounted conversation owner releases listeners, streams, media and pending work on Stop, mode/source changes or lifecycle failure. Stale events cannot revive it. Cross-mode persistent history is outside the implemented scope.

## Evidence to open during the recording

Use [13C](RELEASE_CANDIDATE_13C.md) for the current candidate, [TESTING](TESTING.md) for exact checks, [13B](DEPENDENCY_TRIAGE_13B.md) for advisory triage, [11A](CLEANUP_11A.md) for cleanup semantics and [03L](USER_SOURCE_COMPLETION_03L.md) for the retained semantic failure. The older14A draft is retained in Git history and the13C local evidence backup; its absent-factories/accounting claims no longer describe the implementation.

Screenshots, traces and synthetic test responses are supplementary evidence. Label them with their own build/environment/date. Do not claim old hosted success validates the current release or that viewport tests validate a physical phone. Final public app/repository/video links and recording duration remain pending until PM verifies them in a signed-out reviewer context.
