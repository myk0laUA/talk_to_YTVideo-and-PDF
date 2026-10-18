# Task 03a — local direct captions handoff

18 October 2026. **Implemented; proposed READY_FOR_REVIEW.** Two uncached real public-caption requests passed through the local production Next application. This is the assigned extraction experiment, not Step 03 completion. PM retains acceptance, deployment, provisioning, secrets and spending. Hosted direct, managed retrieval and Step 07 grounding are **NOT_RUN**.

## Identity and source review

- Branch `main`, starting/current HEAD `3230d5615914a8cdf978ffaab6f37dd74e03e0c4`; dirty implementation, no commit/push/deployment. Final changed-file SHA256 manifest: ignored `artifacts/local/03a/changed-files.sha256.json`.
- Node **24.22.0**, npm **11.19.1**, selected using the existing ignored `.tools/node-v24.22.0-win-x64` runtime. Default shell Node 26/npm 12 was detected before installation and was not used for implementation checks.
- Exact dependency **youtube-transcript-plus@2.0.3**, Node >=20, MIT; one added package, no unrelated upgrades. Installed using `npm install --save-exact youtube-transcript-plus@2.0.3`, exit 0. Source `96d8a3787096e9f52feca53f0aaf018c5cb07f15`; tarball SHA1 `6a1795d445f3aec1fa254672502a14ba66c50742`; full integrity/source metadata in ignored `package-identity.json` and the lockfile.
- Official [repository/API](https://github.com/ericmmartin/youtube-transcript-plus), pinned [adapter source](https://github.com/ericmmartin/youtube-transcript-plus/blob/96d8a3787096e9f52feca53f0aaf018c5cb07f15/src/index.ts), [fetch/retry implementation](https://github.com/ericmmartin/youtube-transcript-plus/blob/96d8a3787096e9f52feca53f0aaf018c5cb07f15/src/utils.ts). Inspected installed dist/types as well as official source before relying on units/hooks/cache/retries.
- Consulted the installed Next **16.4.2** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`. Applied only selected React server-boundary guidance and Playwright CLI for source-caption inspection; no design/OpenAI skills.
- Local production build **`_jEQU2beF2TYKW4Vp3vyF`**. Exact command UTC times/exits: `artifacts/local/03a/checks.json` and `live-command.json`.

## Route and public contracts

`POST /api/proof-captions`, Node runtime, default disabled. `src/server/captions/{config,input,bounded-body,errors,provider,handler,runtime}.ts`; route in `src/app/api/proof-captions/route.ts`; browser-safe DTOs in `src/shared/captions.ts`.

Configuration: `CAPTION_PROOF_ENABLED=true`, exact validated `APP_ORIGIN`, and a server-only 64-hex `VISITOR_COOKIE_SECRET`. `CAPTION_PROOF_LOCAL_HTTP=true` explicitly permits localhost/127.0.0.1 HTTP for a local production build; every other origin still requires HTTPS. Existing voice/text production origin rules remain unchanged. No database or OpenAI key is needed. `PROOF_ENABLED` does not enable this route. No managed provider, provider-selection field or application cache exists in this proof.

Input is exactly `{ video: string, language?: string }`. Accepted: strict 11-character `[A-Za-z0-9_-]` IDs; HTTPS `youtube.com`, `www.youtube.com`, `m.youtube.com` `/watch?v=ID`, `/shorts/ID`, `/embed/ID`, `/live/ID`; HTTPS `youtu.be/ID`. Playback query/fragment context is discarded. Reject arbitrary/suffix hosts, credentials (including empty userinfo), explicit ports, unsupported schemes, whitespace/backslashes, unsupported paths, duplicate watch `v` and malformed IDs. Language is a bounded 35-character BCP47-like code, matching the package's documented language syntax. Only the validated ID reaches the extractor; every outbound URL is additionally constrained to HTTPS YouTube watch/player/timedtext paths, credentials omitted, redirects rejected.

Success: `{ ok: true, transcript: { videoId, canonicalUrl, language, provider, segments, fullText, trackType? } }`. Segment fields: `{ text, startSeconds, durationSeconds }`. All timing is **seconds**; 2.0.3 XML `offset`/`duration` already use seconds and receive no millisecond conversion. Preserve segment source order and text exactly as returned, including whitespace. `fullText = segments.map(s => s.text).join("\n")`; no deduplication, sorting or silent truncation. Provider identity is `youtube-transcript-plus@2.0.3`. Only explicit `kind=asr` produces `trackType: "automatic"`; otherwise omit it. No title lookup or metadata dependency, and no source ID, credential, cookie bearer, owner marker or database model in JSON.

Failures: `{ ok: false, error: { code, message, stage?, upstreamStatus? } }`. Stable bounded messages are authored locally; raw upstream bodies/errors/URLs are not returned. Stages are `watch`, `player`, `transcript`; HTTP status is exposed only as a numeric upstream status. Categories include `unavailable`, `no_captions`, `rate_limited`, `blocked`, `timeout`, `cancelled`, `too_large`, `malformed`, `upstream_failure`, `internal` and request-policy failures. The missing watch bootstrap key is reported specifically; a changed page is not asserted to be an IP block. Explicit sign-in-required player state stops extraction. A package no-caption error means retrieval failed, not definitive proof the owner disabled captions.

All handled responses use `Cache-Control: no-store` and `nosniff`. Same-origin POST checks include exact Origin and absent/same-origin Fetch Metadata. Other methods receive Next's 405. Bodies: application/json, allowlisted fields, **512 bytes**, **2 seconds**, enforced while streaming. Separate admission includes body reading: one concurrent request; four per signed visitor/hour, eight total/hour, sixteen process-lifetime attempts. All IPs deliberately share one conservative untrusted-network bucket; forwarded headers are ignored. Process state is shared across route bundles, not requests. Cookie issuance/reuse uses the existing signed anonymous visitor primitives without a lighthouse-source write. It controls proof admission only and grants no future Source ownership.

## Upstream budgets and known limits

- One extraction attempt, **zero automatic retries**, total upstream deadline **9000 ms** across watch/player/transcript; no managed fallback. This is up to three sequential upstream requests, not three retries.
- 2.0.3 has optional memory/filesystem cache classes but no automatic cache when `cache` is absent. No cache object is supplied; every hook uses `cache: "no-store"`. Repeated mock extraction performs all three requests again.
- All three package hooks receive the combined caller/deadline AbortSignal, pass it to Node fetch, and actively cancel response readers on abort/overflow. There is no Promise.race-only timeout. Non-success/redirect bodies are cancelled without consumption. Timer and stream listeners are cleaned up.
- Decompressed response caps: watch **4 MiB**, player **2 MiB**, caption XML **2 MiB**. Maximum **20,000 segments** and **1,000,000 UTF-16 full-text code units**, including inserted newlines. Empty text, invalid/mixed language, nonfinite/negative timing, overflow, unsupported/partial XML and oversized results fail clearly. The package regex can silently skip unsupported nodes, so the hook rejects XML it cannot parse completely rather than returning a partial transcript. Only the release's simple `<transcript><text start="..." dur="...">...</text></transcript>` format is accepted; other otherwise-valid caption formats may fail this proof.
- The package parser and normalization are synchronous; JavaScript cannot interrupt them mid-execution. Input byte/segment/text caps bound that work, with abort checked around network/parsing. A hostile replacement fetch that ignores AbortSignal is outside this implementation's cancellation guarantee. Node fetch used in the actual route supports cancellation. Admission is per Node process and resets on restart; this is not a distributed production limiter.
- Package entity decoding is preserved as returned; it is not a claim of supporting every XML entity/format. Unexpected provider/network errors remain sanitized `upstream_failure` without guessing a cause. These are explicit proof limits, not production ingestion acceptance.

## Verification

All routine checks use the pinned runtime and synthetic loopback `DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1`; no real database was accessed. Gates are explicitly disabled for default smoke. Voice/text suites use their existing synthetic configuration and external-fetch blockers, with captions explicitly disabled.

| Command | UTC on 18 Oct 2026 | Result / exit | Evidence under `artifacts/local/03a/` |
|---|---|---|---|
| `npm run lint` | 06:20:20–06:20:23 | PASS / 0 | `lint.log` |
| `npm run typecheck` | 06:20:23–06:20:26 | PASS / 0 | `typecheck.log` |
| `npm test` | 06:20:26–06:20:29 | PASS **155/155** / 0 | `test.log`; 126 existing + 29 new caption checks |
| `npm run db:validate` | 06:20:29–06:20:30 | PASS / 0, offline schema validation | `db-validate.log` |
| `npm run build` | 06:20:30–06:20:35 | PASS / 0 | `build.log`, build ID above |
| `npm run test:smoke` | 06:20:35–06:20:39 | PASS **10/10** / 0 | `test-smoke.log`; includes disabled caption route on both viewports |
| `npm run test:voice` | See `checks.json` | PASS **10/10** / 0 | `test-voice.log`; mocked media/RTC/provider |
| `npm run test:text` | See `checks.json` | PASS **10/10** / 0 | `test-text.log`; mocked WebSocket/provider, no media |
| `npm run proof:captions:local -- --allow-public-youtube` | 06:21:01–06:21:04 | PASS retrieval / 0 | `live-command.log`, `live-results.json`, `live-server.log` |
| Independent original-caption comparison | 06:24:20 and 06:24:40 | PASS both fixtures | `original-caption-checks.json`, `excerpt-review.json` |
| Shutdown and listener check | After trial | PASS, child SIGTERM; port 3103 closed | `live-results.json`, `teardown.log`; named browser closed |

Acceptance mapping: URL/config/route cases prove policy rejection before provider calls; actual installed package with mocked watch/player/XML proves fractional-second mapping and exact first/middle/last/full-text preservation; normalization/XML cases reject empty/malformed/oversized data and unknown metadata; fetch and stalled-stream tests prove abort/deadline propagation and no retry; concurrency/quota cases prove bounded admission and release after failure. Success JSON contains only the declared caption DTO. Exception tests reject raw error disclosure. The initial focused run exposed empty `@` userinfo being erased by URL parsing; raw authority validation was corrected before all final checks passed. No enabled synthetic browser page was necessary: route units exercise enabled behavior and real HTTP production trials exercise the route bundle.

## Local live results

These requests used the actual built Next route at `http://127.0.0.1:3103/api/proof-captions`, with voice/text/issuance off, blank OpenAI/managed credentials, a synthetic database URL, no cache and a fresh process-only visitor signing key. Nothing was persisted as a Source. No deployment/service change, paid request, audio download/transcription, proxy, cookie export or real DB command occurred.

| Canonical video | Request UTC | Language / type | Segments / full-text characters | Earliest / latest end, seconds | HTTP / latency | Result |
|---|---|---|---|---|---|---|
| [Amy Cuddy / TED](https://www.youtube.com/watch?v=Ks-_Mh1QhMc), `Ks-_Mh1QhMc` | 06:21:02.372–06:21:03.318 | en / unknown | 428 / 20,788 | 0 / 1249.939 | 200 / 946 ms | PASS, independently checked |
| [Rick Astley](https://www.youtube.com/watch?v=dQw4w9WgXcQ), `dQw4w9WgXcQ` | 06:21:03.318–06:21:04.958 | en / unknown | 61 / 2,165 | 1.36 / 211.32 | 200 / 1640 ms | PASS, independently checked |

Minimal beginning/middle/end excerpts and their source indices/times are retained in `live-results.json`. Full transcripts were not dumped. The initial automated result deliberately says `RETRIEVED_REQUIRES_EXCERPT_REVIEW`; subsequent `excerpt-review.json` records both PASS decisions after comparison. Both selected upstream tracks omit `kind`, so neither is asserted to be automatic or manual in the application DTO. A manual/automatic pair was not established.

For independent verification, a fresh unauthenticated Playwright browser inspected the original video pages and made bounded public watch/player/caption requests with `credentials: "omit"` and `cache: "no-store"`. The original XML was parsed by browser **DOMParser**, separately from the package's regex. Counts, character totals, ranges and all three excerpts exactly match the application results. XML parsing used an empty inspector tab because YouTube's document enforced TrustedHTML; no page security setting was changed. Only the small comparison result was saved. These additional requests verify source excerpts; they do not replace the two application HTTP trials.

The [TED publisher's transcript](https://www.ted.com/talks/amy_cuddy_your_body_language_may_shape_who_you_are/transcript?language=en) separately confirms the named English credits, middle passage and final applause; its editing/timing differs slightly from the YouTube upload. Minimal lines retained in `ted-publisher-excerpts.txt`. The YouTube player distinguished English from English auto-generated for the music fixture (`rick-track-options.txt`), but DOM caption overlay checks returned no text, so visible player-caption matching is **not claimed**. Public original-caption XML comparison is the recorded excerpt verification. This is not a physical audio test.

## Explicit opt-in reproduction and PM handoff

Build first with the pinned runtime, then run:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v24.22.0-win-x64') + ';' + $env:PATH
$env:DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1'
npm run build
npm run proof:captions:local -- --allow-public-youtube
```

Port **3103** must be free. The explicit flag authorizes real unauthenticated public YouTube requests for the two fixed fixture IDs; without it, the script exits 2 before startup. It directly starts the production Next CLI bound to loopback with temporary child environment: caption gate/local HTTP true, other gates false, fresh random cookie secret, blank provider credentials, synthetic DB. It calls the route twice with Origin and selected `en`, reuses the issued signed cookie in memory, saves minimal summaries, then terminates the owned server in finally. It never writes `.env`. A blocked attempt returns exit 1 with sanitized cause; a successful array still requires excerpt review before capability PASS. The harness refuses an existing HTTP listener. It is opt-in, separate from routine tests and intended for this bounded trial only.

Changed existing files: package/lock, README proof note, `.env.example`, shared visitor configuration/type signatures, disabled smoke and isolated browser configs. New files: caption route/server/shared modules, `tests/unit/captions.test.ts`, the explicit live harness and this handoff. `docs/PROJECT_STATE.md` retains earlier evidence and adds this result.

**PM next:** review the dirty change/hash manifest and evidence; then decide the separate hosted direct trial (same adapter/route, real HTTPS origin, managed credentials off, no caches, 30–45 minute budget). Hosted direct/managed retrieval/source persistence/source preview/grounding/physical audio remain NOT_RUN. Normal imports remain unavailable. No architecture reserve is needed from this local result. Do not mark Step 03 DONE or advance another task from this handoff.
