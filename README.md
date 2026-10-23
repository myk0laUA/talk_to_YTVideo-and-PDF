# Talk to a Document

A mobile web app for exploring one PDF or YouTube caption source through voice or text. Import a source, inspect its extracted text, then start a conversation. It uses anonymous visitors, PostgreSQL, server-side extraction, OpenAI Realtime voice over WebRTC and a microphone-free text relay. There are no accounts, embeddings, vector database or permanent chat history.

**[Open the live app](https://talk-to-document-4pre.onrender.com)** — deployed release `a7ef8fb` (23 October 2026). Hosted PDF and text checks pass; fresh physical-phone/audio checks and recording remain pending. Hosted YouTube is disabled; use the documented local demo path.

The offline candidate verification is in [Release candidate 13C](docs/RELEASE_CANDIDATE_13C.md). The latest accepted corrections and deployment checks are tracked in [Release 13G](docs/RELEASE_13G.md). Disposable PostgreSQL cleanup validation passed; physical-phone checks and submission links remain separate gates. [Project state](docs/PROJECT_STATE.md) preserves the full history; [submission checklist](docs/SUBMISSION_13C.md) records what PM and the user must finish.

## Run without keys

Use **Node 24.22.0 and npm 11.19.1**, exactly as pinned in `.node-version`, `.nvmrc` and `package.json`. Use npm and the committed lockfile. In a fresh checkout/export with no private `.env*` files or inherited application configuration:

```sh
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
npm run test:boundaries -- --http-only
npm run dev
```

The app opens at [localhost:3000](http://localhost:3000). Without configuration it truthfully shows unavailable imports; it does not manufacture answers. Build and Prisma generation need no services. Schema validation does not connect to a database; if tooling requires a URL, supply a syntactically valid inert loopback URL for that command only. `test:smoke` starts the existing production build on port 3100 and refuses to reuse another server. Run build first. `--http-only` avoids repeating boundary unit tests already covered by `npm test`. `npm run start` serves the production build.

For the complete offline release procedure, generated PDF fixtures and evidence destinations, see [13C reproduction](docs/RELEASE_CANDIDATE_13C.md#reproduction). Browser suites use explicitly synthetic provider/storage/media boundaries. They do not prove live model answers or physical phone audio.

## Enable a local application demo

Copy `.env.example` to private `.env` and configure services securely. Never commit credentials or prefix them with `NEXT_PUBLIC_`. These are configuration **names and purposes**, not supplied secrets:

| Environment name | Purpose |
|---|---|
| `DATABASE_URL` | Intended PostgreSQL database, with provider-required TLS settings |
| `APP_ORIGIN` | Exact browser origin, including local port; HTTPS for public deployment |
| `VISITOR_COOKIE_SECRET` | Securely generated 32-byte secret represented by 64 hexadecimal characters |
| `OPENAI_API_KEY` | Server-only provider credential with access to the selected model |
| `PDF_INGESTION_ENABLED` | Explicit PDF import opt-in |
| `OWNED_SOURCE_TEXT_ENABLED` | Independent opt-in for owned-source text sessions |
| `OWNED_SOURCE_VOICE_ENABLED` | Independent opt-in for owned-source WebRTC voice sessions |
| `PDF_INGESTION_LOCAL_HTTP` | Explicit loopback HTTP opt-in for the local demo |
| `YOUTUBE_INGESTION_ENABLED`, `YOUTUBE_INGESTION_PROVIDER`, `YOUTUBE_INGESTION_LOCAL_HTTP` | Optional local native-caption import; select `direct` for the documented local route |
| `SUPADATA_API_KEY` | Only needed if deliberately selecting the managed caption adapter |

The enabling flags above are explicit `true` opt-ins; defaults are false. Keep synthetic proof flags (`PROOF_ENABLED`, `REALTIME_ISSUANCE_ENABLED`, `TEXT_PROOF_ENABLED`, `PDF_PROOF_ENABLED`, `CAPTION_PROOF_ENABLED`) false for the normal app. Their credentials do not authorize owned sources. `OPENAI_REALTIME_MODEL` is only for the older proof path; it does not choose the owned-session model. Cache/fallback operator settings are documented in `.env.example` and the historical caption reports.

PM/operator must apply **committed** migrations to the intended database with `npm run db:deploy`, then check `npm run db:status`, before enabling imports. Do not reset a shared database or use `db:migrate` on production. Restart the app after changing configuration. Use the exact configured origin in the browser. Local model use incurs provider charges; no-key verification makes no paid calls.

Public YouTube acquisition remains disabled: the last hosted direct-caption trial was blocked. The accepted assessment scope uses the **same application locally**, with direct native captions, source preview and real conversation, as the cloud exception. Hosted caption support is a deferred bonus. Direct local extraction can also fail for unavailable captions, blocked videos or upstream changes; the error is shown without silently substituting audio transcription. No new local/live import was performed in 13C.

## Conversation and limits

Both owned text and voice sessions use **`gpt-realtime-2.1`**, fixed for the session and follow-ups. There is no size routing or automatic Mini fallback. Text uses minimal reasoning and a **2,048-token maximum per answer**. Voice uses WebRTC, **Marin**, `gpt-4o-mini-transcribe` for input transcription, server VAD threshold **0.6**, **600 ms** silence, automatic responses/interruption and concise spoken instructions. Its output ceiling is also 2,048 tokens. The larger model is the user's selected quality/cost tradeoff.

The complete extracted text is prepared and acknowledged before conversation readiness. Source and settings acknowledgments precede microphone access. Provider context truncation is disabled: an oversized source/conversation fails visibly rather than being silently shortened. Extraction limits and model context limits are different; importing a PDF does not prove it fits a conversation. No validated exact tokenizer/framing capacity or guaranteed answer accuracy is claimed.

| Bound | Current behavior |
|---|---|
| PDF | Up to 25,000,000 file bytes; at most 500 pages and 2,000,000 extracted characters; 30-second upload and 15-second parse deadlines |
| PDF support | Text PDFs; encrypted, image-only, malformed and over-limit files are rejected. No OCR. Complex layouts/tables can lose reading order |
| YouTube support | Native manual/automatic captions, URL or video ID; up to 20,000 segments and 1,000,000 characters, with bounded upstream requests |
| Anonymous source lifetime | Signed visitor cookie lasts one hour. Source expiry cannot exceed that visitor lifetime. One active source per visitor; successful replacement removes the previous source atomically |
| Conversation starts | 60 text and 60 voice starts per visitor/hour; 120 voice preparations/hour; additional finite aggregate, concurrency, command and lifetime limits |
| Text session | 20 questions; 1,000 text units per question; 10-minute lifetime and 2-minute idle timeout, also bounded by source/visitor expiry |
| Voice credential | One-use preparation ticket; short-lived provider credential with a 60-second issuance TTL. Credential TTL is not a promise of a 60-second conversation |

Limits are process-local assessment controls, not an account-wide spending cap or a distributed quota. See [session policy](src/server/session-policy.ts) and [12D decisions](docs/VOICE_LIMIT_RECOVERY_12D.md). One conversation owner is active in the current workspace. Switching modes or sources clears that mode's conversation; restarting clears received turns while retaining an unsent text draft. Nothing resends or resumes automatically. The browser transcript is temporary UI state, not durable history or a record of exactly what was heard.

Light/dark themes, source inspection, independent microphone and speaker mute, explicit interruption and Stop/End controls are implemented. Speaker playback is intended-on automatically; browser blocking exposes **Tap to enable sound**. Offline/transport failure stops owned work, preserves received text where applicable and requires explicit restart. A known voice quota cooldown is shown and survives mode/source changes; text remains a separate option. Real connectivity and device behavior still need the final hosted/phone checks.

## Architecture and security

`src/app` contains App Router UI and HTTP entry points; `src/server` owns extraction, source authorization, PostgreSQL access and provider credentials; `src/shared` holds safe contracts and lifecycle state machines. PostgreSQL stores owned source text and a separate public-caption cache. The text path relays provider events through the server; voice uses a temporary browser credential for WebRTC. Raw models, owner hashes, environment objects and permanent keys are excluded from client DTOs. No arbitrary browser-provided owner identity is trusted.

Owned routes check method, origin/fetch metadata, signed visitor, ownership and expiry, with bounded bodies/deadlines and cancellation. Source text is rendered as text. Cleanup **is implemented** as `npm run db:cleanup`: dry-run by default, explicit `--execute` for deletion. Access expiry does not guarantee immediate physical deletion. Real SQL cleanup/races passed. Production cleanup was executed and uses the documented manual operator cadence; see [cleanup runbook](docs/CLEANUP_11A.md) and [PM procedure](docs/RELEASE_CANDIDATE_13C.md#pm-only-database-and-deployment-actions).

The fresh full dependency audit still reports five high affected development-tool entries from one `braces` advisory; the production-only audit reports zero. No compatible patch was available at review. [Dependency triage](docs/DEPENDENCY_TRIAGE_13B.md) explains reachability and the residual PM decision. Audit results are not a security guarantee.

## Known accuracy limits and AI assistance

Answers can omit or misstate source facts. The larger model passed sampled video questions but missed a targeted PDF exception in the historical evaluation; that result remains **FAIL**, accepted as a known limitation. Full-source loading, intact previews and passing synthetic tests do not establish semantic correctness. Citations and perfect summaries are not delivery requirements. Verify consequential claims against **View source**. Historical research and failure evidence remain in [the requirements reassessment](docs/PM_REQUIREMENTS_REASSESSMENT.md), [03L evaluation](docs/USER_SOURCE_COMPLETION_03L.md) and [testing record](docs/TESTING.md).

AI coding assistants contributed implementation, tests, investigation and documentation. The repository records task briefs, review evidence, failures and user decisions. Runtime answers are AI-generated; neither assistant-authored tests nor this README replace human release review. The user records the final [10–15 minute walkthrough](docs/WALKTHROUGH_14A.md); PM verifies the public application, repository and recording links.
