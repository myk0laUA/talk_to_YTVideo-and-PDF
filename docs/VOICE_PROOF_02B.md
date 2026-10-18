# Task 02b worker handoff

Implemented locally; proposed **READY_FOR_REVIEW**, subject to PM review. Step 02 remains IN_PROGRESS. No deployment, real database mutation, live provider call, credential creation, purchase or API spending occurred. No other task was started.

## Identity and changes

Branch `main`, HEAD `6f7fcda9d9bbb58b033c62d6b3328b46ca14848c` (PM documentation after accepted 02a `eae9444e520707a427602b88b535feb2b2135686`). Working tree is dirty; no commit/push made. Local production build **`H8OefkVNjEG3leIZd2G1D`**. Changed-file SHA256 manifest: ignored `artifacts/local/02b/changed-files.sha256.json`; build/HEAD/runtime identity: `identity.json`. The public deployment remains `c535122`; this work is local only.

| Files | Change |
|---|---|
| `src/app/proof/voice/page.tsx`, `src/server/proof/availability.ts` | Dynamic server-gated `/proof/voice`; no DB/provider request at render, no environment/config serialization. Only an enabled page mounts the client. |
| `src/app/proof/voice/voice-proof.tsx`, `voice-controller.ts` | Explicit Start, existing owned source and credential POSTs, real browser media/peer/data-channel/audio adapters, cancellable lifecycle, diagnostic transcript and safe status. |
| `src/app/globals.css` | Small wrapping control/transcript rules using existing shell tokens. Normal shell/import controls unchanged. |
| `src/server/proof/provider.ts` | Existing mint request now explicitly sets audio output, `marin`, input transcription `gpt-4o-mini-transcribe`, and server VAD with automatic response/interruption. Configured Realtime model and fixed source instructions remain unchanged. |
| `tests/unit/voice-proof.test.ts`, `tests/unit/proof.test.ts` | Injected browser-resource lifecycle checks, availability checks, deliberate provider-session schema assertions. |
| `tests/smoke/proof-disabled.spec.ts` | Disabled page check alongside existing fail-closed endpoint checks. Existing smoke flags remain forced false. |
| `playwright.voice.config.ts`, `tests/voice/voice.spec.ts`, `tests/voice/server-no-provider.cjs`, `package.json` | Isolated `npm run test:voice`, production server on free port 3101, synthetic environment and blocked external server fetch. No application mock mode or fixture endpoint. No dependency/lockfile changes. |
| `docs/PROJECT_STATE.md`, this report, `docs/REALTIME_PROOF_BOUNDARY.md`, `docs/TESTING.md` | Evidence and bounded runbook, preserving earlier handoffs and Step 01–14 IDs. |

## Behavior and boundaries

`/proof/voice` is unavailable by default. It requires existing `PROOF_ENABLED` and `REALTIME_ISSUANCE_ENABLED` flags plus valid proof configuration, model/key presence and database configuration presence. The availability check performs no health probe. Actual endpoint admission still decides availability. No new production environment variable is introduced.

Start runs once: POST `/api/proof-source` with `{}`, await microphone permission, POST `/api/realtime/client-secret` with the returned `sourceId`, create peer/audio/data channel, create/set offer, POST SDP to `https://api.openai.com/v1/realtime/calls` using only the ephemeral DTO, validate/apply the SDP answer. Denial never mints. Same-origin requests reuse the signed HttpOnly cookie; there is no browser owner marker, duplicate credential endpoint or operator route. Secrets never enter UI, URLs, console or storage; the parsed credential reference is erased before transport awaits and the attempt credential is cleared immediately after dispatch, on Stop and on every failure.

Ready requires all four: applied SDP answer, connected peer, open data channel and documented `session.created` with a Realtime session. No client session update overrides the server's fixed source/configured model. Received input transcription completions and assistant audio transcript deltas/finals are keyed by role/item ID/content index. The display is bounded to 30 items/8,000 characters per item, retains first arrival order and replaces final text without duplicating the item. It is diagnostic, not production transcript ordering/history. Unknown lifecycle events are ignored; malformed relevant events, service errors and failed responses end safely without displaying raw error payloads.

Stop invalidates the attempt identity first, aborts request/wait signals, clears timers and credential references, detaches callbacks, closes channel/peer, stops every tracked local/remote track, pauses/resets audio and drops resource references. Non-abortable media permission receives a late-track disposer. Old callbacks/results cannot change a new attempt. Cleanup also runs on error, timeout, pagehide and React unmount. Retry is explicit and creates fresh media/peer/credential resources; there is no retry/remint/reconnect loop.

The total startup deadline is 25 seconds, including permission wait. The ready session has a **60-second** limit. Browser timers can be delayed by suspension/backgrounding, and neither these timers nor ephemeral TTL enforce a provider spending cap or single-use credential. Stop cannot undo a source write or mint already admitted on the server. A pending native permission dialog cannot be dismissed by JavaScript; if granted after Stop, its returned tracks are immediately stopped. Physical behavior still needs PM device verification.

Remote track arrival attempts `audio.play()`. Rejection exposes **Enable audio playback**; successful resolution says playback is enabled, never that the user has heard sound. Keyboard Start/Stop, focus restoration, and 390px wrapping are browser-checked. The normal shell remains honest about unavailable imports/conversations. No text entry, Mute, polished conversation UI, ingestion or Step 03 work was added.

## Actual verification

All times below are **18 October 2026 UTC**, local Windows x64. PATH was prepended with checkout `.tools/node-v24.22.0-win-x64`; actual versions v24.22.0/npm 11.19.1. Inherited Node 26.5.0/npm 12.0.1 was observed before pinning; no acceptance command used it. No dependency install was needed. CLI validation/build checks used a synthetic loopback `DATABASE_URL` override, never the private `.env` value. No database connection is established by schema validation/generation/build.

| Command | UTC start–end | Observed result / exit | Evidence under `artifacts/local/02b/` |
|---|---|---|---|
| `npm run lint` | 05:29:01–05:29:05 | PASS / 0 | `lint-final.log` |
| `npm run typecheck` | 05:29:05–05:29:09 | PASS / 0 | `typecheck-final.log` |
| `npm test` | 05:29:09–05:29:12 | PASS, 93/93 (55 existing + 38 new) / 0 | `test-final.log` |
| `npm run db:validate` | 05:27:27–05:27:29 | PASS, schema valid / 0 | `db-validate.log` |
| `npm run build` | 05:27:29–05:27:36 | PASS, `/proof/voice` dynamic / 0 | `build.log`, build ID above |
| `npm run test:smoke` | 05:27:46–05:27:51 | PASS, 6/6 / 0 | `test-smoke.log` |
| `npm run test:voice` | 05:28:00–05:28:08 | PASS, 10/10 / 0 | `test-voice-final.log` |
| Runtime capture, `git diff --check`, port teardown inspection | See identity/runtime/teardown records | PASS, pinned versions, no whitespace defects, no listeners on 3100/3101 | `runtime.log`, `teardown.json` |

`checks.json` records exact fractional UTC times and exit statuses, including the earlier successful 85-test run. Final additions after build were tests and a test-config path correction only; application/provider/UI code is the same build exercised by both browser suites. An exploratory typecheck failed on recursively inferred mock fixture types and was fixed. The first isolated browser command failed before server startup because Windows backslashes were consumed in NODE_OPTIONS; normalized slash paths fixed it. The failed browser attempt is retained in `test-voice.log` and `checks.json`. No test scenario failed in the successful final runs. Playwright emitted harmless NO_COLOR/FORCE_COLOR warnings.

## Acceptance-to-test mapping

| Criterion | Evidence and observation |
|---|---|
| Default unavailable page/endpoints; original shell unchanged | `page gate is false for disabled or incomplete configuration`; smoke `default voice page never requests media or proof endpoints`; existing endpoint/shell checks. No request/capture at load, disabled Start, uncached 503 endpoints. |
| Source → permission → one mint → SDP/data channel; public DTO only | `voice order, one Start, readiness signal, actual events and idempotent cleanup`; existing provider contract test; browser success test. Exact stage order, `sourceId` body, ephemeral bearer only, one connection for simultaneous Starts. |
| Permission denial has zero mint calls | Unit `permission denial never mints` and browser `permission denial makes no credential request`. |
| Stop during all startup waits, late completions/events | Eight named `Stop during …` unit tests: source, media, mint, offer, local description, SDP fetch, SDP body, remote description. Pending media browser test; old event and late remote-track callbacks; `a stopped pending permission cannot attach its late stream to a retry`. |
| Explicit retry, unmount/navigation, failure and timeouts | Unit retry/disposal/connection-failure/deadline cases; `default active timer ends at 60 seconds, not credential expiry`; browser success navigates to shell and asserts peer close. Acquired tracks stop once, timers/abort signals clean, listeners/audio references detach. |
| Real readiness and autoplay handling | `session.created alone cannot claim readiness`; unit autoplay rejection/late playback test; browser explicit Enable audio playback action. Track presence is not presented as audible success. |
| Credential expiry, policy errors, invalid SDP/events | Unit invalid/expired/extra-field DTO, expiry during offer, 401/403/404/429/503 admission cases; SDP 401/403/429/503, invalid SDP content type; malformed/session/transcript/error/failed-response cases. Safe messages, no raw payload, no retries. |
| Received transcript and mobile/keyboard usability | Supplied synthetic input/assistant events appear, final overwrites delta; browser success/denial/ended screenshots at 1440×1000 and 390×844, no horizontal overflow, keyboard Start and focus restored after Stop. |

Six screenshots were opened and visually inspected: `desktop-success.png`, `desktop-error.png`, `desktop-ended.png`, and corresponding `mobile-*.png`. They contain only the synthetic lighthouse mock and supplied mock text, no credentials/SDP. Mobile content scrolls vertically; no clipped controls or horizontal overflow observed.

## Isolated mocked browser command and safety boundary

Run `npm run build`, then `npm run test:voice` with pinned PATH and port **3101 free**. The checked-in test config supplies synthetic cookie/key/model/database values to its child production server only; it does not edit `.env`. The test server uses an intentionally mismatched HTTPS origin and an unusable loopback database on port 1. The preload rejects external server `fetch` calls. Every browser `/api/proof-source` write and `/api/realtime/client-secret` request is fulfilled by Playwright, every OpenAI request is intercepted (only the expected calls path is mocked), every other external browser request and unexpected API route is blocked. Service workers are blocked. Browser peer, media, stream and audio objects are fakes, so no real RTC/media traffic is generated. The success test verifies the expected synthetic bearer as a boolean without printing it. Trace/video/automatic screenshots are off; only deliberate synthetic UI screenshots are retained.

Playwright owns startup and teardown, refuses to reuse an existing server, and port inspection found no remaining 3100/3101 listeners afterward. Existing `npm run test:smoke` remains separate on port 3100 with both flags false; its configuration was not weakened. Neither suite proves real PostgreSQL, OpenAI, physical microphone permission, audible playback or iPhone behavior.

## Official documentation consulted

Searched and opened **18 October 2026**, using the installed OpenAI Docs skill; preserved the server-configured Realtime model (example `gpt-realtime`), no model upgrade:

- [WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime): ephemeral bearer plus raw SDP POST `/v1/realtime/calls`, peer/media/data channel flow.
- [Create client secret](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create): GA session audio input/output configuration, available transcription model schema, configurable TTL limitations.
- [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations): `session.created` readiness and current output-audio transcript events.
- [Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events): current event shapes. HTML retrieval exceeded the browsing tool limit; fetched and read its [official Markdown form](https://developers.openai.com/api/reference/resources/realtime/server-events.md), saved as ignored `official-server-events.md`.
- [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription): input completion item IDs/content index and asynchronous transcript ordering. This proof remains a Realtime voice session, not a standalone transcription session.

Read version-matched Next 16.4.2 guides under `node_modules/next/dist/docs/`: `01-app/01-getting-started/05-server-and-client-components.md` and `01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`; existing 02a route boundaries retained. Applied selected React serialization/event/listener guidance, Playwright tests/mocking guidance, and only existing-context Impeccable guidance. No delegation or broad redesign/audit.

## PM-only checks still NOT_RUN

1. Complete 02a real-database two-visitor/reuse/ownership/expiry checks first, with provider disabled/injected stub; record local DB versus deployed HTTP coverage and exact build.
2. After client funding/key and explicit bounded allocation, configure secrets privately, deploy reviewed build to existing Free service, enable proof/issuance only for the timeboxed test.
3. On physical iPhone visit `/proof/voice`, Start, grant microphone, ask “How many windows does the blue lighthouse have?” Observe actual spoken seven and real events. Stop must end recording indicator and audio. Record device/browser/model/build/UTC times and outcome without raw audio/credentials.
4. Test denial and Stop while connecting, verify no orphaned capture/connection, then disable proof and issuance. Real provider/phone lifecycle remains NOT_RUN despite mock passes.
5. Complete the separate microphone-free text transport proof before claiming Step 02 complete. Full mobile workflow, ingestion, finished transcript UI and Steps 08–09 remain outside this task.

PM retains acceptance, secrets, funding, live checks and deployment. Return at this boundary with proposed READY_FOR_REVIEW, never Step 02 DONE.
