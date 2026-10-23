# Final submission checklist

Status: updated after PM deployment on 23 October 2026 (Toronto). Hosted checks passed as recorded in [Release 13G](RELEASE_13G.md); phone and recording gates remain pending. Use [the release gate matrix](RELEASE_CANDIDATE_13C.md) and [recording script](WALKTHROUGH_14A.md).

| Item | Verified public value / result |
|---|---|
| Application HTTPS URL | https://talk-to-document-4pre.onrender.com — public HTTPS PASS |
| Public repository URL | https://github.com/myk0laUA/talk_to_YTVideo-and-PDF — unauthenticated HTTP 200 and README visible, 23 October |
| Final recording URL | **PENDING user recording** |
| Recording duration, 10–15 minutes | **PENDING** |
| Release commit / Next build / deployment ID | a7ef8fb02134c0386011e30818574ec9cdd15c22 / -GBIbY7cdnluCBPKqweeN / dep-dbddpfd9fdbs73apgoc0 |
| Hosted PDF, text, voice, recovery and affected near-limit checks | PDF/ownership/limits/replacement recovery/text PASS; voice preparation PASS only; actual audio/phone/connectivity PENDING. See 13G. |
| Physical phone model, OS, browser, date, audio/keyboard results | **PENDING user test after deployment** |
| Disposable SQL cleanup/races and production cleanup operation plan | **SQL validation PASS** on PostgreSQL18.6,12scenarios/zero fixtures. Manual operation owner/cadence established; production cleanup removed 21 expired sources, confirmation zero eligible; see 13G. See [13D acceptance](PM_ACCEPTANCE_13D.md). |
| Retained development-tool advisory disposition | **PM accepted documented assessment residual**; full audit remains FAIL. See [PM review](PM_RELEASE_REVIEW_13C.md). |

PM release sequence (items 1–3 completed to the bounded scope in 13G; physical audio/device remains open):

1. Review the candidate manifest, repair diff, command exits and unresolved gates. Freeze the exact commit, including intended new files and experimental-code deletions. No blanket staging or deletion.
2. Completed: disposable SQL suite in 13D, production status/cleanup and manual cadence in 13G.
3. Apply reviewed migrations to the intended application database, deploy the frozen commit and record all identities. Keep hosted YouTube disabled. Verify the actual hosted PDF, larger text/voice, affected limit and recovery paths under separately authorized spend.
4. Have the user test a physical phone: permissions, audible speech, interruption, independent microphone/speaker mute, Stop, offline/reconnect, theme, source preview/replacement and keyboard/composer. Record failures honestly; a viewport screenshot is not this test.
5. Record the walkthrough. Use approved nonprivate sources. Show the real local YouTube application route and disclose the hosted-caption restriction. No scripted response or prerecorded audio may masquerade as live output.
6. In a signed-out/incognito reviewer context, open all three links. Confirm repository files and README, usable app, video playback, audio, duration and sharing permissions. Record time and reviewer result. Check the release commit is the one demonstrated.

Suggested submission text, after replacing pending fields:

> Talk to a Document — [verified app link], [verified public repository link], [verified recording link]. One anonymous source and conversation, PDF extraction, Realtime WebRTC voice and microphone-free text. Hosted YouTube acquisition is disabled because the host's direct-caption requests were blocked; the recording demonstrates the documented local application path under the accepted cloud exception. Answers can omit or misstate source details; full-source loading does not guarantee accuracy. See the release report for tested environments, limits, retained advisory and remaining limitations.

Do not submit this text with unresolved placeholders or imply that historical builds are the final deployment.
