# Talk to a Document

Explore a PDF or YouTube video through voice or text. Upload one source, inspect the extracted text, and ask questions in a temporary, anonymous conversation.

**[Live app](https://talk-to-document-4pre.onrender.com)** · [Public repository](https://github.com/myk0laUA/talk_to_YTVideo-and-PDF) · [Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) · [Operations](docs/OPERATIONS.md)

Built for the Genius Innovation Lab assessment, with a mobile-first interface tested at 390px. PDF and English-caption YouTube sources support voice and text conversation. Hosted captions use Supadata because direct YouTube requests were blocked on Render. [Release status](docs/RELEASE.md) separates dated hosted ingestion/text evidence from outstanding real-device voice checks. No accounts, embeddings, vector database or permanent conversation history.

## Quick start

Prerequisites: Git, **Node 24.22.0** and **npm 11.19.1**. Versions are pinned in `.node-version` and `package.json`; `.npmrc` rejects incompatible engines. The full application also needs a reachable PostgreSQL database and an OpenAI API key with access to `gpt-realtime-2.1`. Voice requires a microphone and a browser supporting WebRTC on HTTPS or localhost. Python is optional, used only to generate extended PDF test fixtures.

```sh
git clone https://github.com/myk0laUA/talk_to_YTVideo-and-PDF.git
cd talk_to_YTVideo-and-PDF
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Without configuration, the interface runs with imports and conversations disabled. To enable the application:

1. Stop the development server. Copy `.env.example` to `.env` (`cp .env.example .env` in a POSIX shell, or `Copy-Item .env.example .env` in PowerShell).
2. Create an empty local PostgreSQL database, or provision a development database with your provider. Set `DATABASE_URL` to its connection string, for example `postgresql://USER:PASSWORD@localhost:5432/talk_to_document` after replacing placeholders. The database user needs permission to apply migrations. Use the provider's verified TLS configuration for remote databases.
3. Set `OPENAI_API_KEY` and generate `VISITOR_COOKIE_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Paste the output into your private `.env`.
4. Keep `APP_ORIGIN=http://localhost:3000`. Enable `PDF_INGESTION_ENABLED`, `PDF_INGESTION_LOCAL_HTTP`, `OWNED_SOURCE_TEXT_ENABLED` and `OWNED_SOURCE_VOICE_ENABLED` by setting them to `true`.
5. Run `npm run db:deploy`, then `npm run db:status` to apply and verify committed migrations.
6. Restart `npm run dev` and use the exact configured origin. If port 3000 is occupied, stop the other server or update both the port and `APP_ORIGIN`; `localhost` and `127.0.0.1` are different origins.

For local YouTube import, also set `YOUTUBE_INGESTION_ENABLED=true`, `YOUTUBE_INGESTION_PROVIDER=direct` and `YOUTUBE_INGESTION_LOCAL_HTTP=true`. Only native English captions are accepted; unavailable captions or upstream blocking produce an error. A managed Supadata adapter is optional and needs its own key.

Keep all synthetic proof flags disabled for normal use. Never commit `.env`, prefix secrets with `NEXT_PUBLIC_`, or reset a shared database. Model requests incur provider charges.

## Environment configuration

All settings are server-side. `.env.example` intentionally defaults to a disabled, credential-free shell.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for temporary sources and public caption cache. |
| `OPENAI_API_KEY` | Required for either conversation mode; extraction itself does not use OpenAI. |
| `VISITOR_COOKIE_SECRET` | 64 hexadecimal characters signing anonymous ownership cookies. |
| `APP_ORIGIN` | Exact origin including port, with no trailing slash. HTTPS on the public host. |
| `PDF_INGESTION_ENABLED` | Enables PDF upload, with valid database/origin/cookie configuration. |
| `OWNED_SOURCE_TEXT_ENABLED`, `OWNED_SOURCE_VOICE_ENABLED` | Independent conversation gates; require OpenAI configuration and at least one enabled ingestion path. |
| `YOUTUBE_INGESTION_ENABLED` | Enables caption import. |
| `YOUTUBE_INGESTION_PROVIDER` | `direct` for unofficial local retrieval; `supadata` for managed retrieval; `auto` for the documented adapter policy. |
| `SUPADATA_API_KEY` | Required only for `supadata`/`auto`; never needed for direct retrieval. |
| `PDF_INGESTION_LOCAL_HTTP`, `YOUTUBE_INGESTION_LOCAL_HTTP` | Explicit loopback HTTP opt-ins, including local production-build demonstrations. Keep false on public deployments. |

The example contains only normal application settings. Diagnostic endpoints default to disabled and need no entries in `.env`. Both conversation modes select their model in the source policy.

## Using the app

- Upload a selectable-text PDF or import a public video with English captions.
- Open **View source** to inspect the extracted content.
- Choose **Voice mode** or **Text mode**, then start the conversation.
- Voice has independent microphone/speaker mute, interruption and End controls. If autoplay is blocked, use **Tap to enable sound**.
- Text works without microphone access. Stop preserves received text; starting again clears it. Switching modes or replacing the source clears the conversation. Nothing resumes or resends automatically.

## Stack and structure

Next.js App Router, React, TypeScript, Prisma and PostgreSQL. Voice uses OpenAI Realtime over WebRTC; text uses a server-side WebSocket relay and browser HTTP stream. Both use **gpt-realtime-2.1**.

Next.js keeps the UI and authenticated HTTP boundaries in one deployable service. TypeScript contracts and explicit state machines make cancellation and stale-event handling testable. Prisma migrations reproduce the PostgreSQL schema; transactions enforce one active source per anonymous visitor. PostgreSQL is retained for temporary ownership and replacement consistency, without adding login or permanent chat storage.

```text
src/app/       Interface and HTTP routes
src/server/    Extraction, authorization, storage and provider integrations
src/shared/    Safe contracts and conversation state machines
prisma/        Schema and committed migrations
tests/         Unit/browser tests, integration runners, fixtures and test configuration
scripts/       Database expiry cleanup and persistence checks
public/        Local font assets and licence
docs/          Architecture, testing, operations and release information
```

## Ingestion and conversation data flow

1. The browser sends a PDF or YouTube URL to a same-origin API route. Signed HttpOnly cookies establish anonymous ownership; routes validate origin, input size and admission limits.
2. PDFs are extracted server-side by `pdf-parse` in a bounded worker with a deadline. The worker rejects encrypted, malformed, image-only and oversized sources. YouTube URLs are normalized to an allowlisted video ID; the direct or Supadata adapter retrieves existing English captions, preserving timestamps. There is no generated transcription fallback.
3. The server stores extracted text in PostgreSQL and returns an owned source ID. The browser fetches the complete source for **View source**. Replacing a source is transactional; a rejected replacement preserves the prior source.
4. Starting a conversation rechecks ownership and expiry. The complete source is loaded as context, and provider acknowledgments are required before questions. No retrieval index or summarization is involved.
5. **Voice:** the backend mints a 60-second ephemeral credential through `/v1/realtime/client_secrets`. The browser exchanges an SDP offer with `/v1/realtime/calls`, then uses WebRTC audio and a data channel for session events and the visible transcript. The permanent API key stays on the server. This follows OpenAI's [WebRTC authentication flow](https://developers.openai.com/api/docs/guides/voice-webrtc).
6. **Text:** an authenticated backend holds the OpenAI WebSocket; the browser sends questions over HTTP and receives an NDJSON event stream. This works when microphone permission is denied. Stop, expiry, source changes and unmount release owned resources; there is no automatic replay of uncertain questions.

The application preparation ticket is single-use. The provider credential can be reused until its short expiry, and its expiry does not terminate an established session; see OpenAI's [client-secret contract](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create). Browser-side voice controls are not a server-enforced spending cap.

## YouTube on local and hosted environments

For the local workflow, configure the database and signing secret above, enable YouTube with `YOUTUBE_INGESTION_PROVIDER=direct`, start `npm run dev`, and import a public video with English captions. Open **View source** to check the beginning and end before starting a conversation. Unofficial retrieval can be blocked on residential connections as well as cloud hosts; availability is not guaranteed.

For a bounded extraction-only diagnostic, build first and run `npm run proof:captions:local -- --allow-public-youtube`. It makes two direct public YouTube attempts with no OpenAI, Supadata or real database access. It is separate from the normal owned-source workflow, and exits unsuccessfully when retrieval is blocked. See [current verification](docs/RELEASE.md#submission-readiness-review) for the outcome of this review.

Render uses Supadata because direct retrieval was blocked there. Prior hosted imports and a text answer are recorded with their revision in [release status](docs/RELEASE.md). If hosted caption retrieval becomes unavailable, the assessment permits a local demonstration, but only present a successful local run as evidence; an offline mocked test does not establish live caption access.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run browser:install
npm run test:smoke
npm run test:boundaries -- --http-only
```

Smoke tests start the production build on port 3100; build first. Offline tests use explicit synthetic boundaries and do not make paid requests. See [testing](docs/TESTING.md) for extended suites and real-device checks.

## Deployment

Use a persistent Node service such as the existing Render deployment. Build with `npm ci --include=dev && npm run build`, apply committed migrations with `npm run db:deploy` against the intended database, and start with `npm run start -- --hostname 0.0.0.0 --port $PORT` (Render's shell supplies `PORT`). Set the environment variables above in the hosting dashboard, use the exact HTTPS origin, and keep proof/local-HTTP flags false. Keep the traced PDF worker and parser dependencies in the deployment.

The text relay and admission registries live in the Node process, so this implementation assumes one running instance and long-lived streaming requests. A short-lived serverless function or multiple uncoordinated instances is not a drop-in deployment target. See [operations](docs/OPERATIONS.md) for current Render configuration, migrations, cleanup and release checks.

## Limits and known gaps

- PDFs: 25,000,000 bytes, 500 pages, 2,000,000 extracted characters. No OCR; complex layouts can lose reading order.
- YouTube: native English captions, up to 20,000 segments and 1,000,000 characters. Availability depends on upstream captions and provider quota; no generated transcription fallback.
- The entire source is prepared before questions. Provider truncation is disabled; a source that exceeds conversation limits fails visibly. Successful extraction does not guarantee model fit or answer accuracy.
- Answers have a 2,048-token output ceiling. Text sessions allow 20 questions, each up to 1,000 text units, with a 10-minute lifetime and 2-minute idle timeout.
- Anonymous ownership lasts at most one hour. One active source per visitor; successful replacement is atomic. Expired data becomes inaccessible; physical deletion uses the [cleanup procedure](docs/OPERATIONS.md#expired-data-cleanup).
- Admission controls are process-local: 60 text and 60 voice starts per visitor/hour, plus finite concurrency and aggregate limits. They are not an account-wide spending cap.
- Imports recover when their hourly window resets: PDFs allow 6 attempts per visitor/20 total, and captions 4 per visitor/8 total. Invalid admitted attempts count. Normal ingestion has no process-lifetime ceiling; timed rejections include a retry delay. See [operations](docs/OPERATIONS.md#ingestion-admission).
- The model has omitted a PDF exception in prior evaluation. Verify important answers against the source. Passing transport tests does not establish factual reliability.

[Release status](docs/RELEASE.md) records the deployed revision, verified checks, remaining phone/recording checks and dated dependency audit results. [Walkthrough guide](docs/WALKTHROUGH.md) covers the assessment demo.

## Production hardening

Before broader public use, add shared rate/spend enforcement, coordinate session ownership across instances, automate bounded expiry cleanup, and monitor sanitized failure/latency metrics. Validate backup/restore, browser/device audio behavior, and provider quota alerts. For stronger voice policy enforcement, move session control to a trusted server boundary; an ephemeral client credential protects the permanent key but does not make browser-supplied settings immutable. These are deployment considerations, not additional MVP features.

## AI-assisted development and demo

AI coding assistants contributed implementation, tests and documentation; historical task reports and experiments remain in Git history. This submission-readiness pass used OpenAI Codex to inspect the repository, write focused cancellation/encoding regression tests and their fix, run checks, and improve setup/submission documentation. Test outcomes and limitations are recorded separately from generated suggestions.

The [walkthrough outline](docs/WALKTHROUGH.md) covers a 13-minute demo of ingestion, voice/text, architecture, hosting, API integration and development tools. The outline is prepared; a recorded, publicly playable walkthrough is still a submission requirement.
