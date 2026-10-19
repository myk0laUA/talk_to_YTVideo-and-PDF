# Task 13B — triage the clean-install dependency advisory

Read `prompts/WORKER_PROMPT.md` and canonical handoffs. One active worker task, parent Step13; timebox 45–60 minutes. Start from the latest PM-accepted13A documentation commit in PROJECT_STATE. Product code remains accepted12A `8af058e`; clean builds13A `6Z6iACnge_2zKkfs2q1BI` and reviewer snapshot `wx1sdHPfrnU6LivCf18cF`. Keys unavailable, free hosting only, no deployment or provider spending. Full live/physical-device gates remain open.

## Outcome / starting finding

Determine actual project exposure and a justified disposition for the install audit finding. The retained13A npm audit reports five affected package entries along `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`, with one underlying advisory GHSA-vfj7-8cjw-p6xm. On PM review19October2026UTC, the [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists braces≤3.0.3 affected and no patched version. npm's suggested eslint-config-next14.2.35 downgrade is not an approved remedy for Next16.4.2. Recheck current primary evidence rather than assuming availability or exploitability.

Deliver one concise dependency triage report and canonical state update. No product/UI/session changes. No blanket `npm audit fix`, `--force`, suppression, disabling lint, framework downgrade, dependency replacement, fork or hand-patched node_modules. A documented unresolved advisory with measured exposure and a clear later gate is a valid task outcome; it is not a security clearance.

## Acceptance criteria

1. Reproduce the audit using pinned Node24.22.0/npm11.19.1 and the committed lockfile in an isolated copy or retained13A export. Record `npm audit --json`, `npm audit --omit=dev --json`, `npm ls braces micromatch fast-glob @next/eslint-plugin-next eslint-config-next --all` and `npm explain braces`, their exact exits and timestamps. Distinguish advisory count from affected package count; nonzero audit exit is a finding, not command infrastructure failure. Registry queries are allowed; no provider/DB calls.
2. Inspect actual lockfile/install dependency paths, application imports, Next build/runtime traces and relevant lint/build call sites. Establish whether user-supplied PDF text/filenames, caption IDs/text or HTTP inputs reach this package; distinguish evidence of absence in inspected paths from a universal absence claim. Dev dependency classification or clean production audit alone is insufficient to declare runtime non-exposure. Include deployment install/build behavior from committed config, explicitly marking dashboard behavior unverified. Do not inspect secrets or assume a production-only install.
3. Consult advisory and maintainer sources for affected operations, versions and available fixes. If useful, reproduce the failing library operation only in a local isolated subprocess with a short hard timeout, bounded input/memory and no network or real data. Do not crash the main test runner/server or probe the public deployment. A reproduction is optional if static/upstream evidence sufficiently establishes the boundary; explain the choice.
4. State project-specific impact, preconditions and disposition: safely fixed by a verified compatible release, development/build risk with no demonstrated public request path, or unresolved exposure needing a separate correction. Preserve uncertainty and remaining severity. Do not treat a scanner recommendation or successful tests as proof of a fix. If no compatible upstream fix exists, retain the dependency, record the blocker and proposed follow-up trigger; do not manufacture a patch.
5. Only if an actual compatible patched release now exists and resolves this exact advisory without framework/runtime/API changes, a minimal dependency/lockfile patch is permitted. Pin/preserve npm lock integrity; record before/after chain and primary-source rationale. Otherwise make documentation/evidence changes only. Stop and report if resolution needs a framework change, downgrade, new package, override outside upstream compatibility, broad toolchain change or custom fork.
6. No altered gates, application behavior, model/accounting policy, provider call, database operation, deployment or automatic update/monitor. Full Step13 remains IN_PROGRESS. PM owns release-risk acceptance and subsequent tasks.

## Verification / skills

Follow docs/SKILLS.md; no design skill or UI work. Use installed Next docs for any concrete tooling question. Primary maintainer/advisory sources only; record access dates and links. Never paste secret values or private config into reports.

For documentation-only disposition: verify unchanged package/lock/application hashes, referenced links and scripts, and `git diff --check`; do not rerun926 browser cases. For a permitted compatible dependency patch: isolated `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:validate`, `npm run build`, `npm run test:smoke`, `npm run test:boundaries`, and before/after audit results. Build before HTTP checks. Use the13A no-key environment and existing external-network blockers; package registry access is separate from provider calls. Broaden verification only for a concrete changed path. No ignored generated files copied into clean verification.

## Manual review / evidence / stop

1. Worker: inspect dependency graph and call-site/trace evidence, reconcile full versus production audit, and document the actual reachable operation or the exact limits of the analysis.
2. Worker: compare registry/upstream remedy with pinned Next/toolchain constraints. Produce one recommendation, retaining unresolved risks and no-patch results honestly.
3. PM: review disposition and any bounded patch; decide acceptance. No key/phone action needed.

Return READY_FOR_REVIEW with base/dirty/build (or unchanged build) identity, changed-file SHA256, commands/UTC/exits, sanitized audit/graph paths under ignored `artifacts/local/13b/`, source citations, dependency path and runtime/build reachability evidence, before/after result if changed, and remaining gates. Update PROJECT_STATE/TESTING and one concise report. No later task or ongoing monitor. Stop at the timebox or out-of-scope remedy; a precise unresolved recommendation is preferable to an unsafe downgrade.
