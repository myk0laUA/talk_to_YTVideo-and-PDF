# Task 08K — response completion handoff

**Proposed READY_FOR_REVIEW; implemented, pending PM acceptance.** A real local authored-document summary hit the existing voice cap. Corrected live completion and summary plus follow-up are **NOT_RUN**. No deployment or public configuration change.

## Identity and result

Arrival: clean main, HEAD 98b58e02075d74125bfac63aaaca580278a5d15f. Delivery is dirty/uncommitted on that HEAD. Diagnostic live build: **43pF8mVHCrFXPpflPPxSx** (512-token v3 policy plus safe completion projection). Final corrected offline build: **1UDV80qweD2B0AC55i4kP**. Node **24.22.0**, npm **11.19.1**, existing dependency junction/lockfile unchanged.

Local live run, 2026-10-21 06:32:07.961–06:32:32.887 UTC: ordinary owned PDF upload, existing three-page authored lantern-garden fixture, native Chromium WebRTC and Windows System.Speech synthetic microphone file. Question: “Give a concise summary of this document covering its purpose, trial procedure, findings, and delivery instructions.” Provider terminal status **incomplete**, reason **max_output_tokens**, input **789** (714 text/75 audio), output **512** (204 text/308 audio), total **1301**. The visible summary ended mid-thought. No provider error observed; two effective settings ACKs and all three source ACKs preceded microphone attachment. Source ACKs at 6695–6759ms, final settings ACK at 6921ms, first observed sender at 7112ms, terminal at 22227.6ms relative to the browser clock.

This confirms a cap failure for this local request; it does not establish the reason of each earlier hosted answer. We stopped at the first incomplete result. No follow-up was started and no completed spoken answer is claimed. No physical microphone/speaker or phone proof. Generation completion and buffer playback remain separate.

## Correction and rationale

Voice policy is now provider-voice-full-source-2026-10-21-v4, finite **2048** tokens, with voice-only guidance for normally two to four short sentences/about 80 words. The observed 512 cap includes both audio and text; giving four times that headroom avoids imposing the text-mode ceiling on spoken responses. 2048 stays below the documented finite maximum of 4096. It is headroom, not a promised duration or proof of completed output. Guidance encourages a finished concise main point and user-led follow-up, with no continuation/retry loop.

One shared exact policy feeds server issuance and initial/final source-priming settings. The server provider validator already reads that constant; no separate hardcoded server cap was introduced. Both priming instructions include the reviewed concise guidance and are exactly ACK-validated. Stale v3, wrong caps, unlimited caps and changed instructions reject. Text retains v1/512/minimal reasoning and its original instructions. All source context remains present; truncation stays disabled. The larger output reservation can reduce available context headroom and increase per-response cost; existing provider context-limit failure remains explicit rather than dropping source content.

The new shared response-terminal module copies only closed status-compatible reasons and seven explicitly named nonnegative safe-integer usage fields. Arbitrary reason/error strings, nested raw usage, provider bodies and credentials are discarded. Unknown stays unknown. Transcript turns retain this small projection through Stop; the current voice response resets it on a new response. No persistent telemetry or raw event retention was added. Incomplete text remains visible and labelled, with specific output-limit guidance and collapsed completion details. Completed/cancelled/incomplete states still follow the original controller. Cancellation reasons are separate from cap/content-filter outcomes. Existing context-limit and transport failures keep their separate lifecycle handling; an unknown incomplete reason is never guessed to be a capacity/network failure.

## Official documentation checked

Fetched official Markdown on 21 October UTC into ignored official-*.md evidence files. The web renderer could not open the oversized server-events HTML; direct HTTPS Markdown retrieval returned 200. OpenAI Docs skill used; local React/Playwright guidance applied only to shared-state/UI feedback and existing verification.

- [Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events): response.done status_details reason distinguishes max_output_tokens/content_filter from turn_detected/client_cancelled; usage counts output text and audio. Audio-done events can also occur for interrupted/incomplete responses, so they cannot substitute for completed response status.
- [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events): finite output range 1–4096; session settings control the per-response ceiling.
- [Realtime cost accounting](https://developers.openai.com/api/docs/guides/voice-latency-cost): input speech approximately 10 audio tokens/second, assistant audio approximately 20/second, plus text/special tokens and accumulated history. These are estimates, not a timer guarantee.
- [Pricing](https://developers.openai.com/api/docs/pricing): gpt-realtime-2.1-mini per million tokens: text input $0.60/output $2.40, audio input $10/output $20; gpt-4o-mini-transcribe input $1.25/output $5 and $0.003/minute estimate. No cache discounts used in preflight/observed estimate.

## Verification

All ordinary checks used **artifacts/local/08k/offline-checkout**, .env-free, empty real provider keys, unusable loopback database and the established network-denying preload. Browser suites add their own synthetic network/provider/media controls. Build preceded built tests. Commands were launched with the pinned node.exe and npm-cli.js via `node artifacts/local/08k/verify.mjs <script...>`; the exact commands, UTC times, cwd, exits and logs are in `artifacts/local/08k/commands.jsonl`. Log names below are relative to that directory. Live verification is separately labelled above and in its ledger.

| Command | UTC start–end | Observed | Exit | Evidence |
|---|---|---|---|---|
| `npm run test:interruption` | 2026-10-21T06:33:55.757Z–2026-10-21T06:33:56.495Z | 64/64 | 0 | `test-interruption-2026-10-21T06-33-55-757Z.log` |
| `npm run test:transcript` | 2026-10-21T06:33:56.496Z–2026-10-21T06:33:57.128Z | 65/65 | 0 | `test-transcript-2026-10-21T06-33-56-496Z.log` |
| `npm run test:priming` | 2026-10-21T06:33:54.914Z–2026-10-21T06:33:55.756Z | 75/75 | 0 | `test-priming-2026-10-21T06-33-54-914Z.log` |
| `npm run lint` | 2026-10-21T06:33:57.129Z–2026-10-21T06:34:01.697Z | PASS | 0 | `lint-2026-10-21T06-33-57-129Z.log` |
| `npm run typecheck` | 2026-10-21T06:34:01.698Z–2026-10-21T06:34:05.190Z | PASS | 0 | `typecheck-2026-10-21T06-34-01-698Z.log` |
| `npm run test` | 2026-10-21T06:34:05.192Z–2026-10-21T06:34:11.677Z | 1,572/1,572 | 0 | `test-2026-10-21T06-34-05-192Z.log` |
| `npm run build` | 2026-10-21T06:34:11.679Z–2026-10-21T06:34:16.923Z | PASS | 0 | `build-2026-10-21T06-34-11-679Z.log` |
| `npm run test:voice-adapter` | 2026-10-21T06:34:16.924Z–2026-10-21T06:34:42.196Z | 107 units + 526 built checks / 45 scenarios | 0 | `test-voice-adapter-2026-10-21T06-34-16-924Z.log` |
| `npm run test:owned-voice` | 2026-10-21T06:34:42.197Z–2026-10-21T06:35:00.039Z | 122 units + 392 built checks | 0 | `test-owned-voice-2026-10-21T06-34-42-197Z.log` |
| `npm run test:owned-text` | 2026-10-21T06:35:00.040Z–2026-10-21T06:35:13.758Z | 417 built checks | 0 | `test-owned-text-2026-10-21T06-35-00-040Z.log` |
| `npm run test:transcript-view` | 2026-10-21T06:35:13.759Z–2026-10-21T06:35:23.670Z | 36 browser cases / four viewports | 0 | `test-transcript-view-2026-10-21T06-35-13-759Z.log` |
| `node --conditions=react-server --test tests/unit/provider-voice-admission.test.ts` | 2026-10-21T06:33:54.079Z–2026-10-21T06:33:54.912Z | 128/128 | 0 | `focused-2026-10-21T06-33-54-079Z.log` |
| `node artifacts/local/08k/live.mjs` | 2026-10-21T06:32:07.961Z–2026-10-21T06:32:32.887Z | REPRODUCED_OUTPUT_LIMIT; one session / one response | 0 | `live-results.json` |

Expected results were satisfied: exact finite policy and fail-closed ACKs; source-before-microphone barrier; unchanged ownership/expiry and 08J clock-skew paths; retained partial text and distinct cancellation/limit feedback; completed generation with independent buffer stop; explicit follow-up, mute, Stop and release; owned PDF/text boundaries. The 36 transcript browser cases include safe reason/usage, retained partial text after Stop, no private sentinel, and fitting four viewports. Live 390px and scripted 390px screenshots visually reviewed; no phone claim.

**Red-before/green-after:** new interruption regression failed on missing terminal projection (63 pass/1 fail), then passed64. Policy regression failed512 !==2048 (118 pass/1 fail), then all128 voice-policy cases passed. New exact cap tests reject512,2047,2049,inf at issuance and both ACK stages. The baseline voice-policy suite had118 cases; current128 includes10 new policy cases. Full unit count1572 also includes4 new issuance cases.

**Retained development failures:** transcript dependency audit initially prohibited all runtime imports; updated it to allow exactly the new pure module while recursively scanning for forbidden APIs. Text dependency audit initially rejected its old voice-prefixed filename and then expected6 instead of7 modules; renamed to response-terminal and updated the audited count. One intermediate typecheck caught incomplete symbol renaming and was fixed. First built adapter run timed out waiting for filechooser after four scenarios; unchanged rerun passed526 checks and final corrected-build run also passed526. No app workaround or live retry. Every failure and rerun remains in commands.jsonl/logs.

## Resource and spending ledger

New08K allocation only: max1session,2response starts,120seconds,$0.50 estimated including ASR. Conservative preflight for even the proposed2048 cap: `2*(10000*.6 + 5000*10 + 2048*20)/1e6 + .006 ASR + .05 ASR uncertainty + .10 margin = $0.34992`. Actual diagnosis used512. Authored source/instruction envelope was checked below10000 bytes before microphone;120s speech plus prior bounded output fits the conservative5000 audio input allowance. No paid TTS; local System.Speech authored input only.

**Consumed:1session/1response; no retry permitted.** Credential request through completed cleanup21,789ms. Observed response estimate **$0.007828**; ASR75input/22output estimate **$0.00020375**; total **$0.00803175** with actual bill unknown. No prior allocation reset. `allowance.json`, `preflight.json`, `cost.json`, `attempt.lock`, `live-results.json` retain this ledger. The unused second response does not authorize a second session.

Active Stop closed the peer, ended both observed tracks and paused/detached the audio element; browser/context closed and owned local server stopped. Channel cleanup is separately covered by the offline suites. Authored source removed through ordinary UI; subsequent owned read404. No bulk/shared DB cleanup, migration/reset, .env edit, private user document, recording, paid TTS, hosted call/configuration change, commit/push/deploy or later task. Public voice remains enabled by standing user instruction.

## Acceptance mapping and PM handoff

1. **PASS local reproduction:** exact incomplete/max_output_tokens and numeric usage above; original hosted reasons remain unobserved.
2. **PASS offline:** safe projection/status matrix, late final text cannot upgrade incomplete status, buffer lifetime independent, follow-up/Stop/mute and cleanup pass. Real complete summary/follow-up on corrected cap **NOT_RUN**.
3. **PASS offline:** versioned2048 policy at issuance/preparation/initial/final ACK; stale/wrong/inf rejected, text512 unchanged; ownership, PDF and08J checks pass.
4. **PASS:** pinned/env-free final command suite above. No final live success inferred from mocks.

PM reviews the delivery SHA256 manifest in `artifacts/local/08k/changed-files.sha256.json`, then owns deployment. After PM deployment, user reloads to discard stale v3 preparation, imports a small PDF, starts voice once with speaker playback enabled, requests a short summary, waits for completion, asks one short follow-up, then Stops. Expected: two complete answers and normal audio completion. If either is incomplete, expand that turn’s Answer completion details and report only the reason and numeric output/audio/text counts; retain incomplete text, do not automatically retry. Hosted sustained completion, physical audio and phone checks remain open. Stop here; Task08K only.
