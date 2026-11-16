# Verification status

Completed locally on November 15–16, 2026 (America/Toronto), Node 24.22.0. Raw commands, output, failed attempts and successful reruns are in [verification.txt](verification.txt). The latest exit code for each of **30 named verification commands is zero**.

| Check | Observed result |
|---|---|
| Full Node unit suite | **1,663 passed**, zero failed/skipped (the previous 1,660 count plus three new regression tests) |
| TypeScript, ESLint, production Next build | Passed; build ID `6AMe1bn-0yfNx5hgEwb4d` |
| Production shell smoke | 18 Playwright cases passed |
| Proof text / voice UI, injected providers | 10 / 10 Playwright cases passed |
| Mode switching | **160** Playwright cases passed |
| Recovery | **264** Playwright cases passed |
| Text / voice session UI | 108 / 208 Playwright cases passed |
| Transcript view | 44 Playwright cases passed |
| PDF / YouTube source UI | 96 / 99 Playwright cases passed |
| Source/PDF/YouTube HTTP, mocked captions, cache, coalescing, fallback | All seven scripts passed; PDF suite includes worker deadlines, aborts, size boundaries and cleanup |
| Owned text / voice integration | 537 / 734 assertions passed with synthetic provider/Prisma boundaries |
| Voice preparation / browser adapter | 35 scenarios / 662 checks passed; no live provider/media |
| Workspace flows / layouts | Passed; layout tests use a fresh workspace for idle/error geometry |
| English/source-size preparation, caption entities, request boundaries | Passed |
| Baseline and optimized k6 matrix + failure probes | Passed all k6 HTTP thresholds and functional assertions; **512 MiB RSS target missed** in optimized high-concurrency runs |
| Final benchmark smoke | Passed on a fresh local PostgreSQL cluster; pool disposal checked |
| Existing PostgreSQL cleanup integration | 12 real-database scenarios passed, including rollback, overlapping cleaners, concurrent replacement, cancellation and lock waits; zero fixture rows left, four clients/pools released |
| 128-item history restoration probe | Passed at 1/5/10 concurrent restorers with deterministic ACKs; interruption rejects and a fresh restore succeeds |

The ten Playwright suites total **1,017 passing test cases**. Additional scripted browser assertions above are not added to that count. These are Chromium desktop/mobile viewport emulations, not physical device or audio measurements.

## Failures found and resolved

- Initial lint caught four new unused-variable/export warnings; corrected and rerun successfully.
- The request-boundary integration expected six transactions. Four source reads now use a single SELECT; updated the assertion to **two DELETE transactions**, preserving the six read and one delete assertions and all ownership/origin/method checks.
- The older owned-text integration expected a mode switch to clear history and demand another Start. Updated it to verify the existing documented continuation behavior: retained dialogue, automatic HTTP reconnection and no question resubmission.
- Workspace layout and source-size scenarios assumed switching an already-started conversation yielded a fresh idle session. Changed their setup to reload/reimport for independent idle/error checks. All layout, size-denial, source-preview and recovery assertions remain. An intermediate incorrect source-size expectation is also retained in the raw failure log; the final test exercises voice and text preparation independently through the production routes.

These test corrections did not change UI or conversation behavior. The backend optimization retains stored-record validation and all owned-source filters; unit and HTTP regressions check foreign/expired/malformed sources and safe storage failures.

## Scope and checks not run

- Live OpenAI Realtime, direct YouTube/Supadata integration, production endpoints, real microphones/audio, and end-to-end WebRTC load were not exercised: this task used isolated local services and deterministic external dependencies, with no paid calls.
- `db:probe` against the configured application database and operator production cleanup were not run. Real PostgreSQL persistence, restart, lock handling and cleanup were instead exercised only on newly created disposable clusters; `.env` database targets were never used.
- Duplicate focused unit commands are covered by the full unit run. Instrumented coverage collection was not repeated; no coverage percentage is claimed.
- No distributed-instance, remote database/TLS, failover, arrival-rate or hours-long soak testing. The longest load stage is 30 seconds. No deployment, commit, push or cloud change.

## Artifact and teardown checks

`scripts/bench/report.mjs` regenerated the comparison from raw files; the README's request metrics match it. The benchmark files contain synthetic data only. A local scan compared changed/untracked files against configured private API/database/signing values without printing them and found **zero matches**; no visitor-cookie tokens were found in evidence. Generated PostgreSQL clusters, fixture cookies, downloaded binaries, browser traces/screenshots and build output remain under existing ignored directories. All test/benchmark listening ports were verified released. `git diff --check` passed.
