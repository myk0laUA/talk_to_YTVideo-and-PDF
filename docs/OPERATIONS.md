# Operations

## Deployment

The existing service is [Talk to a Document](https://talk-to-document-4pre.onrender.com) on Render Free, Ohio. Build: `npm ci --include=dev && npm run build`. Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`. Health check: `/`. Free instances can take 50 seconds or more to wake after inactivity.

Configure `DATABASE_URL`, `OPENAI_API_KEY`, `VISITOR_COOKIE_SECRET` and the exact HTTPS `APP_ORIGIN` privately. Enable `PDF_INGESTION_ENABLED`, `OWNED_SOURCE_TEXT_ENABLED` and `OWNED_SOURCE_VOICE_ENABLED`. Keep all local-HTTP flags and proof gates false. Keep `YOUTUBE_INGESTION_ENABLED=false` on this host until successful hosted caption acquisition is verified.

Before publishing, verify the reviewed commit and run `npm run db:status`. Apply outstanding committed migrations with `npm run db:deploy` on the intended target. Never run `db:migrate` or reset a production database. Deploy the exact commit and record the Render deployment ID and served Next build ID. Auto-deploy is disabled on the current service; documentation-only pushes do not replace the running application.

After deployment, run the bounded hosted checks from [testing](TESTING.md). Keep real voice/phone observations separate. Do not enable experimental proof routes to make a normal uploaded source work.

## Expired-data cleanup

Access expires automatically; physical deletion requires an operator. Current assessment cadence: Myk runs cleanup once daily while access is open, before the demo, and after test data expires. No scheduler or unattended deletion guarantee is configured.

Use the pinned runtime and an explicitly selected `DATABASE_URL` through private configuration. Inspect the target, then:

```sh
npm run db:cleanup -- --help
npm run db:cleanup -- --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
# Review the dry-run before executing on the same intended database.
npm run db:cleanup -- --execute --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
npm run db:cleanup -- --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
```

Dry-run is the default and uses read-only transactions. Execution deletes only Source/TranscriptCache rows expired at the invocation cutoff, repeating the expiry predicate when deleting. Future rows are preserved. Bounded batches use statement/lock timeouts; earlier committed batches remain committed if a later batch fails.

- Exit **0**: bounded scan completed.
- Exit **2**: cap reached; inspect counts before another deliberate bounded pass.
- Exit **1**: error/cancellation/timeout; inspect before retry. An unknown commit outcome means confirmed counts are only a lower bound.

Reports omit document text and credentials. Save sanitized results outside tracked source. A completed scan is not a guarantee against concurrent inserts or subsequent expiry. No blanket table deletion or automatic retries.

## Security and recovery

Keep secrets server-only. Do not log raw provider errors, cookies, credentials, SDP or private document content. Rotating the visitor secret invalidates existing visitor cookies. Stop/restart/mode changes are explicit; the application does not automatically resend a question after an uncertain receipt.

Rate limits are finite but process-local, not a distributed spending guarantee. Review provider usage separately. Use the [database persistence probe](DATABASE_PROBE.md) only when a real persistence check is needed; ordinary build/test never invokes it.
