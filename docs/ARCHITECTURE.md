# Architecture

## Source lifecycle

PDF files are parsed on the server in a bounded worker. YouTube adapters return native captions with timestamps. Extracted content is stored as an owned PostgreSQL `Source`; public caption results have a separate cache. Successful replacement changes the visitor's active source transactionally. A failed import preserves the prior source.

A signed, HttpOnly visitor cookie establishes anonymous ownership. Services check ownership and expiry before reads, mutations and conversation preparation. Browser-provided owner identifiers are never trusted. Database access alone is not authorization.

## Conversation transports

Both modes prepare the complete source, instructions and settings, and wait for acknowledgments before becoming ready. Captions are packed losslessly into bounded messages. Oversized input produces an explicit failure instead of silent truncation.

- **Voice:** the backend authorizes a one-use preparation ticket, then issues a short-lived provider credential. The browser uses WebRTC. Microphone access follows source readiness; mute, interruption and Stop release or control the relevant media resources.
- **Text:** the backend holds the provider credential and WebSocket. The browser submits questions through HTTP and receives streamed events. No microphone or speaker permission is required.

Both default to `gpt-realtime-2.1` with a 2,048-token output limit and disabled context truncation. Voice uses Marin, input transcription and server VAD. There is no automatic smaller-model fallback.

Shared lifecycle state machines reject stale events and release pending work on Stop, mode/source changes, expiry or transport failure. One mounted conversation owner is active at a time. Received text is temporary browser state; mode changes and restart clear it.

## Trust boundaries

- `src/app`: presentation and route entry points.
- `src/server`: permanent secrets, extraction, storage, admission and provider operations; runtime entry modules import `server-only`.
- `src/shared`: serializable contracts and client-safe state machines.
- Source DTOs exclude owner hashes, raw ORM records and environment objects.
- Routes enforce origin/fetch metadata, signed visitors, ownership, expiry, bounded bodies and deadlines. API responses are noncacheable.
- Document/caption text is untrusted data and rendered as text. Model instructions request source-grounded answers; this does not guarantee prompt-injection resistance or factual correctness.

PostgreSQL is required for source storage. There are no accounts, embeddings, vector database, permanent chat history or OCR. Synthetic proof routes remain gated off in the public deployment. Rate limits are process-local; distributed quotas and account-wide spend enforcement are outside this assessment.
