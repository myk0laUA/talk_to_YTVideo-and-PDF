# Testing

## Clean checkout

Use Node 24.22.0/npm 11.19.1 with no private `.env` or inherited provider keys. Install from `package-lock.json` and run:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
npm run test:boundaries -- --http-only
npm run test:workspace
```

Generation, lint, types, unit tests, build and browser smoke need no live services. If schema validation requires a URL, set an inert loopback PostgreSQL URL for that command only; it must not point to a real database. Smoke tests start the existing production build on port 3100 and refuse to reuse another server. Boundary tests cover methods, origin checks, authorization and disabled routes with synthetic infrastructure.

The submission-readiness review used a separate export of tracked files without the developer's `.env`, local artifacts or existing `node_modules`. Do not copy private configuration into an offline test export. New text-route regressions cover cancellation before/during body reads, release of admission leases/listeners, and malformed UTF-8 rejection before provider submission. [Release status](RELEASE.md#submission-readiness-review) records current results separately from earlier audits.

## Extended regression suites

Run the suites relevant to a change after the production build. These exercise real controllers/routes with injected storage, transport or media boundaries; they do not prove audible playback or live model accuracy. Run them sequentially on smaller machines, and do not rebuild while a built-server suite is running.

| Behavior | Commands (`npm run …`) |
|---|---|
| State machines, validation, ownership, expiry, quotas, cancellation and extraction | `test` or `test:coverage` |
| Import/cancel/replace/remove, keyboard focus, theme/draft retention | `test:workspace:flows`, `test:source-ui`, `test:youtube-ui` |
| Desktop/mobile layout, 200% text, scrolling, voice recovery and centered starts | `test:workspace:layout` |
| Owned-source HTTP streaming and voice setup, transport/resource teardown | `test:owned-text`, `test:owned-voice`, `test:voice-adapter`, `test:voice-preparation` |
| Session controls, transcript states, switching and bounded voice reconnection | `test:text-session`, `test:voice-session`, `test:transcript-view`, `test:mode-switch`, `test:recovery` |
| Real parser/HTTP limits, complete sources, isolation and replacement | `test:pdf:http`, `test:sources:http`, `test:youtube:http` |
| Caption cache/coalescing/fallback, English selection and entity decoding | `test:captions:cache`, `test:captions:coalescing`, `test:captions:fallback`, `test:source-limits`, `test:caption-entities` |
| Disabled production gates and retained diagnostic endpoints | `test:smoke`, `test:boundaries`, `test:captions:mocked`, `test:text`, `test:voice` |

`test:workspace` runs both workspace suites. They generate their own fixtures, use an available loopback port and write a fresh result folder per invocation. They require neither a production build nor historical local reports. HTTP suites require the build. No live provider key is needed for these commands.

On a resource-constrained machine, `npm run test:recovery -- --workers=2` runs the same full recovery suite with reduced browser concurrency. The readiness review observed a four-worker Chromium `ERR_NO_BUFFER_SPACE` during fixture navigation; the unchanged two-worker run passed all 248 cases. Preserve a failed run's log before retrying, and do not treat an environment retry as an application fix.

`test:coverage` excludes generated Prisma code. Node reports coverage only for modules loaded by the unit suite; this is **not whole-application coverage**, and does not include browser-rendered components or real database/provider execution. Use the browser/HTTP suites above and the separate live checks below for those boundaries. A high percentage alone is not an acceptance gate.

For PDF HTTP/source suites, generate the synthetic fixtures first:

```sh
python -m pip install -r tests/integration/fixture-requirements.txt
python tests/integration/generate-pdf-fixtures.py
npm run test:pdf:http
npm run test:sources:http
npm run test:youtube:http
```

Prefer an isolated Python virtual environment (`python -m venv .venv`, then activate it) when installing these optional fixture dependencies. Do not commit the environment or generated PDFs; keep fixtures in the default ignored `artifacts/local/` directory.

`PDF_FIXTURE_DIRECTORY` can select a fresh fixture directory; pass the same value to consumers. `VERIFICATION_ROOT`, `OWNED_TEXT_EVIDENCE_DIRECTORY` and `OWNED_VOICE_EVIDENCE_DIRECTORY` allow fresh result destinations where supported. Outputs belong in ignored `artifacts/local/`, `test-results/` or `playwright-report/`.

For real SQL cleanup/race checks, use a separately provisioned, migrated and initially empty disposable database. Set `TEST_CLEANUP_DATABASE_URL` separately from the ordinary `DATABASE_URL` and `CLEANUP_DISPOSABLE_ACK=I_CONFIRM_EMPTY_DISPOSABLE_DATABASE`, then run `npm run test:cleanup:postgres`. The harness checks distinct database identities, seeds only its own fixtures and tears them down. Never point it at shared data. [Persistence probe](DATABASE_PROBE.md) is a separate operator check.

## Test maintenance

The October 23 audit retired the removed model-routing experiment's token-estimator/calibration tests, two fixture-question inventory checks that duplicated full-source serialization coverage, and the historical source-preview evidence replay tied to an old build. Caption packing/Unicode/ACK rejection and complete preview, transcript, Stop and removal coverage remain in current suites. The misleading `youtube-text-citations` file is now named `caption-manifest` to describe what it actually tests; it never established semantic citation accuracy.

Seven overlapping UI inspection scripts were consolidated into the two workspace suites. Historical CSS/build comparisons and obsolete controls were removed; current behavior checks were retained. Caption HTTP tests now reflect English-only source imports: omitted language shares the English extraction, explicit regional preferences stay isolated, and mismatched upstream captions are rejected. PDF upload-copy and YouTube expiry-display assertions were updated for the previously approved UI changes. These were stale-test corrections, not application fixes or passes for the original failed runs.

Keep tests that catch a user-visible or boundary failure. Avoid tests that merely recount fixture questions, compare an implementation with its own copy, assert old report contents, or lock down incidental CSS values. Preserve meaningful security/race/cleanup cases even when they increase test count. Live model answers must still be reviewed against the supplied source.

The completed audit passed 1,629 unit tests, lint, typecheck, build and every offline suite in the table above. Loaded nongenerated unit modules reported 99.63% line, 93.27% branch and 93.41% function coverage. The workspace runs covered six viewport/theme combinations and 138 layout states; PDF/YouTube UI suites passed 87/99 cases and voice-session passed 208. One earlier voice-session run timed out loading its browser fixture (207 passed); the unchanged full rerun passed, so this remains an observed setup flake, not a proven application fix. The diagnostic voice navigation test also needed the current homepage heading, including its accessible whitespace. Earlier failed attempts remain in ignored local audit logs. Real SQL checks were not rerun because Docker was unavailable; live providers and physical audio were outside this offline audit.

## Live release checks

Use a nonprivate authored source and a deliberate request/cost bound. Record revision/build, environment, actual questions/answers, errors and any exposed usage. Stop on a provider failure; do not retry blindly.

1. Upload a small PDF, inspect first/final pages, replace it and confirm a rejected replacement preserves it.
2. Verify exact 25 MB success, over-limit rejection, foreign-visitor denial and disabled proof routes.
3. Ask a detail, follow-up and absent-information question in text. Check answers against the actual source; transport success alone is insufficient.
4. On a physical phone, record model/OS/browser. Test source preview, microphone permission, audible English answer, interruption, independent mic/speaker mute and Stop.
5. Test text without microphone permission, on-screen keyboard, scrolling, theme and source replacement. Disconnect/reconnect the real network during voice: verify automatic reconnection preserves chat, a follow-up uses completed history, mute choices persist, and End prevents reconnecting. Repeat interrupted/untranscribed speech explicitly. Text-mode recovery still needs a fresh session.
6. Import a public English-caption YouTube video on the host, inspect first/final captions and ask a source-specific question. Record provider, segment count and bounded credit/model usage. Verify that PDF replacement still works and foreign visitors cannot read the source.

Viewport emulation, synthetic microphone tracks and displayed speech text do not prove physical audio or mobile behavior. [Release status](RELEASE.md) distinguishes completed and outstanding checks.
