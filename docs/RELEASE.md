# Release status

## Voice reconnection and repository cleanup — 23 October 2026

Active voice sessions now reconnect after connection loss while retaining visible dialogue and independent mute choices. Each attempt reauthorizes the source, primes a new provider connection and restores completed turns with exact final acknowledgments before enabling the microphone. Partial/untranscribed speech stays visible when available but is not restored as completed context. No question or interrupted answer is automatically replayed. Three consecutive connection failures stop automatic recovery; End, source/mode changes and page departure cancel it. History is temporary and bounded; a full reload cannot recover it. Text-mode recovery remains explicit.

Offline verification passed 1,646 unit tests, lint, typecheck, production build, 18 smoke cases, the full 248-case recovery suite and 16 additional bounded-retry/cancellation cases across four viewports. Voice adapter verification passed 126 unit cases and 623 browser/HTTP checks across 48 scenarios. The local reconnection build is `ofzO_qetSnCN-to1B35bk`. Browser evidence uses simulated media and does not establish physical audio. Cleanup moved ten browser configurations into `tests/config` and 28 verification helpers into `tests/integration`; all ten configurations still discover their suites. `scripts` retains database cleanup/persistence operations. The environment template now contains only 12 normal application settings; diagnostic flags remain disabled by default.

One bounded live protocol check used the production voice model/settings over Realtime WebSocket: three restored history items were acknowledged, no unsolicited response occurred, and a follow-up correctly answered “It holds 18 tiles.” One connection and one response were used; no audio input/output or caption calls. The provider reported 33 output tokens and zero input tokens in that response's usage payload; this is recorded as returned, not a billing guarantee. The separate allocation is closed with a conservative $1 ceiling. Evidence is ignored under `artifacts/local/voice-resume` and `artifacts/local/test-review/reconnect-*`. This proves history insertion and that specific follow-up, not real-phone WebRTC recovery or general model accuracy.

Application revision `b8e87f5c9b73da137bf17e293a60310e2f6d37dc` deployed successfully at 3:47 PM EDT on 23 October, Render deployment `dep-dbdrj5ff3r2c73bqidtg`. Served build: `_sQ7J5QJzUuV5kYi5KyPC`. All 19 fresh hosted HTTP checks passed: English YouTube import/complete preview, PDF replacement/preview, source isolation and invalidation, cross-origin/non-English rejection, disabled proof routes, voice preparation/cancel without issuing credentials, and removal of the authored test source. The new hosted allocation is closed: one caption import (at most one native-caption credit), one PDF upload, no model responses and no voice credentials. The deployed homepage was inspected with both imports enabled. Read-only database status confirms all three migrations are applied. Remaining user checks: real-phone speech/audible playback, interruption, follow-up after a network interruption, and the public 10–15 minute walkthrough. The independent local assessment report remains unchanged.


Updated 23 October 2026 (Toronto).

## Reviewer remediation

Starting from reviewed revision `10eecee`, normal PDF and caption ingestion no longer has a process-lifetime ceiling. Hourly and concurrency controls remain; imports recover after the window resets without a server restart. Busy and timed rejections are distinct, with `Retry-After` on timed rejections and actionable UI copy. Caption admission now honors injected limits consistently. Regression checks exceed the former 40/16 totals, including invalid attempts and later successful imports.

Import controls now disclose the existing PDF page/text and caption language/size restrictions. This resolves the mismatch between controls and enforcement; it does not remove those restrictions or establish compliance with an unrestricted-input interpretation of the brief. English-only remains the user's explicit product choice. Offline/online notices were shortened after a physical-phone screenshot; connection recovery still requires a fresh session. No conversation-resume feature or new audible-phone evidence is claimed.

Local checks: lint, typecheck and production build passed; 1,637 unit tests, 96 source UI cases, 99 YouTube UI cases, 62 caption-coalescing checks, 51 source HTTP checks, 59 YouTube HTTP checks, 59 boundary HTTP checks, 533 owned-text checks, 20 source-limit checks, six workspace flow scenarios and 138 layout states passed. These use synthetic provider/storage boundaries, not live model accuracy or physical audio. Admission checks used build `hfbXjo29bsd-vj7-xZ1aF`; the subsequent notice-only build is `fm2q7ELnA2vlbkX65p9Sm`.

Initial verification failures were retained: a new malformed-PDF test incorrectly expected 415 rather than the existing 400 multipart validation result; a new coalescing assertion expected another network request despite the existing 24-hour warm cache; workspace flow assertions still expected the old caption wording. Expectations were corrected to the verified contracts, and complete affected suites passed. No application failure was relabeled as a pass. Sanitized evidence is ignored under `artifacts/local/test-review/remediation-*`.

The final notice build passed 18 smoke tests and all 138 layout states. Recovery ran 248 cases: 240 passed and eight failed solely on the removed "server may still be unreachable" wording. Updating that assertion to "Connection may be back" produced eight passing targeted reruns across all four viewports; behavior assertions were retained. Read-only status confirmed the intended hosted database has all three migrations applied.

Revision `cad5cb3c7c67d21abb667f381fe7191727d98701` deployed successfully at 3:25 PM EDT on 23 October. The 19 fresh hosted HTTP checks passed: native English YouTube import/complete preview, PDF replacement/preview, old-source invalidation, foreign visitor read/delete denial, cross-origin/non-English rejection, disabled proof routes, voice preparation/cancel without credentials, and removal of the test's own source. The TED source returned 44 segments and 20,100 characters. Public root returned 200 and the build ID below; warm root latency was 525 ms, not a cold-start guarantee.

In the hosted browser, an authored three-page PDF imported and all pages matched. One live text answer correctly gave Mira Solen, Violet Pier, 18 cobalt tiles, KITE-482 and an unspecified ticket price, with matching page references. Stop preserved the answer and disabled Send. This small semantic check does not establish general accuracy. The hosted import guidance was inspected; phone-sized light/dark layout screenshots were inspected locally. The user's phone screenshot confirms the earlier reconnect notice was displayed, but does not establish audible playback or interruption.

This new live allocation is closed: one native-caption import, one completed text response, zero voice credentials, zero generated transcriptions and no automatic retries. Estimated native-caption use is at most one credit; the conservative prior 128k-input/2048-output text estimate is $0.561152, not measured billing. Evidence is ignored under `artifacts/local/reviewer-remediation/`. Physical-phone speech/playback/interruption and the public 10–15 minute walkthrough remain submission gates; the user will record now that code and deployment are ready. The independent audit of `10eecee` is preserved unchanged locally; these dated corrections do not rewrite its original verdict.

## Submission-readiness review

This review starts from `d1ec6f2`. The changes below prepare the repository for submission; deployment is a separate operation. The deployed revision below is unchanged. The existing structure, UI, database schema and conversation architecture are retained.

Changes: cancelled text API bodies now promptly release readers, abort listeners and admission leases; malformed UTF-8 is rejected instead of silently changing a question before provider submission. Three new regression cases failed on the original handler and passed after the fix. The unused `js-tiktoken` dependency and its exclusive `base64-js` dependency were removed, along with the unused ScrapeCreators setting in `.env.example`. Existing guards against public secret variables remain. README/setup/environment/transport/deployment guidance and the walkthrough were clarified.

Verification used Node 24.22.0/npm 11.19.1 in an isolated export without private configuration. Backend integration checks used build `XC8MjOzI66nhxy2GtA_xS` with the handler fix. After dependency removal, a second clean install, core checks, production build and browser suites passed on final build `X1yaJbzxQ02TCpRJpJjhJ`. No application code changed between these builds.

| Commands | Observed result |
|---|---|
| `npm ci --no-audit --no-fund` | Exit 0; final lockfile installed 499 packages and generated Prisma. ESLint 9 emits a deprecation warning. |
| `npm run lint`, `npm run typecheck`, `npm run db:validate`, `npm run build` | All exit 0 after the final clean install; no database or provider key required. |
| `npm test` | 1,632 passed, zero failures/skips; includes the three new regressions. |
| `npm run browser:install`, `npm run test:smoke` | Exit 0; 18 smoke tests passed at desktop/390px widths. |
| `npm run test:boundaries -- --http-only` | 59 HTTP checks passed; zero forbidden network calls. |
| `npm run test:owned-text` | 533 HTTP/browser checks passed, including a rerun on the final clean build; no live calls. |
| `npm run test:owned-voice`, `npm run test:voice-adapter`, `npm run test:voice-preparation` | Exit 0; 734 owned-voice checks, 623 adapter checks and 35 preparation scenarios; synthetic provider/media boundaries. |
| `npm run test:workspace` | Six flow scenarios and six layout scenarios/138 geometry states passed. Welcome and blocked-playback screenshots were inspected at 390px. |
| `npm run test:source-ui`, `npm run test:youtube-ui` | 87 PDF/source and 99 YouTube UI cases passed. |
| `npm run test:text-session`, `npm run test:voice-session`, `npm run test:transcript-view`, `npm run test:mode-switch` | 108, 208, 44 and 156 browser cases passed respectively. |
| `npm run test:recovery -- --workers=2` | Unchanged full rerun: 248 passed. See the original failure below. |
| `npm run test:text`, `npm run test:voice` | Ten diagnostic browser cases each passed; synthetic transport/media. |
| `python -m pip install -r tests/integration/fixture-requirements.txt`, `python tests/integration/generate-pdf-fixtures.py` | Exit 0 in a private virtual environment; 13 synthetic PDF fixtures generated. |
| `npm run test:pdf:http`, `npm run test:sources:http`, `npm run test:youtube:http` | All exit 0; actual PDF parsing/size limits and owned-source routes, with synthetic storage/YouTube upstream. |
| `npm run test:captions:mocked`, `npm run test:captions:cache`, `npm run test:captions:coalescing`, `npm run test:captions:fallback` | All exit 0 with mocked upstreams. |
| `npm run test:source-limits`, `npm run test:caption-entities` | Both exit 0; full-source preparation and caption decoding passed. |
| `npm audit --json` | Exit 0; zero reported vulnerabilities on the final lockfile. This is advisory-service evidence, not an exhaustive security guarantee. |
| `git diff --check`; local documentation/lockfile checks | No whitespace errors; all 22 local Markdown links/anchors resolve; manifest and lockfile dependencies agree. |

The first four-worker `npm run test:recovery` attempt exited 1: 247 passed and one failed at `page.goto` with Chromium `net::ERR_NO_BUFFER_SPACE`, before reaching application assertions. The unchanged two-worker full rerun passed. This is an observed browser-runner/resource flake, not a claimed application fix; the failed log/trace was retained separately. No test assertion or retry policy was weakened.

Repository review covered the tracked tree, imports, manifests/lockfile, configuration, routes, ownership/ingestion/conversation boundaries, tests and documentation. All 116 source code modules are referenced or are framework/worker entry points; no further module deletion was justified. A pattern scan of 1,987 blobs across 146 reachable commits (about 129 MB) found no current private configuration values, private keys or provider-token signatures. The two credential-URL matches were synthetic error strings in database tests. No `.env`, PDF uploads, recordings or private-key files were found in tracked history. This is a scoped scan, not a guarantee that every possible secret format is detectable.

Fresh live checks on 23 October:

- Anonymous access to the public GitHub repository succeeded; the hosted homepage returned HTTP 200.
- On the existing host, one synthetic 10,778-byte PDF uploaded successfully, all 12 nonempty pages were returned by the preview API, and the review's own source was deleted successfully. No existing visitor's source was accessed or changed.
- `npm run proof:captions:local -- --allow-public-youtube` exited 0: direct retrieval returned HTTP 200 for `Ks-_Mh1QhMc` (428 English segments, 20,100 characters) and `dQw4w9WgXcQ` (61 English segments, 2,089 characters). This proves local extraction for those attempts, not normal database-backed ingestion or comparison with the original caption tracks. The diagnostic retains `RETRIEVED_REQUIRES_EXCERPT_REVIEW` status.
- No OpenAI credential was minted and no OpenAI or Supadata request was made during this review. Hosted YouTube and live model/audio evidence below remain historical; they were not rerun or relabeled.

The physical-phone audio check and public 10–15 minute recording remain outstanding. Real PostgreSQL cleanup/race tests could not run because Docker's engine was unavailable and no isolated disposable database was supplied. Existing hosted data was not used for those tests. Current local logs, synthetic fixtures and screenshots are ignored under `artifacts/local/submission-readiness/`.

## Deployed release

| Item | Evidence |
|---|---|
| Live application | https://talk-to-document-4pre.onrender.com |
| Deployed application revision | `cad5cb3c7c67d21abb667f381fe7191727d98701` |
| Render deployment | `dep-dbdr8eoae00c73ao4qng` — succeeded/live at 3:25 PM EDT, 23 October |
| Hosted Next build | `YYhD9Pz5cLSyqkFKr2LfR` |
| Public repository | https://github.com/myk0laUA/talk_to_YTVideo-and-PDF — anonymous access/README verified |
| Database | Three committed migrations applied; no release schema change |
| Cleanup | 21 expired sources removed after dry-run; confirmation found zero eligible rows |

## Earlier hosted verification (`5575392`)

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
