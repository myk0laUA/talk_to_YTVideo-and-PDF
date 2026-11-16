# Audit verification and Git status

Executed November 16, 2026 with Node 24.22.0/npm 11.19.1. **All 30 regression commands passed**, including **1,663 unit tests** and **1,017 Playwright cases**. This does not include the failed dependency-security audit. Raw command/output/exit evidence: [verification.txt](verification.txt).

The full suite ran with `BENCH_OUTPUT_DIR=benchmarks/audit node scripts/verify-reliability.mjs`. Providers were disabled/mocked and fixture servers local. Browser suites include isolated bundles of real UI/controllers with injected transports; they are not all end-to-end Next routing or live WebRTC tests. Production-build HTTP and default-disabled-route checks are separate. Test timings overlap clean-clone installation/smoke and must not be used as performance evidence.

| Named command in runner | Exit | Seconds |
|---|---:|---:|
| `unit` | 0 | 30.16 |
| `lint` | 0 | 6.67 |
| `typecheck` | 0 | 1.28 |
| `build` | 0 | 4.85 |
| `smoke` | 0 | 3.28 |
| `text-proof-browser` | 0 | 7.48 |
| `voice-proof-browser` | 0 | 8.53 |
| `sources-http` | 0 | 15.12 |
| `youtube-sources-http` | 0 | 8.29 |
| `pdf-http` | 0 | 68.15 |
| `captions-mocked` | 0 | 14.10 |
| `caption-cache` | 0 | 5.34 |
| `caption-coalescing` | 0 | 21.42 |
| `caption-fallback` | 0 | 37.60 |
| `owned-text` | 0 | 23.01 |
| `owned-voice` | 0 | 12.01 |
| `voice-preparation` | 0 | 1.72 |
| `voice-adapter` | 0 | 31.90 |
| `mode-switch` | 0 | 75.96 |
| `recovery` | 0 | 120.04 |
| `workspace-flows` | 0 | 16.89 |
| `workspace-layout` | 0 | 36.32 |
| `english-preparation` | 0 | 32.73 |
| `caption-entities` | 0 | 2.17 |
| `boundaries` | 0 | 2.97 |
| `text-session` | 0 | 30.99 |
| `voice-session` | 0 | 73.26 |
| `transcript-view` | 0 | 14.09 |
| `source-ui` | 0 | 63.49 |
| `youtube-ui` | 0 | 42.06 |

## Other commands actually executed

| Command / check | Result and evidence |
|---|---|
| `git clone --no-hardlinks . artifacts/local/sre-audit-clean` at `7f5ef0c`, `npm ci`, `npm run build`, `npm run bench:smoke` | All exit 0 in a fresh checkout without `.env`; [clean-clone.txt](clean-clone.txt). PostgreSQL/k6 were explicitly supplied local prerequisites, not vendored. |
| Real PostgreSQL cleanup integration within clean-clone smoke | 12 scenarios passed; zero remaining fixture rows; four clients and four pools released. |
| `BENCH_OUTPUT_DIR=benchmarks/audit/reproduction npm run bench:baseline` then `bench:optimized`, `bench:report` | Both complete matrices and real lock/restart probes passed. [Generated comparison](reproduction/results.txt), [baseline](reproduction/baseline.txt), [optimized](reproduction/optimized.txt). Executed using the pinned node binary directly as recorded in logs. |
| Same runner with `BENCH_MEMORY=true`, output directory `benchmarks/audit/memory`, optimized then baseline | Four fixed-rate stages per version passed, no dropped iterations. [Memory summary](memory/summary.json). |
| `node scripts/bench/audit.mjs` | Passed: recomputes historical medians, percentages, semantic-check coverage, archived module provenance and optional memory summaries. [claims.json](claims.json). |
| `BENCH_OUTPUT_DIR=benchmarks/audit node scripts/bench/restore.mjs` | Passed: 128 messages/24,594 characters, 1/5/10 concurrent restorers, interrupted attempt rejected and fresh restore succeeded. [restoration.txt](restoration.txt). ACKs are simulated; no live media/provider. |
| Final rerun of `node scripts/verify-reliability.mjs lint` after audit-script edits | Exit 0; [final-lint.txt](final-lint.txt). |
| `python tests/integration/generate-pdf-fixtures.py` | Initial attempt **failed**: missing `reportlab`. Created ignored local venv, installed `fixture-requirements.txt`, then reran successfully. [Install output](python-install.txt), [both fixture attempts](pdf-fixtures.txt). All 13 PDFs match the tested fixtures byte-for-byte: [hash comparison](fixture-comparison.json). |
| `npm audit --json` | **Exit 1**, eight moderate affected dependency entries, no high/critical entries. [Raw output](npm-audit.json). |
| `npm audit --omit=dev --json` | **Exit 1**, one moderate entry in the production graph. [Raw output](npm-audit-production.json). No dependency upgrade was applied. |
| One read-only hosted-homepage GET | HTTP 200, title Talk to a Document. [live-homepage.txt](live-homepage.txt). No import, conversation, paid API or stress request. |
| Teardown | No listeners remained on loopback test/benchmark ports 3100–3150 or 55439. [teardown.txt](teardown.txt). |

## Checks deliberately excluded

No live OpenAI/YouTube/Supadata requests, paid credential minting, real microphone/audio quality, end-to-end WebRTC load, production database probes, production cleanup, multi-instance coordination, TLS/remote DB latency, long soak or failover. The hosted commit was not identified. Chromium was already installed; browser downloading was not repeated. Optional focused unit scripts duplicate the full suite; code coverage was not rerun. No production-scale or leak-free claim is made.

## Git snapshot at audit completion and remaining work

At audit completion, before the subsequently authorized commit and push, `main` and `origin/main` were both **7f5ef0c42a2b6a951b44ea247dcc388a5fffc0eb**, with **0 commits ahead / 0 behind** after fetch. The public remote is [myk0laUA/talk_to_YTVideo-and-PDF](https://github.com/myk0laUA/talk_to_YTVideo-and-PDF). Original benchmark implementation/evidence commit **b7864044626ca2916a555ab8f8abb639da7d1dd7** is already on the remote. The newer user-authored README commit was fast-forwarded locally and preserved.

**At that snapshot, audit changes were uncommitted and unstaged.** The user subsequently authorized committing and pushing the complete audit. The inventories below preserve the pre-publication state; consult Git history for the current publication state. [Exact changed/untracked file inventory](git-status.txt). Original raw benchmark files are unchanged. Existing benchmark links targeted committed files; new audit links resolved locally and their targets are included with this audit. [Link inventory](links.json), [audited source/dependency hashes](source-manifest.json).

The evidence is suitable for an engineering review **with its stated limitations**. Dependency remediation remains outstanding: eight moderate transitive entries, including the Prisma-tooling URI parser in npm's production graph; do not say every security check passed. This audit is not a deployment recommendation. No commit or push occurred during the audit itself. Publication was authorized separately; no force-push, visibility change or deployment is part of that authorization.
