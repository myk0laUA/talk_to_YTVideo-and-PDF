# 07G — explicit voice admission policy

Proposed **READY_FOR_REVIEW** for Task07G only, implemented offline under original Steps02/07/08. PM owns acceptance and sequencing. Clean arrival `main`, HEAD `ac18eb7d5d45377e2384afd8fd2cadc2db216aa8`; delivery remains dirty/uncommitted at that HEAD. Build **`qOEyn0vhz9wjTkjYJVKCE`**, Node **24.22.0**, npm **11.19.1**. No commit/push/deployment or live service operation.

## Policy and code

`PROVIDER_VOICE_POLICY` binds exact `gpt-realtime-2.1-mini`, mode `voice`, revision `provider-voice-full-source-2026-10-20-v1`, output cap512 and voice `marin`. It has no tokenizer/counts/framing/input capacity. `capacity: checked_at_each_response` describes provider enforcement; it does not pre-admit a source or guarantee spending. `productionReady` stays false. Existing measured validation rejects the provider basis; synthetic admission remains test-only.

Eight runtime files changed: shared `priming-provider-policy`, `priming-admission`, `priming-manifest`, `priming-controller`, `voice-lifecycle`, `text-lifecycle`, and server context `model-policy`, `model-measurement` (all `.ts`). New `tests/unit/provider-voice-admission.test.ts` adds94checks. The common lossless encoder keeps the existing boolean text opt-in and adds explicit `"voice"`; default measured/synthetic encoding is unchanged. Structural admission re-encodes the entire variant/manifest and requires matching mode/policy. Text explicitly retains its exact text-policy guard. Voice permits only its matching provider policy through actual default priming before connecting; it acquires no media until readiness. New voice-only terminal handling disposes on provider/context failures during setup, pending microphone and generation; failed-response errors require the active response identity. No automatic retry.

`createProviderVoicePreparation` is a separate server-only opt-in alongside the unchanged text entry point, sharing the existing guarded preparation implementation. It rejects unsupported policy before reads, takes three owned source reads, preserves all A/B source content/locators/identity/expiry, then rechecks ownership, source expiry and complete B equality. Original-object provenance/hash and expected run/source/model/mode/revision checks remain separate from structural admission. Future credential issuance must freshly reauthorize/revalidate; this helper is not visitor authority. No route/factory consumes the voice helper.

| Barrier | Requested/effective settings and gating |
| --- | --- |
| Initial settings ACK | Same exact model/session; instructions, disabled truncation, empty tools/tool choice none,512cap, text output, VAD null, transcription null, audio output voice marin. No explicit reasoning request. |
| Complete source ACKs | Every full matching `conversation.item.done`, correct content/identity/predecessor; settled ordered sends. Added-only/partial/malformed/early-final events cannot establish readiness. Full reverse ACK order remains safe. |
| Final settings ACK | Distinct final instructions, audio output, server_vad with create_response/interrupt_response true and idle_timeout_ms null; same cap/tools/truncation/transcription/voice/model/session. All final writes must settle. |
| Audio activation | Final VAD settings are sent only after every source ACK. No microphone is acquired/attached/enabled until effective final ACK and settled sends. No audio-buffer writes or response.create are issued by priming. Thus no input exists to trigger automatic generation during this barrier. Unexpected early response.created fails closed. |
| Generation/context | Source protocol ACKs are not proof of generatable capacity. Standalone provider errors or active failed response.done may reject later; the new provider voice path releases tracks/connection/listeners/timers once, clears active status and retains the external source preview. |

Voice intentionally omits explicit reasoning: its effective default is not claimed or constrained. Input transcription is explicitly off; selecting/verifying a real transcription model and both-speaker transcript behavior remains a later integration gate. WebRTC codec/SDP negotiation is outside this policy and has not been implemented or validated.

## Official OpenAI documentation

OpenAI Docs skill applied; searched/opened and retained official sources **20 October2026UTC**. The [exact mini model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) documents audio/text input/output and WebRTC support. [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events) document the generic1–4096 maximum-output setting (512within range), disabled truncation errors, null transcription/VAD, server VAD flags and audio.output.voice including marin. [Server events](https://developers.openai.com/api/reference/resources/realtime/server-events) document effective session.updated/item.done and failed response status_details. The [WebRTC guide, Realtime section](https://developers.openai.com/api/docs/guides/realtime-webrtc) describes media tracks/data-channel transport; its separate GPT-Live section is not the policy API. Markdown snapshots and SHA256 are retained under07g. Schema compatibility is supported; actual mini/account/voice acceptance is NOT_RUN. No explicit reasoning setting or inferred token fit was introduced.

## Verification

All commands below ran in ignored `artifacts/local/07g/offline-checkout`, copied from tracked/task inputs without `.env`; reused installed dependencies via junction, empty real provider keys, unusable loopback PostgreSQL URL, public gates false, outbound-provider denial. No fresh install/real SQL/live provider/device claim. Browser suites use their existing synthetic configuration/provider/media or local socket fixtures and guards. All required commands passed without reruns. Typecheck preceded removal of one unused type-only test import; final full suite/build use the delivered runtime/test files.

| Command | UTC start–end, 20 October 2026 | Observed | Exit / status |
| --- | --- | --- | --- |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 22:09:45.968–22:09:47.045 | 94/94 | 0 / PASS |
| `npm run typecheck` | 22:09:47.047–22:09:53.817 | Prisma/Next/TypeScript clean | 0 / PASS |
| `npm run test:budget` | 22:10:16.942–22:10:17.635 | 42/42 | 0 / PASS |
| `npm run test:context` | 22:10:17.638–22:10:18.202 | 79/79 | 0 / PASS |
| `npm run test:priming` | 22:10:18.203–22:10:19.444 | 75/75 | 0 / PASS |
| `npm run test:lifecycle` | 22:10:19.445–22:10:20.423 | 63/63 | 0 / PASS |
| `npm run test:interruption` | 22:10:20.424–22:10:21.358 | 62/62 | 0 / PASS |
| `npm run test:text-lifecycle` | 22:10:21.359–22:10:22.448 | 90/90 | 0 / PASS |
| `npm run lint` | 22:10:22.449–22:10:56.952 | clean | 0 / PASS |
| `npm run test` | 22:10:56.955–22:11:01.567 | 1293/1293 | 0 / PASS |
| `npm run build` | 22:11:01.571–22:11:13.034 | qOEyn0vhz9wjTkjYJVKCE | 0 / PASS |
| `npm run test:smoke` | 22:11:13.036–22:11:18.788 | 18/18 | 0 / PASS |
| `npm run test:voice-session` | 22:11:18.790–22:12:45.502 | 208/208 | 0 / PASS |
| `npm run test:owned-text` | 22:12:45.504–22:13:01.256 | 414 assertions / 7 browser contexts | 0 / PASS |
| `node artifacts/local/07g/default-voice.mjs` | 22:13:11.534–22:13:13.344 | launch failed: wrong Playwright import | 1 / FAIL (tooling, corrected) |
| `node artifacts/local/07g/default-voice.mjs` | 22:13:27.549–22:13:29.545 | 7 assertions; ordinary voice unavailable | 0 / PASS |

Exact invocations, millisecond UTC, exits and individual logs: `artifacts/local/07g/commands.jsonl`. Local driver: `artifacts/local/07g/verify.mjs`; invoke with pinned `.tools/node-v24.22.0-win-x64/node.exe`, arguments `focused`, required npm script names or `default-voice`. An extra default-voice check initially imported the independently resolved playwright-core, whose requested browser revision was absent. Corrected only that ignored driver to use installed `@playwright/test`; no download/product change. Original exit1/log/JSON/server log retained; corrected exit0. Build retained a workspace-root/multiple-lockfile warning, with no build failure or configuration change.

| Task acceptance | Evidence / result |
| --- | --- |
|1. Exact distinct policy; cross-mode/model/revision/settings denied |94focused checks; exact resolvers/preparation wrappers; structural recomputation; default text/voice lifecycle rejection before acquisition. Unsupported policies take0reads. Provider basis never passes measured validation. PASS, scripted. |
|2. Full PDF/YouTube projection and authority |PDF+YouTube A/B exactly reconstructed with original section boundaries/empty text/Unicode/hostile strings/locators/fractional timing;3reads each. Altered inputs denied; foreign/expired/removed/replaced/final-read mutations and each noncooperating read cancellation yield no usable input. Large Unicode splitting lossless; oversize bounds reject. PASS, synthetic storage. |
|3. ACK/audio/error/disposal |28effective setting/session negatives, missing/partial/added-only/mismatched/late/early/final-unsettled ACKs; Stop at initial/items/final/media/ready; context/provider errors at each stage plus active failed-response generation.0media before full barrier, single close/unsubscribe/track stop,0timers/abort listeners after cleanup; no retry/revival. PASS, scripted/fake media. |
|4. Existing behavior/default unavailable |1293units,42budget/79context/75priming/63voice/62interruption/90text;18smoke,208voice browser and414owned-text assertions pass. Extra actual built390px check selects Voice mode: Start/Stop/Mute/Interrupt/playback disabled,0native media requests and0external browser requests. PASS, local. |

Sanitized source hashes/byte/item counts/state/disposal matrix: `artifacts/local/07g/voice-matrix.json`. Voice fixture bundle exclusion/0provider calls: `offline-checkout/artifacts/local/08c/identity-audit.json`; screenshots there under `screenshots/`. Owned-text resource/network/bundle audit: `offline-checkout/artifacts/local/10d/integrated-results.json`. Actual default voice check: `default-voice.json`, `default-voice.png`. Worker visually inspected desktop-ready, phone-viewport-retained and actual default390px screenshots. Fake media/browser viewport evidence is not physical phone or audible playback evidence.

Final changed-file SHA256, code-to-built-copy identity, unchanged protected paths, .env exclusion, private-env mtime preservation, document-source hashes and port/process cleanup are in `artifacts/local/07g/{changed-files.sha256.json,audit.json,cleanup.json}`. The retained isolated copy/build is evidence, not an active server. No .env/key/config/public gate, dependency/lock/schema/migration, synthetic credential route, caption adapter or UI file changed.

## Remaining gates / handoff

Production voice transport/credential integration, fresh ownership/expiry at actual issuance/turns, real mini/WebRTC negotiation, source grounding, provider context rejection in practice, transcription, microphone permission, physical speaker/interruption, phone and hosted deployment remain **NOT_RUN**. Measured tokenizer/framing readiness remains unresolved. Public voice remains unavailable. No human action is needed for this offline task; PM reviews the12-file hash manifest and evidence, decides acceptance, and issues any next bounded task. Original Steps02/07/08 remain open.
