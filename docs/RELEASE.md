# Release status

Updated 23 October 2026 (Toronto).

| Item | Evidence |
|---|---|
| Live application | https://talk-to-document-4pre.onrender.com |
| Deployed application revision | `5575392997af0578d938a00f6bee2bf69322c140` |
| Render deployment | `dep-dbdq221srm7s73cjevtg` — succeeded/live at 2:03 PM EDT, 23 October |
| Hosted Next build | `TMVJ9F5jHR-tDNcJ_DCot` |
| Public repository | https://github.com/myk0laUA/talk_to_YTVideo-and-PDF — anonymous access/README verified |
| Database | Three committed migrations applied; no release schema change |
| Cleanup | 21 expired sources removed after dry-run; confirmation found zero eligible rows |

## Verified on the deployed revision

Hosted YouTube is enabled through Supadata native English captions. The supplied MIT lecture `OTkq4OsG_Yc` imported all 750 segments; the browser preview showed English, the final caption at 30:46.29, and decoded apostrophes. A separate TED video `Ks-_Mh1QhMc` imported 44 longer segments in English with provider `supadata`, including its final section at 20:31.99. Segment granularity differs by upstream caption track; these two samples do not establish universal video availability.

One live text answer correctly identified Kevin Desmond, the Monday/Wednesday/Friday 3:30–5 schedule, and both beginners-league credit options (cash in one tournament or play ten). These facts were checked against the displayed supplied captions. Stop preserved the answer. Voice preparation/cancel succeeded with `gpt-realtime-2.1`, without minting a credential or starting audio. PDF replacement and preview, old-source removal, foreign-visitor read/delete denial, non-English and cross-origin rejection, and all four disabled proof endpoints passed. The 19 HTTP checks and browser evidence are saved locally under ignored `artifacts/local/hosted-youtube-release`.

The SVG theme switch is live and visually verified in the hosted browser. Both themes worked; physical Safari behavior remains a phone check. Read-only migration status confirmed all three migrations applied on the intended database. No schema change was made.

This verification allocation is closed: two caption import attempts, one text response, zero voice credentials, zero generated transcriptions and no automatic retries. Estimated caption use is at most two native-transcript credits; actual provider billing/cache charges were not observed. The conservative text estimate is $0.561152 using the previous 128k-input/2048-output assumptions, not measured billing. No automatic experiment remains active.

## Previous release evidence

The following checks ran on `a7ef8fb02134c0386011e30818574ec9cdd15c22` (build `-GBIbY7cdnluCBPKqweeN`), not the new revision. The new release changes theme icons and tests, plus hosted caption configuration; it does not change PDF processing or conversation code.

Small and exact 25,000,000-byte PDFs imported successfully; 25,000,001 bytes was rejected while preserving the previous source. All 12 synthetic test pages, including the final marker, were present. Foreign visitors could not read/delete the source. Cross-origin mutation and disabled proof routes were rejected. Successful replacement removed the old active source.

One live text session answered two short questions from an authored three-page PDF. Coordinator/location/tile count were correct; the follow-up correctly returned the final-page access phrase and said ticket price was unspecified. Stop preserved the transcript. Source preview, dark/light theme and reload behavior passed on desktop. This is a small semantic sample, not a general reliability claim.

Voice preparation/cancel passed with `gpt-realtime-2.1`; no fresh voice credential/audio session was exercised by that check. Local release checks passed 59 HTTP boundary checks and 18 smoke tests. Earlier isolated PostgreSQL verification passed 12 cleanup/race scenarios. Offline unit/browser checks cover additional behavior with synthetic boundaries.

The bounded live check used one text session/two responses. Actual billing was unavailable in the UI; the conservative two-response text estimate was $1.122304 under the stated 128k-input/2048-output assumptions, within a $3 operational allocation. No automatic experiment remains active. Detailed historical evidence is available at Git revision `392670a`; removed reports are not relabeled as passing results.

## Remaining submission checks

1. Physical phone: record model/OS/browser and actual voice playback, interruption, independent mic/speaker mute, Stop, microphone-free text, keyboard, scrolling, theme and offline recovery. Desktop emulation does not satisfy this.
2. Record the [10–15 minute walkthrough](WALKTHROUGH.md), including hosted YouTube. The exact previously reported 13-hour video and original upstream caption payload remain unverified.
3. Verify the recording's public link, playback, audio and duration before submission. App/repository public access already passed.

Hosted YouTube no longer requires the previous local-demo exception. Source accuracy is imperfect: a historical PDF exception question failed despite the larger model; that failure remains a known limitation.

## Dependency audit

The 22 October review found five high development-tool package entries from one `braces` advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through the Next ESLint toolchain. The production-only audit found zero and production traces excluded the chain. No compatible patch was available at that review; the development-only residual was accepted for the assessment. This is dated evidence, not a current or exhaustive security guarantee. No forced dependency downgrade was applied.

On 23 October, a fresh full `npm audit --json` returned zero reported vulnerabilities, and Render's clean install also reported zero. The lockfile was unchanged; this is an updated advisory-service result, not a claimed code fix or exhaustive security guarantee.

## Repository cleanup verification

The cleaned checkout contains 296 tracked files instead of 716 (about 81% fewer tracked bytes). Agent skills/configuration, task prompts, historical reports/manifests and retired model-comparison runners were removed. Reusable transport/measurement fixtures moved into tests/helpers. Only tests of the removed experiment runners and a historical-report assertion were removed; application regression coverage remains. Prior evidence is recoverable at revision 392670a. Runtime behavior, dependency lockfile, database schema and migrations are unchanged; the deployed revision above remains current.

A fresh isolated export without private configuration passed npm ci, lint, typecheck, all 1,635 unit tests, schema validation, production build, 18 browser smoke tests and 59 HTTP boundary checks (all exit 0). Build: bXAqYyjkFDcq8v25h8nSe. Local Markdown links resolve. Intermediate smoke attempts hit a temporary runner's invalid Windows output path and PATH/teardown errors; the corrected runner passed with normal teardown. Sanitized commands/results remain ignored under artifacts/local/repo-cleanup. No live provider request or database mutation was needed for this cleanup.

The subsequent test audit retired six redundant experiment/fixture tests and consolidated seven historical UI scripts into two current workspace suites. All 1,629 remaining units and the extended offline suites passed; see [Testing](TESTING.md) for scope, coverage limits and the recorded fixture timeout. Meaningful ownership, expiry, limits, race and teardown checks remain. Results are ignored under artifacts/local/test-review; the dependency lockfile and schema are unchanged. Local build 2SLf4nTdRnpJkhOhDHFou includes the SVG theme icons, visually checked at mobile width and covered by the workspace theme/layout runs. Render rebuilt the same reviewed source into the hosted build recorded above.
