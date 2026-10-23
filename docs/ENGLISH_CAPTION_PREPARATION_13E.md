# Task 13E — READY_FOR_REVIEW

Implemented the bounded English-caption/answer policy, caption preparation correction and PDF helper copy. PM acceptance is pending. Original Step 01–14 IDs, accepted 13D UI/SQL work and historical accuracy failures remain unchanged.

Local identity: **main**, HEAD **1d30684b5e5d046197038273f67d2f29db93abf4**, preserved dirty working tree; production build **Olc_TqoFi9G8zHh4fCcAo**. Work/evidence dated **22 October 2026 Toronto** (command timestamps use 23 October UTC). Node **24.22.0**, npm **11.19.1** from `.tools/node-v24.22.0-win-x64`. No commit, push, deployment, external messages, live captions/model calls, database operation, migration or cache flush.

## Changes and reasons

- Owned YouTube imports default to `en` on the server. Explicit non-English selection returns 400 with English-policy guidance. Missing English returns 422 with actionable English-captions-unavailable copy; any failed replacement retains the existing source.
- Direct extraction selects from the already-fetched advertised tracks: exact requested tag first, then (for generic `en`) English regional tags in case-insensitive lexical order, retaining provider order for equal tags. Non-English tracks are excluded. The installed parser receives only the selected track, with its real language tag; no relabeling, translation, extra upstream call or language-list retry. `trackType` still describes that selected track. Explicit regional requests stay exact and case-insensitive.
- Supadata still requests native captions once with `lang=en` for default owned imports. Both synchronous and completed job results must match the requested language (`en` accepts English regional tags). A mismatched managed response returns a safe no-captions result. Managed track selection remains provider-controlled; no claim of independent enumeration of its tracks.
- Owned default requests use the existing explicit `en` cache/coalescing key, distinct from legacy unspecified-language and Arabic keys. Cached/fresh data are validated again at the owned boundary. Cache `en` keys can preserve valid regional English provenance; expiry and cache identity checks remain. Malformed injected cache/fresh successes fail safely; actual invalid stored rows are misses. Coalescing, admission and atomic source replacement are retained.
- Both owned modes and both source kinds receive one shared English response instruction. Names/short original quotations remain permissible; explanation stays English. Text policy advances from v3 to v4 and voice from v7 to v8; diagnostic Mini text revision also advances for its matching instruction contract. Exact manifest and session ACK validation binds the new instructions. Models, 2,048 output caps, reasoning, voice, VAD, transcription and acoustic settings remain unchanged. No transcription language hint was added.
- Owned voice now reuses the existing deterministic packed caption representation already used by owned text. Input caption count no longer acts as the emitted-item cap. Every exact text fragment, locator, order, timestamp/duration, empty caption and duplicate is retained. The packed payload representation remains v6; the voice policy revision binds its adoption. PDF source-item representation stays unchanged.
- Production bounds remain **16,384 bytes/event**, **4,096 emitted items**, **8,000,000 total wire bytes**. All existing production deadlines, ACK order, backpressure and history settings remain. Whole short fragments are checked before binary splitting to avoid repeatedly serializing them unnecessarily. No truncation, summarization, retrieval or deduplication.
- `SourceSizeError` distinguishes local encoding/transport size rejection. Preparation rechecks ownership/content/expiry before reporting it. Voice returns client-safe 413/`source_too_large`; text reports the same category through its existing owned stream. Both async lifecycle boundaries preserve this typed error while continuing to sanitize other errors. Foreign/missing/expired sources keep their existing indistinguishable unavailable responses; cancellation/admission/provider context rejection stay separate.
- Both UIs retain View source and source replacement, show the same size guidance and hide the start/retry action for that deterministic failure. A new source restores explicit Start. Rejected voice preparation does not mint credentials, create a peer or request a microphone; text does not connect to a provider. No automatic retries. Bounded voice diagnostics now permit 413; no source/error bodies, secrets or identifiers were added to telemetry.
- PDF import/replacement helper now says **“Up to 25 MB. Text PDFs only.”** Existing “Choose a document with selectable text.” content and PDF parser behavior remain.

The task uses the selected React and Playwright guidance. No design cycle, framework/dependency change or API-field research/migration was required.

## Reproduced boundary

Before any application edits, a copy of the PM runner reproduced the original failure. Original PM evidence was not overwritten.

| Synthetic input | Before | After |
|---|---|---|
|4,096 one-character captions|Text 42 items; voice 4,096 items; voice preparation succeeds|Text 42 items/680,198 wire bytes; voice 42 items/681,710 wire bytes; preparation succeeds|
|4,097 one-character captions, 8,193 source characters|Both encoders reject `Invalid priming source`; voice preparation 404|Text 42 items/680,358 wire bytes; voice 42 items/681,870 wire bytes; preparation succeeds|

Evidence: `artifacts/local/13e/boundary-before.json` and `boundary-after.json`. Both runs have zero mints and zero retained preparation entries/timers/pending mints after disposal; one bounded replay tombstone remains as intended. Counts/bytes depend on the authored identity used by the runner. Separate tests reconstruct all 4,097 segments and exercise the actual owned text stream and voice HTTP/native-adapter ACK path with fake provider/media.

The genuine oversize fixture contains 20,000 authored segments of 40 `<` characters (819,999 source characters), within ingestion bounds but beyond the unchanged escaped-wire bound. It receives the typed local failure. Separate small fixtures exercise Unicode splitting, empty/duplicate captions, emitted-item rejection and negotiated event-size rejection. These synthetic fixtures establish transport behavior, not real-video semantics or provider capacity.

## Verification

All final checks below PASS / exit 0. All services/storage/media are injected or blocked, unless a row explicitly says actual local framework/parser. No live or deployed verification is implied.

Exact executable, argv, UTC start/end and exit for **all test/build/check runs including failures** are in `artifacts/local/13e/commands.jsonl`. The ignored runner is `artifacts/local/13e/run.mjs`; it invokes the pinned Node executable, prefixes PATH for child processes and routes test outputs into fresh task directories. npm commands below use its pinned npm CLI. Final inventory generation records its invocation and result separately in `manifest-verification.json` to avoid changing a hashed command ledger.

| Check | Actual command / command-log name | Observed result / evidence |
|---|---|---|
|Arrival preservation|`node artifacts/local/13e/run.mjs baseline artifacts/local/13e/baseline.mjs`|714 arrival file/deletion entries; bytes retained under `arrival/`, inventory `arrival.json`|
|Before boundary|`node artifacts/local/13e/run.mjs boundary-before --conditions=react-server artifacts/local/13e/boundary.ts`|Expected original 4,097 failure / 404 reproduced; runner exit 0|
|Lint|`npm run lint` (`lint-final`)|PASS / exit 0; `lint-final.log`|
|TypeScript/framework type generation|`npm run typecheck` (`typecheck-confirmed`)|PASS / exit 0; `typecheck-confirmed.log`|
|Focused regressions|`node --require ./tests/text-relay/network.cjs --conditions=react-server --test` plus the 21 files enumerated below (`focused-pass`)|1,088 / 1,088 PASS, no skips; `focused-pass.log`|
|Prior policy rejection|`node --require ./tests/text-relay/network.cjs --conditions=react-server --test --test-name-pattern "prior.*policy revision" tests/unit/caption-preparation.test.ts` (`stale-policy`)|2 / 2 PASS, old v3/v7 rejected before source reads|
|Production build|`npm run build` (`build`)|PASS / exit 0; `build.log`; build **Olc_TqoFi9G8zHh4fCcAo**|
|Built owned text|`node --conditions=react-server scripts/verify-owned-text.mjs` (`owned-text`)|533 checks PASS; `owned-text/owned-text/`|
|Built owned voice|`node --conditions=react-server scripts/verify-owned-voice.mjs` (`owned-voice`)|734 checks / four groups PASS; `owned-voice/owned-voice/built-http.json`|
|Built native voice adapter|`node --conditions=react-server scripts/verify-voice-adapter.mjs` (`voice-adapter-confirmed`)|623 checks / 48 scenarios PASS; `voice-adapter-confirmed/12d/regression/08d/`; reconstruction includes exact locators and timestamps|
|Built YouTube HTTP|`node scripts/verify-youtube-sources-http.mjs` (`youtube-http`)|59 checks / nine scenarios PASS; `youtube-http/03c/`; real adapters/parser with injected upstream/storage|
|New built UI/size paths|`node --conditions=react-server scripts/verify-english-preparation.mjs` (`browser-2`)|20 matrix entries, 16 PNGs; light/dark 390×844 and 1440×900; `browser-2/results.json`|
|Preservation/whitespace audit|`node artifacts/local/13e/final-audit.mjs` (`audit`)|PASS / exit 0; `audit.json`; dependency/lockfile/environment-example/CSS/cleanup/credential settings unchanged from arrival|
|After boundary|`node --conditions=react-server artifacts/local/13e/boundary-after.ts` (`boundary-after`)|Both 4,096/4,097 prepare; zero mints; `boundary-after.json`|

The 21 focused files under `tests/unit/` are: `english-captions`, `caption-preparation`, `captions`, `supadata`, `caption-cache`, `caption-coordinator`, `caption-automatic`, `text-caption-packing`, `priming`, `priming-setup-timing`, `owned-text`, `owned-voice`, `voice-browser-adapters`, `provider-admission`, `provider-voice-admission`, `default-text-model`, `youtube-sources`, `text-socket-pacing`, `text-lifecycle`, `voice-lifecycle`, `text-http-controller` (each `.test.ts`). The only tests added after the 1,088 run were the two prior-policy cases, separately passing. Final lint/typecheck cover all delivered test edits. The last production code edit preceded the production build; subsequent changes were test/verifier/docs only.

The built UI matrix uses actual application controllers, voice preparation routes and text streams. Source import success/storage are synthetic fixtures. It proves local 413 and streamed size failure, no retry button, full 20,000-section source read still 200 / exact, replacement helper, new-source Start restoration, zero native calls/mints/external requests, teardown and no viewport overflow/clipping. Eight representative PNGs were visually inspected across both themes and widths: mobile voice-light/text-dark/helper-dark/replacement-light and desktop voice-dark/text-light/helper-light/replacement-dark. Browser emulation does not establish physical-phone/audio behavior.

### Retained intermediate failures

- `initial-focused`: stale revision/format assertions, managed fixture requesting English but returning French, and the added instruction exceeding the deliberately tiny 2,048-byte voice test event envelope. Tests now retain equivalent assertions for the new policy; that voice test fixture uses 4,096 bytes (production remains 16,384), with explicit 2,048-byte rejection coverage. French fixture became regional English; mismatch negatives were added separately. Shared error type is in the permitted pure `priming-*` graph.
- `typecheck-1`/`typecheck-2`: test-only narrowing and optional-field errors corrected; final typecheck passes.
- `focused-2`/`targeted-3`: actual async wait helpers erased typed size errors; corrected both. A replacement-race test also needed to expect 404 at stream attachment. Short-fragment serialization optimization reduced preparation work. No production limit/deadline change.
- `focused-final`: browser-safe dependency count 7 needed 8 for the new pure shared module; all existing forbidden-import checks retained plus explicit membership assertion.
- `focused-confirmed`/`caption-voice-diagnostic`: the new 4,097-caption integration hit the small fault fixture's 2-second priming deadline during credential revalidation. That single test now uses the unchanged 25-second production priming deadline. `voice-size-final` and the subsequent complete focused run pass. This is not a production deadline increase or a promise for arbitrary long videos.
- `browser`: the new verifier returned a YouTube DTO from a mocked PDF import; the app correctly rejected it. Corrected the verifier to use the YouTube form/import route; `browser-2` passes. Original failure output retained.
- `voice-adapter`: inherited verifier equated emitted item count with source segment count. Replaced with separate item ACK count and complete reconstructed segment/locator/timing assertions; final 623 checks pass without weakening source-fidelity checks.

## Acceptance and limitations

English default/exact/region/missing-language, native managed result validation, cache contamination/isolation, coalescing and failed replacement are covered by `english-captions.test.ts` and existing caption/cache/coordinator/owned-source suites. New instructions/previous policy rejection/exact initial and final ACKs are covered for both source kinds and modes. 4,097 reconstruction and true bounds are covered by `caption-preparation.test.ts`; actual text/native-voice starts and no-acquisition failures use the owned suites and browser matrix. Ownership/expiry/replacement/cancellation, admission cooldown, provider context error, ACK order, backpressure and cleanup regressions remain tested.

**NOT_RUN:** exact user 13-hour video (URL/count not supplied), fresh live direct/managed import, actual English model replies/semantic completeness, provider context capacity, audible microphone/speaker behavior, physical iPhone/Android and deployment. English output is instructed behavior, not guaranteed by offline evidence. The original report establishes an application preparation failure before credentials; it does not establish the exact cause for that user's video or prove 13-hour model support. No new accuracy claim replaces historical failures. Public hosted YouTube remains disabled; the accepted local application exception remains.

PM next action: review this task diff/evidence, then authorize a separately bounded actual-app check using the user's exact source if available. Record actual segment count, selected English language/provider, build and preparation outcome; distinguish local size failure from provider context rejection. Any live answer/audio/device test remains separately bounded and must record observed results. Worker stops at READY_FOR_REVIEW.

## Delivery inventory

`ENGLISH_CAPTION_PREPARATION_13E_HASHES.json` lists every task-changed file, before/after SHA-256, retained arrival deletion entries, final repository inventory and task evidence SHA-256. It excludes itself and its verification receipt to avoid circular hashes; the final manifest digest is recorded in ignored `artifacts/local/13e/manifest-verification.json`. The arrival copy tree is represented by its hashed `arrival.json` inventory, with every retained copy checked against that inventory. Task-only `task.patch` and `preservation-audit.json` are under `artifacts/local/13e/`. Unrelated arrival work was preserved. `PROJECT_STATE.md`, `TESTING.md`, `START_HERE.md` and `IMPLEMENTATION_PLAN.md` contain concise worker handoffs without PM acceptance or later-step advancement.
