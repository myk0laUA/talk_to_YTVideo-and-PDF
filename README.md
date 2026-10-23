# Talk to a Document

Ask questions about a PDF or YouTube video by voice or text. Import one source, inspect its extracted content, and explore it in a temporary, anonymous workspace.

**[Live app](https://talk-to-document-4pre.onrender.com)** · **[Source code](https://github.com/myk0laUA/talk_to_YTVideo-and-PDF)**

Built for the Genius Innovation Lab take-home assessment. Supports selectable-text PDFs, native English YouTube captions, source-grounded answers, light/dark themes and mobile layouts. No account is required.

## Contents

- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Using the app](#using-the-app)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [API endpoints](#api-endpoints)
- [Limits and tradeoffs](#limits-and-tradeoffs)
- [Testing](#testing)
- [Deployment and operations](#deployment-and-operations)
- [Troubleshooting](#troubleshooting)
- [Verification and submission status](#verification-and-submission-status)
- [Credits](#credits)

## Local setup

### Prerequisites

- **Node.js 24.22.0 and npm 11.19.1**, pinned in `.node-version` and `package.json`.
- **PostgreSQL**, locally or through a hosted provider. The database user needs migration permissions.
- An **OpenAI API key** with access to `gpt-realtime-2.1` for conversations.
- A WebRTC-capable browser and microphone for voice. Microphone access requires HTTPS or localhost.
- A **Supadata API key** if using managed YouTube retrieval. Local direct retrieval does not need one.

### Install and configure

```sh
git clone https://github.com/myk0laUA/talk_to_YTVideo-and-PDF.git
cd talk_to_YTVideo-and-PDF
npm ci
```

Copy `.env.example` to `.env`:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Set `DATABASE_URL` to an existing empty development database, for example `postgresql://USER:PASSWORD@localhost:5432/talk_to_document`, and set `OPENAI_API_KEY`. Generate the cookie signing secret and paste it into `VISITOR_COOKIE_SECRET` in your private `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For a local app with both imports and conversation modes enabled, use:

```dotenv
APP_ORIGIN=http://localhost:3000
PDF_INGESTION_ENABLED=true
PDF_INGESTION_LOCAL_HTTP=true
OWNED_SOURCE_TEXT_ENABLED=true
OWNED_SOURCE_VOICE_ENABLED=true
YOUTUBE_INGESTION_ENABLED=true
YOUTUBE_INGESTION_PROVIDER=direct
YOUTUBE_INGESTION_LOCAL_HTTP=true
```

Apply the committed migrations, then start:

```sh
npm run db:deploy
npm run db:status
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**. Use the exact configured origin: `localhost` and `127.0.0.1` are different origins. If you change the port, update `APP_ORIGIN` too.

The interface can run without credentials, but imports and conversations remain disabled. Restart the server after changing `.env`. Never commit credentials or expose them through `NEXT_PUBLIC_` variables.

### Run a production build locally

```sh
npm run build
npm run start
```

Use the same local origin and HTTP opt-ins. Stop the development server first if it occupies port 3000.

## Configuration

All settings are server-side. The example defaults to disabled features so a new checkout cannot accidentally make paid requests.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Use the provider's verified TLS configuration for remote databases. |
| `OPENAI_API_KEY` | Conversations in either mode. PDF extraction and caption retrieval do not use OpenAI. |
| `VISITOR_COOKIE_SECRET` | 64 hexadecimal characters signing anonymous ownership cookies. Rotation invalidates existing cookies. |
| `APP_ORIGIN` | Exact application origin, including port if needed, without a trailing slash. |
| `PDF_INGESTION_ENABLED` | Enable PDF upload. Requires database, origin and cookie configuration. |
| `OWNED_SOURCE_TEXT_ENABLED` | Enable text conversations. Requires OpenAI and an enabled ingestion path. |
| `OWNED_SOURCE_VOICE_ENABLED` | Enable voice conversations independently of text. |
| `YOUTUBE_INGESTION_ENABLED` | Enable caption import. |
| `YOUTUBE_INGESTION_PROVIDER` | Use `direct` locally or `supadata` on Render. `auto` also exists for the managed fallback policy; explicit selection is simpler for deployment. |
| `SUPADATA_API_KEY` | Required for `supadata` or `auto`; leave empty for `direct`. |
| `PDF_INGESTION_LOCAL_HTTP`, `YOUTUBE_INGESTION_LOCAL_HTTP` | Allow loopback HTTP locally. Keep both `false` on public deployments. |

Normal use needs no proof or diagnostic flags; those endpoints are disabled by default. Model and speech settings live in [priming-provider-policy.ts](src/shared/priming-provider-policy.ts), rather than environment overrides.

## Using the app

1. Upload a PDF with selectable text or paste a public YouTube URL with English captions.
2. Open **View source** to inspect the complete extracted text, pages or timestamped captions.
3. Choose **Voice mode** or **Text mode**, then start.
4. Ask a question, follow up, and check important claims against the source.

Voice has independent microphone and speaker mute, interruption and End controls. Sound starts enabled; if the browser blocks autoplay, use **Tap to enable sound**. An interrupted answer keeps its received text with an **Interrupted** label.

After a connection loss, voice reconnects automatically and restores completed dialogue before enabling the microphone. Mute choices survive. After three consecutive connection failures, recovery pauses and offers **Retry connection**. **End voice** cancels recovery. Partial or untranscribed speech may need repeating; the app does not replay questions or resume interrupted audio automatically.

Switch between **Voice mode** and **Text mode** to continue the same conversation. Messages and unsent text drafts stay in the workspace. The new connection restores completed turns before accepting another question; unfinished answers remain visible and are not replayed. Text mode works without microphone permission.

Ending a session preserves its visible text. An explicit fresh start, source replacement or page reload clears the conversation. A text connection failure still requires an explicit restart. There is one active source and connection per workspace.

## Tech stack

| Layer | Technology and role |
|---|---|
| Application | Next.js 16.4.2 App Router, React 19.3.1, TypeScript 5.9.3; one Node service for UI and APIs. |
| Interface | CSS, accessible native controls, inline SVG icons and locally hosted Geist font. |
| Storage | PostgreSQL with Prisma 7.10.1 and committed schema migrations. |
| PDF ingestion | `pdf-parse` in a bounded server worker with size and execution deadlines. |
| YouTube ingestion | `youtube-transcript-plus` for direct retrieval; Supadata for hosted native-caption retrieval. |
| Voice | OpenAI Realtime, `gpt-realtime-2.1`, WebRTC audio and data-channel events; Marin voice, server VAD and input transcription. |
| Text | The same model over a server-owned WebSocket; HTTP questions and an NDJSON response stream to the browser. |
| Verification | Node's test runner, Playwright, ESLint and TypeScript checks. |
| Hosting | Render Node web service with PostgreSQL; currently one application instance. |

The lockfile pins dependencies. Both modes use the larger model by default; there is no automatic smaller-model fallback.

## Architecture

```mermaid
flowchart LR
    Browser[Browser workspace] -->|PDF or YouTube URL| API[Next.js APIs]
    API --> PDF[PDF extraction worker]
    API --> Captions[Direct captions or Supadata]
    PDF --> DB[(PostgreSQL)]
    Captions --> DB
    DB -->|Owned source and context| API
    API -->|Preview and voice preparation| Browser
    API -->|Ephemeral credential request| OpenAI[OpenAI Realtime]
    Browser <-->|Voice: WebRTC audio and events| OpenAI
    Browser <-->|Text: HTTP and NDJSON| Relay[Server text relay]
    Relay <-->|WebSocket| OpenAI
```

### Source storage and ownership

A signed HttpOnly cookie establishes anonymous ownership. Every source read, mutation and session preparation checks ownership and expiry. Client-supplied owner IDs are not trusted.

The `Source` table stores extracted text, ordered sections, metadata and expiry. A unique active-owner slot and transactions enforce one active source per visitor. Successful replacement swaps that slot atomically; failed extraction preserves the previous source. A separate `TranscriptCache` stores validated public captions only, never private PDF content. Compatible caption requests can share retrieval work while receiving separate owned sources.

Source responses omit owner hashes and internal database fields. PDFs and captions are untrusted content, rendered as text. The app validates origins, request bodies, input limits and deadlines before accessing providers.

### Full-source context and transport

The complete source is prepared before questions, with captions packed losslessly into bounded messages. There are no embeddings, retrieval index or preliminary summaries. Provider acknowledgments must confirm source and settings before the conversation is ready. Context truncation is disabled, so oversized context fails visibly.

For voice, the backend authorizes a single-use preparation ticket and issues a short-lived provider credential. The browser establishes WebRTC with OpenAI; the permanent API key stays on the server. On reconnect, a new authorized connection receives the source and completed dialogue in order before microphone access. Displayed text is not proof that every word was audibly played.

For text, the server holds the provider WebSocket and key. The browser submits questions over HTTP and consumes streamed NDJSON. Shared lifecycle state machines reject stale events and release pending work on cancellation, expiry, source changes and teardown.

A source-scoped browser memory owns the shared transcript and draft. Mode changes dispose the outgoing connection before starting the next one. Both transports restore bounded user/assistant dialogue and require exact provider acknowledgments; the client cannot supply system messages through the text API. Incomplete turns are retained for display but excluded from restored context. Each switch resends the source and eligible history, adding setup latency and provider input cost.

The database stores sources, not permanent chat history. Visible conversation history is temporary browser state; text relay sessions, admission counters and replay guards live in the Node process.

### Repository layout

```text
src/app/             UI components, styles and HTTP route entry points
src/server/          Authorization, extraction, persistence and provider integrations
src/shared/          Client-safe contracts, source context and conversation state machines
prisma/              Schema and committed migrations
public/fonts/        Local Geist font and its licence
scripts/             Database expiry cleanup and persistence probe
tests/               Unit/browser suites, integration runners and synthetic fixtures
  config/            Playwright configurations
  integration/       Verification runners and fixture generation
```

## API endpoints

These APIs serve the same-origin browser application; they are not an API-key-authenticated public SDK. JSON endpoints require `Content-Type: application/json`. Source, session, request and question IDs are UUIDs; `preparationId` is an opaque server-issued token. Ownership comes from the cookie, not the request body. Mutating requests require the configured origin.

| Method | Endpoint | Request / result |
|---|---|---|
| `POST` | `/api/sources/pdf` | Multipart `file`; returns `201` with source metadata. Replaces the current source on success. |
| `POST` | `/api/sources/youtube` | `{ video, language? }`, where `video` is a supported URL or video ID and language defaults to English; returns `201` with source metadata. |
| `GET` | `/api/sources/:id` | Returns the owned source's complete extracted text and sections. |
| `DELETE` | `/api/sources/:id` | Removes the owned source and invalidates associated application sessions. |
| `POST` | `/api/voice-preparations` | `{ sourceId, requestId }`; returns `201` with `preparationId`, timing and source/policy input. This is not microphone readiness. |
| `POST` | `/api/voice-preparations/credential` | `{ sourceId, requestId, preparationId }`; consumes the preparation and returns an ephemeral `clientSecret` and expiry. |
| `POST` | `/api/voice-preparations/cancel` | `{ sourceId, requestId }`; cancels pending preparation, returning `{ cancelled: true }`. |
| `POST` | `/api/text-sessions` | `{ sourceId, requestId, history? }`; returns `201` with `{ sessionId }`. Optional history is same-source user/assistant dialogue. |
| `GET` | `/api/text-sessions/:id/stream` | Streams session events as `application/x-ndjson`; this is not SSE. |
| `POST` | `/api/text-sessions/question` | `{ sessionId, questionId, question }`; returns `202` after acceptance. The answer arrives on the stream. |
| `POST` | `/api/text-sessions/stop` | `{ requestId }` using the start request's ID; returns `{ ok: true }`. |

The optional text-start `history` has shape `{ sourceId, turns: [{ role: "user" | "assistant", text }] }`, limited to 128 turns and 128,000 characters. The start request body is capped at 800,000 bytes. History is untrusted conversation context; the server independently authorizes and loads the original source.

A first source request can return `401` while establishing the visitor cookie; the browser retries that handshake once. Foreign, missing or expired sources are not disclosed. Other failures include invalid input (`400`), forbidden origin (`403`), replacement conflict (`409`), excessive size (`413`), unsupported content (`415`/`422`), admission limits (`429`), and unavailable upstream/storage (`502`/`503`/`504`). Timed ingestion/voice admission rejections include `Retry-After`; busy and provider-quota failures may need different recovery.

Retained diagnostic routes—`/api/proof-source`, `/api/proof-pdf`, `/api/proof-captions` and `/api/realtime/client-secret`—are disabled on the public host. They are not needed for ordinary uploaded-source conversations.

## Limits and tradeoffs

| Choice / boundary | Benefit and cost |
|---|---|
| Complete source in context | Straightforward grounding without a retrieval pipeline. Large sources cost more and may exceed provider capacity; successful import does not guarantee conversation fit. |
| One larger model | Better observed results on the supplied PDF/video examples. Higher cost than a smaller model; no guarantee of factual accuracy. A PDF exception was omitted in an earlier evaluation. |
| PDF extraction only | Up to **25,000,000 bytes**, **500 pages**, **2,000,000 extracted characters**. No OCR; encrypted, image-only or malformed PDFs fail. Complex layouts may lose reading order. |
| Native English captions | Up to **20,000 segments** and **1,000,000 characters**. No translation or generated transcription fallback. Direct retrieval can be blocked; Supadata adds a key, quota and external dependency. |
| Temporary anonymous ownership | No sign-up or permanent chat database. Access expires within one hour; reloading loses the current workspace. Expired rows require physical cleanup. |
| Bounded conversations | **2,048 output tokens** per answer. Text allows **20 questions**, each up to **1,000 UTF-16 code units**, a **10-minute lifetime** and **2-minute idle timeout**. |
| Voice activity detection | Threshold **0.65**, silence duration **600 ms**. Helps reduce noise activation but may miss quiet speech; requires real-device tuning. |
| Process-local coordination | Simple single-instance deployment. Session state and limits do not coordinate across replicas or survive server restarts. |

Imports use resettable hourly windows: **6 PDF attempts per visitor / 20 aggregate**, and **4 caption attempts per visitor / 8 aggregate**. Invalid admitted attempts count. There is no process-lifetime ingestion ceiling. One PDF extraction or incompatible caption job runs at a time.

Text and voice starts each allow **60 per visitor/hour / 600 aggregate/hour**, plus concurrency limits and finite process-lifetime replay/admission bounds. These are not distributed or account-wide spending guarantees. Voice's short-lived client credential protects the permanent key, but browser-side settings and session controls are not a trusted server-enforced spending cap.

Before wider public use, add shared quota/spend enforcement, coordinated session ownership, scheduled expiry cleanup, provider-quota alerts, and backup/restore verification. Stronger voice policy enforcement needs trusted server-side session control.

## Testing

### Core checks

```sh
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

These checks need no live provider credentials or database. Use a clean environment for offline verification. If Prisma validation requires a URL, provide an inert loopback PostgreSQL URL for that command only. Smoke tests start the built app on port 3100; do not rebuild while a built-server suite is running.

### Focused regression suites

| Area | Commands (`npm run …`) |
|---|---|
| Imports, replacement, keyboard focus, themes and responsive layout | `test:workspace`, `test:source-ui`, `test:youtube-ui` |
| Session controls, transcripts and reconnect/cancellation | `test:text-session`, `test:voice-session`, `test:transcript-view`, `test:mode-switch`, `test:recovery` |
| Server text relay and browser voice adapter | `test:owned-text`, `test:owned-voice`, `test:voice-adapter`, `test:voice-preparation` |
| PDF/source HTTP boundaries | `test:pdf:http`, `test:sources:http`, `test:youtube:http` |
| Caption cache, coalescing, fallback, English selection and entity decoding | `test:captions:cache`, `test:captions:coalescing`, `test:captions:fallback`, `test:source-limits`, `test:caption-entities` |
| Unit coverage | `test:coverage` |

Run suites sequentially on smaller machines. Recovery supports `npm run test:recovery -- --workers=2`. Coverage includes loaded unit-test modules, excluding generated Prisma code; it is not whole-application or physical-audio coverage.

PDF HTTP suites need synthetic fixtures. In an optional Python virtual environment, run:

```sh
python -m pip install -r tests/integration/fixture-requirements.txt
python tests/integration/generate-pdf-fixtures.py
```

Generated fixtures, logs and browser reports stay in ignored `artifacts/local/`, `test-results/` or `playwright-report/`. For SQL cleanup/race checks, use a migrated, initially empty disposable database, set `TEST_CLEANUP_DATABASE_URL` separately from `DATABASE_URL` and `CLEANUP_DISPOSABLE_ACK=I_CONFIRM_EMPTY_DISPOSABLE_DATABASE`, then run `npm run test:cleanup:postgres`. Never target shared data.

### Live acceptance

Use nonprivate sources and bound real provider requests/costs. Verify PDF and English-caption import, complete previews, replacement and ownership isolation, then source-specific text answers and follow-ups. On a physical phone, test audible speech, interruption, independent mute controls, microphone-denial text fallback, scrolling and network reconnection. Confirm completed dialogue survives reconnect, **Reconnected** disappears after three seconds, and End prevents recovery. Test ordinary/quiet speech and incidental handling noise at the current threshold.

Record revision, device/OS/browser and actual outcomes. Synthetic audio, viewport emulation and displayed speech text do not prove audible playback or answer accuracy.

## Deployment and operations

### Render

Use a persistent **single-instance Node service** with PostgreSQL and long-lived streaming support. Short-lived serverless functions or uncoordinated replicas are not drop-in targets.

| Setting | Value |
|---|---|
| Build | `npm ci --include=dev && npm run build` |
| Start | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Health check | `/` |
| Origin | Exact public HTTPS URL |
| Hosted captions | `YOUTUBE_INGESTION_PROVIDER=supadata` with private `SUPADATA_API_KEY` |

Enable the four ingestion/conversation flags, keep both local-HTTP opt-ins false, and leave proof routes disabled. Retain the traced PDF worker/parser dependencies. Set secrets privately in the hosting environment.

Before release, run `npm run db:status`; apply outstanding committed migrations with `npm run db:deploy` against the intended database. Do not run development migrations or reset a production database. Deploy the tested commit, verify the live build and repeat bounded acceptance checks.

On the existing Render service, nonsecret feature flags and `APP_ORIGIN` are prefixed in the Start Command; those assignments override matching dashboard Environment values. Auto-deploy is disabled, so documentation-only pushes do not replace the live application. The current free service can have a slow cold start after inactivity.

### Expired-data cleanup

Access checks enforce expiry immediately; rows are physically deleted by an operator. No cleanup scheduler is configured. Run cleanup daily while the assessment is open and around demonstrations, using the intended `DATABASE_URL`:

```sh
npm run db:cleanup -- --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
# Inspect the dry-run, then execute against the same database.
npm run db:cleanup -- --execute --batch-size 100 --max-rows 1000 --max-batches 20 --timeout-ms 30000
```

Dry-run is the default. Execution deletes only Source/TranscriptCache rows expired at its cutoff, in bounded transactions. Exit `0` means the bounded scan completed, `2` means a cap was reached, and `1` means failure/cancellation/timeout. Earlier batches may remain committed after a later failure; inspect results before retrying. `npm run db:cleanup -- --help` lists bounds.

### Database persistence probe

`scripts/` contains operational tools, not application UI. `npm run db:probe` writes one identifiable synthetic source, verifies it across processes/restarts, then deletes only that fixture. It is never invoked by build/start/test.

```sh
npm run db:probe -- write --manifest <absolute-private-path>
npm run db:probe -- verify --manifest <same-path>
npm run db:probe -- cleanup --manifest <same-path>
```

The manifest contains private ownership/control data: store it outside the checkout with owner-only permissions and retain it until cleanup succeeds. Preserve the same handle across restarts or uncertain outcomes; do not issue a new write to conceal a failed check. The fixture expires after two hours; verification does not extend it. `prepare`, `validate` and `write-existing` support a pre-created manifest; see `npm run db:probe -- --help`. Keep database TLS verification enabled.

## Troubleshooting

| Symptom | Check |
|---|---|
| Imports or conversations disabled | Required credentials, matching origin, feature flags and migrations; restart after editing `.env`. |
| First upload returns `401`, then succeeds | Expected anonymous-cookie bootstrap. Persistent failures suggest blocked cookies or an origin mismatch. |
| YouTube works locally but fails on the host | Use Supadata on Render. Check native English captions, API key and quota. Direct YouTube access may be blocked. |
| Import succeeds but conversation cannot start | Extraction limits and model context capacity differ. Inspect the source and try a smaller document/video. |
| `429` or busy status | Observe the displayed wait. Timed limits recover; concurrent work must finish. Provider quota may require operator action. |
| No audible output | Check speaker mute, browser autoplay permission and **Tap to enable sound**. Displayed text alone does not confirm playback. |
| Voice fails on a phone over a LAN HTTP address | Remote HTTP is not a secure microphone context. Test the public HTTPS deployment. |
| Voice reconnect stops retrying | After three connection failures, use **Retry connection**. Expired source/authorization/history errors require resolving that cause. |
| Data expires but database rows remain | Run the bounded expiry cleanup; access expiry and physical deletion are separate. |

Do not log credentials, cookies, SDP, raw provider errors or private document text when investigating failures.

## Verification and submission status

As of **23 October 2026**, application revision [`320c530`](https://github.com/myk0laUA/talk_to_YTVideo-and-PDF/commit/320c530b351204ac72804a25784fdc802f88fdff) is deployed. Hosted PDF/YouTube ingestion and source-grounded text responses have been exercised. The latest phone-status change passed 1,646 unit tests, lint/types/build, targeted voice/transcript/recovery and mode-switch suites, 138 layout states, and hosted PDF/voice-preparation checks confirming threshold 0.65. These results do not establish general model reliability.

The user has tested the app and reconnection on a physical phone. The latest threshold/status polish still needs a phone retest with explicit audio results. A **public 10–15 minute walkthrough is still outstanding**; no recording link is available yet.

For the walkthrough, demonstrate PDF and YouTube import, source inspection, audible voice and interruption, text fallback, source replacement and reconnection. Then explain architecture, API integration, tradeoffs, testing and the development tools used. Show actual outcomes, disclose limitations, and verify the recording link plays with sound while signed out. Historical implementation/release notes remain recoverable in Git history; generated evidence stays outside tracked documentation.

## Credits

AI coding assistants contributed implementation, tests and documentation. OpenAI Codex was used for repository review, regression fixes, verification and deployment work; generated suggestions were checked against code and test evidence.

Geist is self-hosted from [vercel/geist-font](https://github.com/vercel/geist-font/tree/d1d9ce6e929a35f0e24b7cd10573f17db58196a0), using the unmodified `fonts/Geist/webfonts/Geist[wght].woff2`, vendored as `GeistVariable.woff2`. Copyright 2024 The Geist Project Authors; see the retained [SIL Open Font License](public/fonts/OFL.txt).
