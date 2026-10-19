# Task 13A — clean verification and reviewer checklist

**Worker handoff: READY_FOR_REVIEW for bounded 13A only; PM decides acceptance.** PROJECT_STATE remains authoritative. Full Step 12 prerequisites and final Step 13/14 gates remain open. No keys, provider spending, deployment or real database operation is part of this task.

## No-key reviewer procedure

Follow [README](../README.md) in a new checkout/export with the pinned runtime, no `.env` and no borrowed ignored inputs. Run the nine commands from `npm ci` through `npm run test:boundaries`, in order. Expect generation/schema validation, lint/typecheck, 952 unit tests, a fresh production build, browser installation/cache availability, 16 smoke tests and 186 focused + 59 built HTTP boundary checks. The default shell must disable imports and explain that conversation is not connected. Ports 3100 and 3125 must be free. These checks use synthetic integration boundaries; they prove neither migrations nor live service/device behavior.

Local evidence lives under ignored `artifacts/local/13a/` in the primary checkout. Inspect `accepted-identity.json`, `accepted-commands.jsonl`, `reviewer-identity.json`, `reviewer-commands.jsonl`, both `*-http-boundaries.json`, `audit.json` and `changed-files.sha256.json`. Logs are named `<copy>-<command>.log`; original wrapper failure is retained in `initial-attempt.json` and `accepted-ci-first-attempt.log`. Nothing requires private configuration or a phone.

## Worker evidence

Arrival: clean `main`, HEAD `5befba04084fe1df93d3a9b1583e04e51fc3cecd`. Accepted application: `8af058eac64f80e0748e294dc8f0d044feada571`; prior accepted 12A build `R_ixIZMDu1UXwpkBpA8ws` is historical, not reused. Delivery is a dirty documentation-only diff; no commit/push. Four intended changed files: README, this checklist, PROJECT_STATE and TESTING.

Exports retained for PM inspection:

- `C:\Users\Myk\Desktop\projects\Genius_Innovation_lab\talk-to-document-13a-accepted`: exact accepted application commit, created using `git archive --format=tar --output=<primary artifacts/local/13a/accepted.tar> 8af058eac64f80e0748e294dc8f0d044feada571`, then `tar -xf <archive> -C <new directory>`.
- `C:\Users\Myk\Desktop\projects\Genius_Innovation_lab\talk-to-document-13a-reviewer`: fresh archive of arrival HEAD `5befba04084fe1df93d3a9b1583e04e51fc3cecd`, overlaid with only the four intended tracked documentation changes. This is a labeled snapshot, **not** the old commit. Reporting-only final evidence additions are identified below.

Neither export initially contains `.env`, `node_modules`, `.next`, `.tools`, `artifacts/local` or `test-results`. No main-checkout generated/ignored files are copied. Both generate their own dependencies/build/test outputs. External pinned runtime reused: `C:\Users\Myk\Desktop\projects\Genius_Innovation_lab\talk_to_YTVideo-and-PDF\.tools\node-v24.22.0-win-x64`; Node `v24.22.0`, npm `11.19.1`. Existing npm package cache and installed Playwright browser cache may be reused. `npm ci` can contact package/audit registries; `browser:install` success with cache reuse does not prove a fresh browser download. Telemetry is disabled. No DB/provider call is authorized: empty real keys, no inherited application configuration, unusable `127.0.0.1:1` database, production gates off; boundary runner's isolated PDF gate uses synthetic Prisma and external-fetch blocking with random nonreported signing material.

Lock SHA256 before/after both runs must remain `8298d67c21966e2e71103e3b773e1b54f491817364c54887302b99d65032abc8`. Exact UTC/exits and final build/results are appended after execution. Existing detailed test procedures remain in [TESTING](TESTING.md) and [11C](BOUNDARIES_11C.md).

Initial attempt: Windows PowerShell 5 treated npm's stderr deprecation warning as a terminating error under the local evidence wrapper's `ErrorActionPreference=Stop`. Wrapper exit1; npm exit and exact end time were not captured. Preserved output, corrected only ignored capture tooling to record native exit, reran installation and continued the same exact export. No repository setup/product/dependency fix was needed; no failure is relabeled PASS.

Corrected stale README claims: removed historical status wall and obsolete next tasks 11C/06A; replaced two-test smoke/bootstrap descriptions; documented implemented ownership/expiry and local cleanup with its SQL/scheduling gaps; separated disabled clean shell from configured public PDF; removed blanket unavailable-import and incomplete-storage claims. No historical evidence was deleted from PROJECT_STATE. Keys/account funding alone do not solve unsupported accounting or absent production factories.

## Later gates — all NOT_RUN by 13A

Earlier evidence retains its original identity; every row below requires a later fresh run on the intended build. Follow the linked procedures rather than improvising a demo.

| Gate / prerequisite | Action and expected observation | Required evidence / procedure | 13A status |
|---|---|---|---|
| Near-limit PDF: PM-selected enabled deployment, intended migrated DB and synthetic fixtures | Import valid 25,000,000-byte PDF; check full beginning/middle/end markers, reject next-byte oversize and unsupported inputs; review mixed-layout ordering | Build/deploy ID, exact bytes, all markers, status/error categories, timing/resource limits; [PDF proof](PDF_PROOF_04A.md), [PDF UI](PDF_UI_05A.md), TESTING Gate C | NOT_RUN |
| Local direct captions: explicit live-test assignment, accessible videos, direct configured, managed keys off, both caches bypassed | Import two uncached real videos through app; compare beginning/end captions, language/timing; grounded local answer follows only after integration | IDs/language/type if known, adapter/config, uncached outbound proof, actual captions comparison and result; [03A](CAPTION_PROOF_03A.md), [03B](CAPTION_PROOF_03B.md), TESTING B1 | NOT_RUN |
| Hosted direct vs managed: PM deployment permission; direct uses no managed keys, managed needs separately verified credentials/quota/authorized usage | Force direct uncached on real host, retain success or exact blocker; separately force managed native segments/cache bypass; then automatic chain and warm cache across five varied videos | Exact build, IDs/provider/config/bypass, cold/warm time, timing normalization, distinct direct/managed outcomes and failures; [fallback](CAPTION_FALLBACK_06C.md), [cache](CAPTION_CACHE_06A.md), TESTING B2/B3 | NOT_RUN |
| Exact supported model accounting and production integration: reviewed tokenizer/framing support, PM model/access decision and assigned implementation | Establish justified source/instructions/history/output/wire accounting and fail-closed over-limit cases; integrate real source ownership/expiry, fresh credential/transport factories and acknowledged source loading before questions | Exact model/revision/tokenizer/framing provenance, measured fit/limit tests, source binding and factory exclusion review, no silent truncation; [07C blocker](MODEL_BUDGET_07C.md), [priming](CONTEXT_PRIMING_07B.md), [boundaries](BOUNDARIES_11C.md). Keys alone insufficient | NOT_RUN / accounting BLOCKED |
| Grounding: accounting + production integration + real provider authorization | Same 12-question set for plain vs lossless structured context, both source types, near-end facts, follow-ups, absent answer, embedded instruction, A→B and two visitors | Prompt/context/build/model version, expected source evidence, actual answers, coverage/accuracy/latency/errors; [evaluation](CONTEXT_EVALUATION_07A.md), TESTING Gate D | NOT_RUN |
| Voice/interruption: enabled grounded integration, actual mic/speaker and provider access | Ask/hear, interrupt audible playback, relevant follow-up, mute/unmute/Stop/restart, stop during priming and replace source; accurate transcript and no lingering resources | Device/OS/browser/network/model/build, actual audible observations, interruption and first-audio median/worst, cleanup evidence; [voice](VOICE_CONTROLS_UI_08C.md), [interruption](VOICE_INTERRUPTION_08B.md), TESTING E | NOT_RUN |
| Denied-mic text: enabled grounded text integration, fresh browser with microphone denied | Start directly in text, type question and receive real streamed source answer without prior voice; switch modes with one owner and clear history policy | Real question/answer/source evidence, zero mic acquisition, fresh session/resource observations; [text](TEXT_SESSION_UI_10B.md), [switching](MODE_SWITCHING_10C.md), TESTING F | NOT_RUN |
| Physical phone/keyboard/network: enabled full workflow and available iOS Safari/Android Chrome | Source entry/preview, real on-screen keyboard, text/voice, playback recovery, focus/scrolling, connectivity change during setup/answer, explicit fresh recovery; actual back/forward restore where supported | Exact device/OS/browser/network/build, permissions, real audio/keyboard/recovery observations, BFCache persisted observation or NOT_RUN; [mobile](MOBILE_REVIEW_12A.md), [recovery](BROWSER_RECOVERY_11B.md), TESTING F | NOT_RUN |
| SQL cleanup and scheduling: PM-selected isolated empty disposable PostgreSQL, explicit safe harness opt-in | Run real cleanup race/lock/rollback/cancel suite; verify live/future rows retained and only own fixtures removed; separately approve bounded production dry-run/execute and free-host scheduling | Target isolation, exact commands/exits/counts/teardown, no unrelated deletion, production schedule/execution evidence; [cleanup runbook](CLEANUP_11A.md) | NOT_RUN |
| Final deployed build/submission: prior gates passed, PM release decision and intended database | Clean install/build, authorized migrations/status, deploy exact build, rerun full reviewer script; verify app/repo/video access and 10–15 minute walkthrough | Commit/dirty/build/deploy/migration identities, final gate matrix, links and recording; TESTING Gate G and [plan Steps 13–14](IMPLEMENTATION_PLAN.md) | NOT_RUN |

## Acceptance mapping / PM handoff

1. Exact accepted export, separate labeled documentation snapshot and excluded-input inventories: identity manifests and retained directories.
2. Existing nine commands, pinned runtime, synthetic environment, build before HTTP/browser: command JSONL/logs and HTTP report.
3. UTC/exits/build IDs, unchanged lockfile and retained wrapper failure: manifests, command table and audit.
4. Concise README with current verified scopes and canonical status links: documentation diff; no new architecture or feature claim.
5. Executable no-key procedure plus prerequisites/actions/observations/evidence/NOT_RUN for later gates: checklist above and linked detailed runbooks.
6. Tracked configuration, client/build boundary, Markdown link/script validation and changed-file hashes: `audit.json`, `changed-files.sha256.json`; no private `.env` read or candidate values printed.

PM should compare hashes, inspect both identities and fresh reports, review README/status consistency and decide bounded 13A acceptance. Do not mark full Step 13/14 complete, enable conversation or start another task from this worker handoff.
## Final command evidence — 19 October 2026 UTC

All rows below are local Windows with Node24.22.0/npm11.19.1, empty real keys and unusable loopback DB. Expected/observed: install and generation/schema/lint/types/build succeed; unit952, smoke16, boundary186units+59HTTP pass; browser cache available. Every required command exited0 in both copies. No real database, provider, mobile audio or deployment claim.

| Command | Accepted UTC start–end | Reviewer snapshot UTC start–end | Result / exit (both) |
|---|---|---|---|
| `npm ci` | 04:38:21.4819585Z–04:39:03.6885025Z | 04:40:13.9985438Z–04:40:55.0945021Z | 499 packages installed; audit findings retained / 0 |
| `npm run lint` | 04:39:03.6995200Z–04:39:10.6577573Z | 04:40:55.1035417Z–04:41:04.1335108Z | No lint warnings/errors / 0 |
| `npm run typecheck` | 04:39:10.6628736Z–04:39:15.0535087Z | 04:41:04.1935200Z–04:41:08.8975327Z | Prisma + Next types + TypeScript / 0 |
| `npm test` | 04:39:15.0575091Z–04:39:18.4888308Z | 04:41:08.9016330Z–04:41:12.3044996Z | 952/952, no skips / 0 |
| `npm run db:validate` | 04:39:18.4923974Z–04:39:19.6945735Z | 04:41:12.3090067Z–04:41:13.5436689Z | Schema valid; no connection/migration / 0 |
| `npm run build` | 04:39:19.6975735Z–04:39:26.5208295Z | 04:41:13.5466692Z–04:41:20.8775811Z | Fresh production build / 0 |
| `npm run browser:install` | 04:39:26.5318476Z–04:39:27.4324915Z | 04:41:20.8840893Z–04:41:21.7590962Z | Chromium cache reused / 0 |
| `npm run test:smoke` | 04:39:27.4364918Z–04:39:31.7846198Z | 04:41:21.7822672Z–04:41:26.2120393Z | 16/16 default-disabled checks / 0 |
| `npm run test:boundaries` | 04:39:31.7896475Z–04:39:35.3133332Z | 04:41:26.2170401Z–04:41:29.7640375Z | 186/186 units + 59/59 HTTP; external fetch0 / 0 |

Fresh builds: accepted **6Z6iACnge_2zKkfs2q1BI**; reviewer snapshot **wx1sdHPfrnU6LivCf18cF**. Logs resolve as `artifacts/local/13a/<accepted-or-reviewer>-<command-with-run-prefix-removed-and-colons-replaced-by-hyphens>.log` (`npm test` is `*-test.log`). JSONL rows also store absolute log paths. Lockfile before/after both copies matches the stated SHA256. Both install499packages/audit500; installed browser cache reused. No missing committed setup/fixture dependency was found for these required commands; other historical suites were not relabeled freshly run.

Additional `npm --prefix <accepted-export> audit --json` exited1 because five high-severity affected package entries were reported along the eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces development-tool chain. This is one underlying braces advisory propagated through the chain, not five independently confirmed vulnerabilities. Exact UTC/exit in `npm-audit-command.json`, full registry result in `npm-audit.json`. No audit fix/upgrade performed; PM must triage outside13A.

The validated reviewer snapshot contains the revised setup instructions and checklist before these reporting-only final results were appended. README instructions are unchanged afterward. `reviewer-validated-docs.sha256.json` identifies those input documents separately from final delivery hashes; final static link/script/status audit applies to delivery. No old commit is claimed for the overlay or final documentation.

Static-audit tooling failures retained: initial byte-exact comparison did not account for committed `.gitattributes` converting `*.cmd` to CRLF in git archive; only normalized-equal `.cmd` paths are now allowed and recorded. Second attempt exceeded Node execFileSync default1MiB stdout buffer reading the committed skill font index; increased ignored audit-tool buffer only. `audit-first-command.json`, `audit-first-failure.txt`, `audit-second-command.json` and `audit-second-failure.log` preserve both exit1 attempts. No export/application change; affected static audit alone rerun.


Final static checks: both builds **13 client chunks / 13 production traces** omit checked server/test markers, default config parsers fail closed, production conversation factories remain absent, boundary external fetch attempts0 and ports3100/3125 rebound. Tracked configuration review covers15paths; only `.env.example` is tracked and its five secret assignments are blank. Heuristic tracked-text credential/private-key candidate count0 (not an exhaustive secret guarantee); no private.env read. All103relative Markdown links across the four changed documents resolve; named npm scripts exist. Inspected `reviewer-shell-mobile.png`: default unavailable import/conversation states, readable layout; smoke assertions additionally check keyboard/overflow/errors. Both exact input inventories and CRLF-only archive attribute path are in `audit.json`. Final four changed-file SHA256 entries: `changed-files.sha256.json`. All prior build/deployment identities remain historical, public03eb7d8 was not retested, no disposable directory cleanup performed.
