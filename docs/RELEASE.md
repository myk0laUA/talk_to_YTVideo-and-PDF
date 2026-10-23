# Release status

Updated 23 October 2026 (Toronto).

| Item | Evidence |
|---|---|
| Live application | https://talk-to-document-4pre.onrender.com |
| Deployed application revision | `a7ef8fb02134c0386011e30818574ec9cdd15c22` |
| Render deployment | `dep-dbddpfd9fdbs73apgoc0` — succeeded/live |
| Hosted Next build | `-GBIbY7cdnluCBPKqweeN` |
| Public repository | https://github.com/myk0laUA/talk_to_YTVideo-and-PDF — anonymous access/README verified |
| Database | Three committed migrations applied; no release schema change |
| Cleanup | 21 expired sources removed after dry-run; confirmation found zero eligible rows |

## Verified on the deployed revision

Small and exact 25,000,000-byte PDFs imported successfully; 25,000,001 bytes was rejected while preserving the previous source. All 12 synthetic test pages, including the final marker, were present. Foreign visitors could not read/delete the source. Cross-origin mutation and disabled proof routes were rejected. Successful replacement removed the old active source.

One live text session answered two short questions from an authored three-page PDF. Coordinator/location/tile count were correct; the follow-up correctly returned the final-page access phrase and said ticket price was unspecified. Stop preserved the transcript. Source preview, dark/light theme and reload behavior passed on desktop. This is a small semantic sample, not a general reliability claim.

Voice preparation/cancel passed with `gpt-realtime-2.1`; no fresh voice credential/audio session was exercised by that check. Local release checks passed 59 HTTP boundary checks and 18 smoke tests. Earlier isolated PostgreSQL verification passed 12 cleanup/race scenarios. Offline unit/browser checks cover additional behavior with synthetic boundaries.

The bounded live check used one text session/two responses. Actual billing was unavailable in the UI; the conservative two-response text estimate was $1.122304 under the stated 128k-input/2048-output assumptions, within a $3 operational allocation. No automatic experiment remains active. Detailed historical evidence is available at Git revision `392670a`; removed reports are not relabeled as passing results.

## Remaining submission checks

1. Physical phone: record model/OS/browser and actual voice playback, interruption, independent mic/speaker mute, Stop, microphone-free text, keyboard, scrolling, theme and offline recovery. Desktop emulation does not satisfy this.
2. Record the [10–15 minute walkthrough](WALKTHROUGH.md), including the explicitly labeled local YouTube path. The exact previously reported 13-hour video and original upstream caption payload remain unverified.
3. Verify the recording's public link, playback, audio and duration before submission. App/repository public access already passed.

Hosted YouTube remains disabled under the accepted local-demo exception. Source accuracy is imperfect: a historical PDF exception question failed despite the larger model; that failure remains a known limitation.

## Dependency residual

The 22 October review found five high development-tool package entries from one `braces` advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through the Next ESLint toolchain. The production-only audit found zero and production traces excluded the chain. No compatible patch was available at that review; the development-only residual was accepted for the assessment. This is dated evidence, not a current or exhaustive security guarantee. No forced dependency downgrade was applied.

## Repository cleanup verification

The cleaned checkout contains 296 tracked files instead of 716 (about 81% fewer tracked bytes). Agent skills/configuration, task prompts, historical reports/manifests and retired model-comparison runners were removed. Reusable transport/measurement fixtures moved into tests/helpers. Only tests of the removed experiment runners and a historical-report assertion were removed; application regression coverage remains. Prior evidence is recoverable at revision 392670a. Runtime behavior, dependency lockfile, database schema and migrations are unchanged; the deployed revision above remains current.

A fresh isolated export without private configuration passed npm ci, lint, typecheck, all 1,635 unit tests, schema validation, production build, 18 browser smoke tests and 59 HTTP boundary checks (all exit 0). Build: bXAqYyjkFDcq8v25h8nSe. Local Markdown links resolve. Intermediate smoke attempts hit a temporary runner's invalid Windows output path and PATH/teardown errors; the corrected runner passed with normal teardown. Sanitized commands/results remain ignored under artifacts/local/repo-cleanup. No live provider request or database mutation was needed for this cleanup.
