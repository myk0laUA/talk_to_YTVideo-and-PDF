# Task 02c — microphone-free text transport

Proposed **READY_FOR_REVIEW**, local/mock scope only. Step 01 DONE; Step 02 IN_PROGRESS. No deployment, real database write, live API request, paid tool, key creation, migration or another-chat message. This is a Step 02 transport proof, not finished Step 10 fallback or ingestion.

## Identity and changed files

Arrival: clean `main`, HEAD `c8a6d19` (full identity in ignored `artifacts/local/02c/identity.json`), including accepted 02b application `716e120aff0823952fd0255f2a86a9877e5c6db6`. No commit or push; return dirty files for PM review. Public deployment remains `c535122`. Exact final build and SHA256 file inventory are in `artifacts/local/02c/identity.json` and `changed-files.sha256.json`; command timestamps/exits are in `checks.json`. No dependencies, package-lock, schema or migrations changed.

- `src/app/proof/text/{page.tsx,text-proof.tsx,text-controller.ts}`: opt-in page, keyboard form, injectable cancellable WebSocket lifecycle, bounded received assistant text.
- `src/server/proof/{config,availability,handlers,provider}.ts`, `src/shared/proof.ts`: separate text gate, allowlisted mode, fixed text session, minimal public model field, existing shared authorization/admission.
- `src/app/proof/voice/page.tsx`, `src/app/globals.css`: plain navigation link with prefetch disabled and a readable input using existing tokens. Voice controller unchanged.
- `.env.example`, `package.json`, `playwright.text.config.ts`, `playwright.config.ts`, `tests/text/text.spec.ts`, `tests/unit/{text-proof,proof}.test.ts`, `tests/smoke/proof-disabled.spec.ts`: disabled configuration, isolated browser command, tests; smoke retains false flags and now explicitly disables traces/video.
- This handoff, `docs/TESTING.md`, `docs/REALTIME_PROOF_BOUNDARY.md`, `docs/PROJECT_STATE.md`: contracts, evidence, unchanged PM gates.

## Mode and public data contracts

`TEXT_PROOF_ENABLED=false` by default; text page requires this plus the existing voice availability prerequisites. Text mint also checks this flag before database/admission/provider work. Rendering availability reads configuration only; it neither constructs a DB client nor calls any provider or media API. No new endpoint or independent quota.

Credential POST accepts exactly `{sourceId}` or `{sourceId,mode:"voice"|"text"}`. Omitted mode preserves voice behavior and `{clientSecret,expiresAt}`. Text returns exactly `{clientSecret,expiresAt,model}`; `model` is the validated configured non-secret identifier, not a config/environment/session object. Caller-supplied model, instructions and other fields reject. Both modes retain cookie/origin, ownership, expiry, 256-byte request body, no-store and the same process-local admission/concurrency instances. Text source creation remains the existing `{}` POST with signed cookie.

Fixed text session: `type:"realtime"`, unchanged configured model and fixed synthetic source instructions, `max_output_tokens:256`, `output_modalities:["text"]`, `audio.input.turn_detection:null`, 60-second credential TTL. Voice configuration is unchanged. The browser sends no `session.update` and no replacement instructions.

Browser URL is fixed `wss://api.openai.com/v1/realtime?model=<encoded configured model>`; credential is only in `openai-insecure-api-key.<ephemeral>` subprotocol beside `realtime`. No token in URLs, UI, logs or browser storage. The parsed DTO token reference is cleared in `finally` immediately after construction, including constructor failure. The application retains no protocols array; native browser handshake internals cannot be erased by JavaScript. Never capture WebSocket protocols/headers in traces or inspector exports.

## Lifecycle and bounds

Start alone establishes/reuses source and requests one credential. No microphone, peer, audio, stream or prior voice session dependency. Open alone is insufficient: a valid `session.created`/`session.updated` must confirm session ID/type, model, text-only output, disabled turn detection and output bound. No retry/reconnect/remint is automatic.

Send rejects whitespace-only or more than 1,000 characters visibly, without truncation. It sends `conversation.item.create` with a user `input_text` part followed by `response.create` with text output. One outstanding response; an explicit follow-up is allowed after successful completion. Only received assistant text appears. Response/item/output/content identity isolates parts; text finals replace deltas, and subsequent deltas cannot append to a finalized part. `response.done` replaces the response with authoritative final contents. Only successful completed response/item status marks an answer complete. Interrupted/failed/cancelled text remains incomplete and closes the proof for explicit retry.

Limits: 25-second startup, 20-second answer, 60-second active session; 64,000 characters/event, 2,000 events/session, 8,000 characters/answer, 16 streamed parts, 10 retained answers, 20 responses/session. Unknown events are ignored within the event cap. Malformed/oversized/error events fail with fixed safe text, never provider details. Timers and TTL are not provider-enforced spending caps.

Stop invalidates the attempt before aborting waits, detaching callbacks, closing connecting/open socket and clearing timers/model/pending references. Late fetch results/events cannot affect a retry. Dispose/unmount and pagehide use the same cleanup. Navigation uses a normal Next link; unmount closes the old transport, and new Start creates fresh conversation resources. Cross-tab coordination is excluded. Client abort cannot undo already admitted server work; upstream/DB/issued-token limitations from 02a still apply.

## Acceptance-to-test mapping

All are local mocked evidence, not live acceptance. Final unit suite: 126/126; smoke: 8/8; voice: 10/10; text: 10/10. Full logs and actual UTC command timings are under `artifacts/local/02c/`.

| Criterion | Evidence | Observed |
|---|---|---|
| 1 / default off, no media or automatic work | availability test; disabled text smoke; text browser success with mediaDevices absent and denied-media navigation | Disabled page has no source/mint/socket; enabled page sends no POST until Start; text media/peer/audio counters all zero |
| 2 / strict mode and shared server boundary | `text mode is gated, allowlisted, minimal and shares voice admission`; `alternating mode cannot bypass concurrent issuance; text ownership and expiry remain enforced`; existing 02a tests | Invalid fields/modes reject before mint; voice DTO preserved; text model-only extension; alternating attempts hit shared 429; ownership/expiry enforced |
| 2 / exact session | `text provider config has only text output, disabled VAD, fixed source/model/TTL/bound`; existing voice provider assertion | Exact injected HTTP body matches intended contract; no provider calls |
| 3 / handshake/readiness | injected constructor asserts URL/protocols as boolean; open-alone/invalid-config test; constructor-failure cleanup test | Open is not ready, invalid config closes; credential reference cleared on construction failure; no client session updates |
| 4 / outbound and response handling | `text sends exact events once, validates, reconciles finals and accepts explicit follow-up`; identity/multiple parts; failed/incomplete/cancelled tests; retention bounds | Documented sends, duplicate Send rejected, visible input errors, final replacement, wrong/old IDs ignored, only response.done completes |
| 5 / cancellation and failure | source/mint Stop, old callbacks after retry, connecting/answering Stop, dispose, 3 deadline tests, expired credential, HTTP 401/403/404/429/503 on source and mint, malformed/error events | Aborted waits; sockets closed; callbacks detached; no revival/retry; safe recoverable messages |
| 6 / UI and navigation | 5 text browser scenarios at 1440×1000 and 390×844; existing voice checks | Enter sends, Start/Send disabled busy, input focus after ready, Start focus after end/error, no overflow, denial-to-text link, navigation/pagehide cleanup |
| Regression | all existing unit tests, 8 disabled smoke and 10 voice browser checks | PASS; existing voice remains isolated |

Browser isolation: `npm run test:text` uses port 3102, refuses an existing server, supplies synthetic environment plus unusable loopback DB and existing external-fetch-blocking preload. Both proof POSTs are intercepted before the server. All external HTTP is blocked, service workers disabled, all real WebSockets routed to close, and a fake constructor is installed before application code. No real upstream connection or DB write. Credentials in fixtures are synthetic. Trace/video/automatic screenshots are off; six deliberate synthetic UI screenshots only, `desktop-{success,error,ended}.png` and `mobile-{success,error,ended}.png`. All six were visually inspected: readable, no clipping; mobile is viewport emulation, not physical-device evidence. Playwright owns teardown; no listeners remained on 3100/3101/3102.

Initial exploratory typecheck found a widened string literal (fixed); exploratory unit run found the config fixture needed its new false flag (fixed). First text browser run was 8/10: generic alert locator also matched Next's route announcer; narrowed to the existing validation element, final 10/10. No application behavior changed for that locator fix. Historical failing logs remain separate from final logs. Harmless Playwright color-environment warnings are retained.

## Official contracts and local guides

Rechecked 18 October 2026 using OpenAI Docs:

- [WebSockets](https://developers.openai.com/api/docs/guides/voice-websockets?voice-api=realtime): fixed Realtime host/path and browser ephemeral subprotocol authentication. Preserved configured model, despite newer examples.
- [Client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create): text output and null turn detection session fields, output bound and TTL. No model/account availability claim.
- [Conversations](https://developers.openai.com/api/docs/guides/realtime-conversations): user input_text item, text response.create and streamed output_text events.
- [Server events](https://developers.openai.com/api/reference/resources/realtime/server-events.md): response/item/content identity, output_text.done and response.done statuses. HTML reference exceeded fetch size; official Markdown fetched and inspected, retained as ignored `official-server-events.md`. A text-done event may occur for a non-completed response; controller waits for successful response.done.

Read installed Next 16.4.2 server/client component guide; retained existing force-dynamic/server-only page boundary. Applied selected React lifecycle/serialization rules, Playwright mocking/tests and existing-context Impeccable only. No dependency upgrade, broad design audit or delegation.

## PM-only NOT_RUN

1. Complete 02a real PostgreSQL two-visitor/reuse/concurrency/ownership/expiry checks with injected provider stub and fixture-only cleanup; distinguish local DB and deployed HTTP. No funding needed for this gate.
2. After funding/key and a bounded explicit test allocation, privately configure/deploy to the existing Free service. Fresh physical-phone session: deny microphone, visit `/proof/text`, Start, ask lighthouse window count (expect actual streamed seven); follow up about keeper (expect Rowan in same session). No recording indicator or prior voice session.
3. Stop during answer, explicitly retry and navigate between proofs; verify old connection closure, no late text revival and no overlapping voice capture. Record device/browser/build/model/time. Live 02b audio/Stop remains separate. Disable `TEXT_PROOF_ENABLED`, `PROOF_ENABLED` and `REALTIME_ISSUANCE_ENABLED` afterward.

No key was requested or private `.env` value read/edited. Pinned runtime and synthetic loopback overrides were used for commands. This mock proof cannot establish live authorization, provider acceptance, actual phone behavior, hard spending limits, Steps 08–10 completion, or Step 02 DONE. PM owns review and acceptance.
