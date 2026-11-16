# Dependency remediation — November 16, 2026

**Both full and production-only npm audits now report zero known vulnerabilities.** The eight moderate affected dependency entries from the earlier audit are resolved. [Full audit JSON](npm-audit.json) · [Production audit JSON](npm-audit-production.json) · [Install output, including the intermediate unsuccessful fix](install.txt).

**Deployed successfully on Render:** application commit [`75d697f`](https://github.com/myk0laUA/talk_to_YTVideo-and-PDF/commit/75d697f9c8e86d83d6e69bdc7bb3516b2ee37a2f), November 16, 2026. [Live app](https://talk-to-document-4pre.onrender.com) · [Deployment record](deployment.json) · [Live HTTP acceptance](live-acceptance.json). The subsequent publication commit only records deployment evidence/documentation; the live application code and lockfile match `75d697f`.

## Changes and rationale

| Dependency | Before | After | Reason |
|---|---|---|---|
| `fast-uri` | 3.1.8 | 3.1.9 | Patches the URI parsing/normalization advisories propagated through Prisma tooling. |
| TypeScript ESLint packages | 8.71.2 | 8.72.2 | Compatible upstream updates selected by npm's non-forced audit fix. |
| `minimatch` under `@typescript-eslint/typescript-estree` | 10.2.6 | 11.0.1 | Patches glob amplification; scoped override because even TypeScript ESLint 8.72.2 still declares `^10.2.2`. |

The first `npm audit fix --package-lock-only --ignore-scripts` updated `fast-uri` but left seven moderate entries. Adding the scoped override and regenerating the lockfile removed those remaining findings. There is no blanket minimatch override: consumers of unaffected 3.x releases retain their existing version. Supporting transitive updates and the new nonrecursive matcher are listed in [dependency-changes.json](dependency-changes.json). Application source, direct dependency versions, Prisma schema, migrations and service configuration are unchanged by this remediation.

The override crosses a major version intentionally. The patched package supports the pinned Node 24.22.0 runtime and retains the CommonJS named `minimatch` function used by the consumer. Full repository linting and six representative positive/negative/path/dotfile/brace cases passed: [compatibility probe](glob-compatibility.json). Remove the override when TypeScript ESLint itself accepts a patched release, then rerun lint and package audits. ESLint 9.39.5's installation deprecation warning remains a separate maintenance concern; it is not a reported vulnerability in these audit results.

Primary advisory references: [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [minimatch glob amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). Zero package-audit findings are a point-in-time registry result, not a comprehensive application-security certification.

## Reproduce

Use the pinned Node 24.22.0 / npm 11.19.1 and the existing PostgreSQL/k6/browser prerequisites. Commands below use a fresh ignored output directory so committed historical evidence stays intact:

```powershell
npm ci
npm audit
npm audit --omit=dev
$env:BENCH_OUTPUT_DIR = 'artifacts/local/remediation-check'
npm run test:reliability
npm run bench:restore
$env:BENCH_OUTPUT_DIR = 'artifacts/local/remediation-check/database'
npm run bench:smoke
```

The Python PDF fixtures and Chromium prerequisites are described in the [benchmark setup](../../README.md#regression-evidence). The regression runner disables provider credentials and uses synthetic local fixtures. The database smoke test initializes its own isolated PostgreSQL cluster; it never uses the application database URL.

## Verification outcome

All **30 regression commands passed**, including **1,663 unit tests and 1,017 Playwright cases**, plus lint, TypeScript and a production Next build. The real PostgreSQL cleanup suite passed all 12 scenarios with zero fixture rows left and all four pools released. Lock/outage/restart, full source preservation, PDF parsing/persistence and mocked caption probes passed. The 128-message restoration probe passed. [Command outcomes](verification-summary.json), [installed dependency graph](installed-dependencies.json), [input hashes](inputs.json).

## Evidence scope

Fresh command results are recorded in [verification.txt](verification.txt), [database smoke](database/smoke.txt), and [128-message restoration](restoration.txt). The database smoke overlapped browser regression work and is functional evidence only. No fresh saturation-performance claim is made: the published before/after numbers still describe the earlier lockfile, preserved at commit `ef45cd2`.

The existing Render database was checked read-only before release: all three migrations were already applied, and no schema change or migration was needed. [Redacted migration status](migration-status.txt). The production service uses the existing free instance, existing start command and disabled auto-deploy setting; no infrastructure upgrade, new service or paid provider call is required.

## Deployed acceptance

Render's dashboard confirmed **Deploy succeeded | Live** for the exact tested commit, with a displayed deployment duration of 1m 20s. Existing auto-deploy remains disabled. The homepage returned 200; a fresh anonymous visitor uploaded one synthetic 1,383-byte PDF (201), retrieved its persisted expected text (200), deleted only that new source (200), and confirmed it was unavailable afterward (404). The initial visitor-cookie response was the expected 401. No credentials/cookies, source identifiers, or private documents were saved in the evidence.

The single upload request took **6.65 seconds**, and the subsequent owned read took **103 ms**. These are one-off acceptance timings on the existing free service, not a production load test or an improvement claim. No OpenAI, caption-provider, voice/media or paid API calls were made. YouTube/live conversations were covered locally with deterministic transports, not re-exercised with paid providers after deployment.
