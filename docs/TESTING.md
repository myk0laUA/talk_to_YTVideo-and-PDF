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
```

Generation, lint, types, unit tests, build and browser smoke need no live services. If schema validation requires a URL, set an inert loopback PostgreSQL URL for that command only; it must not point to a real database. Smoke tests start the existing production build on port 3100 and refuse to reuse another server. Boundary tests cover methods, origin checks, authorization and disabled routes with synthetic infrastructure.

## Extended regression suites

The npm scripts include owned-source text/voice, native voice adapter, source UI, mode switching, recovery, PDF HTTP, YouTube HTTP, cache/coalescing/fallback and cleanup tests. Inspect `package.json` for the exact commands. They exercise real controllers/routes with injected storage, transport or media boundaries. Such tests do not prove audible playback or live model accuracy.

For PDF HTTP/source suites, generate the synthetic fixtures first:

```sh
python -m pip install -r scripts/fixture-requirements.txt
python scripts/generate-pdf-fixtures.py
npm run test:pdf:http
npm run test:sources:http
npm run test:youtube:http
```

`PDF_FIXTURE_DIRECTORY` can select a fresh fixture directory; pass the same value to consumers. `VERIFICATION_ROOT`, `OWNED_TEXT_EVIDENCE_DIRECTORY` and `OWNED_VOICE_EVIDENCE_DIRECTORY` allow fresh result destinations where supported. Outputs belong in ignored `artifacts/local/`, `test-results/` or `playwright-report/`.

For real SQL cleanup/race checks, use a separately provisioned, migrated and initially empty disposable database. Set `TEST_CLEANUP_DATABASE_URL` separately from the ordinary `DATABASE_URL` and `CLEANUP_DISPOSABLE_ACK=I_CONFIRM_EMPTY_DISPOSABLE_DATABASE`, then run `npm run test:cleanup:postgres`. The harness checks distinct database identities, seeds only its own fixtures and tears them down. Never point it at shared data. [Persistence probe](DATABASE_PROBE.md) is a separate operator check.

## Live release checks

Use a nonprivate authored source and a deliberate request/cost bound. Record revision/build, environment, actual questions/answers, errors and any exposed usage. Stop on a provider failure; do not retry blindly.

1. Upload a small PDF, inspect first/final pages, replace it and confirm a rejected replacement preserves it.
2. Verify exact 25 MB success, over-limit rejection, foreign-visitor denial and disabled proof routes.
3. Ask a detail, follow-up and absent-information question in text. Check answers against the actual source; transport success alone is insufficient.
4. On a physical phone, record model/OS/browser. Test source preview, microphone permission, audible English answer, interruption, independent mic/speaker mute and Stop.
5. Test text without microphone permission, on-screen keyboard, scrolling, theme and source replacement. Disconnect/reconnect the real network and verify recovery needs explicit action.
6. Demonstrate local English-caption YouTube import/preview/conversation separately from the hosted PDF path. Do not imply the host supports YouTube when its gate is disabled.

Viewport emulation, synthetic microphone tracks and displayed speech text do not prove physical audio or mobile behavior. [Release status](RELEASE.md) distinguishes completed and outstanding checks.
