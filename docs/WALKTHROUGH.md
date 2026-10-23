# Assessment walkthrough

Record **10–15 minutes** using the release in [release status](RELEASE.md). Use nonprivate sources, hide credentials/private tabs/notifications, and check recording audio first. This guide is not evidence that the recording or physical-phone checks have passed.

| Time | Demonstration |
|---|---|
| 0:00–0:45 | Introduce one source, anonymous ownership, voice/text and the live app/repository. |
| 0:45–2:15 | Upload a PDF, inspect first/final pages and toggle theme. Explain selectable text and size limits. |
| 2:15–4:45 | Start real voice, hear a summary, interrupt, ask a detail, demonstrate mic/speaker mute and End. |
| 4:45–6:00 | Start text without microphone permission; ask a source-specific question and inspect its evidence. |
| 6:00–7:30 | In the hosted app, import an English-caption YouTube video, inspect its captions and ask a source-specific question. Explain the native-caption Supadata integration and provider quota. |
| 7:30–8:30 | Show source replacement and a real recovery path; identify physical phone versus viewport emulation accurately. |
| 8:30–10:00 | Explain src/app, src/server, src/shared, PostgreSQL ownership and WebRTC versus server-relayed text. |
| 10:00–11:30 | Show meaningful tests and the exact release evidence. Distinguish synthetic transport checks from live answers. |
| 11:30–12:30 | Explain accuracy/context limits, temporary history, manual expiry cleanup and dated dependency audit results. |
| 12:30–13:00 | Disclose verified AI coding assistance, including Codex for the readiness review; explain the editor, terminal, browser tests and hosting tools actually used. Show app/repository links and add the recording link after recording. |

Use actual responses; do not substitute scripted answers or prerecorded audio for live behavior. If a live attempt fails, show and explain it. For phone evidence, record device/OS/browser and audible interruption, keyboard and real connectivity behavior. Other untested platforms remain explicit gaps.

If hosted YouTube is blocked or provider quota is unavailable, explain the limitation and demonstrate the normal local workflow from the [README](../README.md#youtube-on-local-and-hosted-environments). The brief permits this exception. Confirm local extraction first; do not substitute a mocked transcript or claim that local success establishes hosted support.

Before submitting, open all three public links without signing in. Verify the recording's playback, sound, duration and sharing permissions. Include English-caption/provider availability and remaining limitations in the submission description.

## Physical-phone evidence to record after deployment

Record the phone model, OS version, browser/version, date and deployed revision. On the public app, use a nonprivate source: speak a question, confirm audible output, interrupt while it speaks, ask a follow-up, independently mute microphone and speaker, then End. Check microphone-denial text fallback, theme, keyboard and scrolling. Briefly disconnect and reconnect: the current implementation stops and preserves received text, but Start creates a fresh conversation. Record the actual result of each check; a screenshot alone cannot prove audible playback or interruption. Then add the public walkthrough URL and verify signed-out playback and sound.
