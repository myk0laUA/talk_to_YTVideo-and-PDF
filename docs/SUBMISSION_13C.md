# Final submission checklist

Status: prepared for PM review on 22 October 2026 (Toronto). This template is not evidence that a deployment, recording or anonymous access check has passed. Use [the release gate matrix](RELEASE_CANDIDATE_13C.md) and [recording script](WALKTHROUGH_14A.md).

| Item | Verified public value / result |
|---|---|
| Application HTTPS URL | **PENDING PM verification** |
| Public repository URL | **PENDING anonymous access check** (configured origin: https://github.com/myk0laUA/talk_to_YTVideo-and-PDF) |
| Final recording URL | **PENDING user recording** |
| Recording duration, 10–15 minutes | **PENDING** |
| Release commit / Next build / deployment ID | **PENDING PM freeze and deployment** |
| Hosted PDF, text, voice, recovery and affected near-limit checks | **PENDING** |
| Physical phone model, OS, browser, date, audio/keyboard results | **PENDING user test after deployment** |
| Disposable SQL cleanup/races and production cleanup operation plan | **SQL validation PASS** on PostgreSQL18.6,12scenarios/zero fixtures. Production operation plan still **PENDING PM**. See [13D acceptance](PM_ACCEPTANCE_13D.md). |
| Retained development-tool advisory disposition | **PM accepted documented assessment residual**; full audit remains FAIL. See [PM review](PM_RELEASE_REVIEW_13C.md). |

PM release sequence:

1. Review the candidate manifest, repair diff, command exits and unresolved gates. Freeze the exact commit, including intended new files and experimental-code deletions. No blanket staging or deletion.
2. Provision the isolated cleanup database and run the procedure in the release report. Decide production cleanup ownership, cadence, monitoring and failure response.
3. Apply reviewed migrations to the intended application database, deploy the frozen commit and record all identities. Keep hosted YouTube disabled. Verify the actual hosted PDF, larger text/voice, affected limit and recovery paths under separately authorized spend.
4. Have the user test a physical phone: permissions, audible speech, interruption, independent microphone/speaker mute, Stop, offline/reconnect, theme, source preview/replacement and keyboard/composer. Record failures honestly; a viewport screenshot is not this test.
5. Record the walkthrough. Use approved nonprivate sources. Show the real local YouTube application route and disclose the hosted-caption restriction. No scripted response or prerecorded audio may masquerade as live output.
6. In a signed-out/incognito reviewer context, open all three links. Confirm repository files and README, usable app, video playback, audio, duration and sharing permissions. Record time and reviewer result. Check the release commit is the one demonstrated.

Suggested submission text, after replacing pending fields:

> Talk to a Document — [verified app link], [verified public repository link], [verified recording link]. One anonymous source and conversation, PDF extraction, Realtime WebRTC voice and microphone-free text. Hosted YouTube acquisition is disabled because the host's direct-caption requests were blocked; the recording demonstrates the documented local application path under the accepted cloud exception. Answers can omit or misstate source details; full-source loading does not guarantee accuracy. See the release report for tested environments, limits, retained advisory and remaining limitations.

Do not submit this text with unresolved placeholders or imply that historical builds are the final deployment.
