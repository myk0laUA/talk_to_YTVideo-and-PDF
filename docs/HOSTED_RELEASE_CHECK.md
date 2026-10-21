# PM hosted voice/text release

Release candidate: a416652f0177f58460de6f6fc4552e4fc202851b. Existing free Ohio Render service srv-dba4fuvbtjjs73dong50. No schema changes in the pushed range, no new migration needed. Git fetch/push succeeded; main synchronized. Tracked private-path/key-pattern checks passed. Diff whitespace check reported an existing trailing blank line in tests/unit/owned-voice.test.ts; no runtime finding or application change.

Manual deployment dep-dbc2acjrjlhs73aiqosg succeeded and is Live at a416652f0177f58460de6f6fc4552e4fc202851b,21October2026UTC (dashboard20October22:38:04Toronto). Existing PDF-only runtime configuration retained. Pinned Node24.22.0 HTTP verification exit0: root200; voice preparation/credential and text session POST503/no-store. Evidence artifacts/local/hosted-release/default-http.json. No provider request, new secrets saved or conversation flags enabled yet. Hosted Next build ID not yet captured; Render commit identity is confirmed.

## Secure configuration handoff

Render Environment edit form has two added, UNSAVED field names: OPENAI_API_KEY and VISITOR_COOKIE_SECRET. The human must copy their existing values from local .env into the matching fields, without quotes or variable names, then save. Preserve existing DATABASE_URL/NODE_VERSION/PORT. Never paste secrets in chat. Browser-control credential-entry handoff rule is the reason for this pause, not a missing project authorization. The local cookie secret must be 64 hexadecimal characters. Do not use Render's generic Generate button without verifying that required format.

After secret entry is confirmed, PM removes process-generated cookie secret from Start Command and uses the retained environment value. Exact intended command:

```sh
YOUTUBE_INGESTION_ENABLED=false PDF_INGESTION_ENABLED=true PDF_INGESTION_LOCAL_HTTP=false PDF_PROOF_ENABLED=false CAPTION_PROOF_ENABLED=false PROOF_ENABLED=false REALTIME_ISSUANCE_ENABLED=false TEXT_PROOF_ENABLED=false OWNED_SOURCE_VOICE_ENABLED=true OWNED_SOURCE_TEXT_ENABLED=true APP_ORIGIN=https://talk-to-document-4pre.onrender.com npm run start -- --hostname 0.0.0.0 --port $PORT
```

Public paid-API conversation activation requires the browser tool's action-time confirmation before saving the command. No paid hosting/billing changes. Stable-cookie activation invalidates old ephemeral-cookie visitors once; after that restart ownership should persist.

## Bounded hosted verification

Use only an authored small public test PDF, fresh anonymous browser, normal application routes and real provider. Separate hosted ledger under artifacts/local/hosted-release. Maximum US$1 estimated incremental test spend, one voice session with at most two response starts and one text session with at most two responses, 120seconds each; stop on failed contract, no blind retries. Prior local allocations are closed and untouched. Inspect current policy/pricing and conservative bound before paid acquisition. Never expose permanent/ephemeral credentials in logs, screenshots or reports.

Verify exact hosted commit/build and configured availability; PDF upload/full preview, source-grounded answer, text without microphone, voice source/settings ACK before media, transcript, normal playback, active Stop and source removal. Check proof routes remain unavailable. Verify retained-cookie source ownership across one explicit free-service restart before removing only the authored test source. Failed hosted conversation contracts require disabling owned voice/text flags pending one bounded worker correction. No shared-database bulk cleanup.

User physical iPhone microphone, audible answer, real-person interruption/follow-up and recovery follow hosted checks. Browser emulation does not pass these. YouTube remains disabled pending actual caption success; release/final evaluation remain incomplete.
