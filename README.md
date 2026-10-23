# Talk to a Document

Explore a PDF or YouTube video through voice or text. Upload one source, inspect the extracted text, and ask questions in a temporary, anonymous conversation.

**[Live app](https://talk-to-document-4pre.onrender.com)** · [Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) · [Operations](docs/OPERATIONS.md)

The hosted app supports PDF and English-caption YouTube sources, with voice and text conversation. Hosted captions use Supadata because direct YouTube requests were blocked on Render. No accounts, embeddings, vector database or permanent conversation history.

## Quick start

Use **Node 24.22.0** and **npm 11.19.1**. Versions are pinned in `.node-version`, `.nvmrc` and `package.json`.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Without configuration, the interface runs with imports and conversations disabled. To enable the application:

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the intended PostgreSQL database, `OPENAI_API_KEY` to a server-side key with model access, and `VISITOR_COOKIE_SECRET` to 32 cryptographically random bytes encoded as 64 hexadecimal characters.
3. Keep `APP_ORIGIN=http://localhost:3000`. Enable `PDF_INGESTION_ENABLED`, `PDF_INGESTION_LOCAL_HTTP`, `OWNED_SOURCE_TEXT_ENABLED` and `OWNED_SOURCE_VOICE_ENABLED` by setting them to `true`.
4. Run `npm run db:deploy`, then `npm run db:status` to apply and verify committed migrations.
5. Restart `npm run dev` and use the exact configured origin.

For local YouTube import, also set `YOUTUBE_INGESTION_ENABLED=true`, `YOUTUBE_INGESTION_PROVIDER=direct` and `YOUTUBE_INGESTION_LOCAL_HTTP=true`. Only native English captions are accepted; unavailable captions or upstream blocking produce an error. A managed Supadata adapter is optional and needs its own key.

Keep all synthetic proof flags disabled for normal use. Never commit `.env`, prefix secrets with `NEXT_PUBLIC_`, or reset a shared database. Model requests incur provider charges.

## Using the app

- Upload a selectable-text PDF or import a public video with English captions.
- Open **View source** to inspect the extracted content.
- Choose **Voice mode** or **Text mode**, then start the conversation.
- Voice has independent microphone/speaker mute, interruption and End controls. If autoplay is blocked, use **Tap to enable sound**.
- Text works without microphone access. Stop preserves received text; starting again clears it. Switching modes or replacing the source clears the conversation. Nothing resumes or resends automatically.

## Stack and structure

Next.js App Router, React, TypeScript, Prisma and PostgreSQL. Voice uses OpenAI Realtime over WebRTC; text uses a server-side WebSocket relay and browser HTTP stream. Both use **gpt-realtime-2.1**.

```text
src/app/       Interface and HTTP routes
src/server/    Extraction, authorization, storage and provider integrations
src/shared/    Safe contracts and conversation state machines
prisma/        Schema and committed migrations
tests/         Unit, browser and integration regression coverage
scripts/       Verification tools, fixture generation and database operations
public/        Local font assets and licence
docs/          Architecture, testing, operations and release information
```

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

## Limits and known gaps

- PDFs: 25,000,000 bytes, 500 pages, 2,000,000 extracted characters. No OCR; complex layouts can lose reading order.
- YouTube: native English captions, up to 20,000 segments and 1,000,000 characters. Availability depends on upstream captions and provider quota; no generated transcription fallback.
- The entire source is prepared before questions. Provider truncation is disabled; a source that exceeds conversation limits fails visibly. Successful extraction does not guarantee model fit or answer accuracy.
- Answers have a 2,048-token output ceiling. Text sessions allow 20 questions, each up to 1,000 text units, with a 10-minute lifetime and 2-minute idle timeout.
- Anonymous ownership lasts at most one hour. One active source per visitor; successful replacement is atomic. Expired data becomes inaccessible; physical deletion uses the [cleanup procedure](docs/OPERATIONS.md#expired-data-cleanup).
- Admission controls are process-local: 60 text and 60 voice starts per visitor/hour, plus finite concurrency and aggregate limits. They are not an account-wide spending cap.
- The model has omitted a PDF exception in prior evaluation. Verify important answers against the source. Passing transport tests does not establish factual reliability.

[Release status](docs/RELEASE.md) records the deployed revision, verified checks, remaining phone/recording checks and dated dependency audit results. [Walkthrough guide](docs/WALKTHROUGH.md) covers the assessment demo.

AI coding assistants contributed implementation, tests and documentation. Historical task reports and experiments are retained in Git history rather than the product checkout.
