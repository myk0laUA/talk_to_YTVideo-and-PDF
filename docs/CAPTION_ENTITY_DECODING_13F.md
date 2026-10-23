# Task 13F — Caption entity decoding

**READY_FOR_REVIEW — 22 October 2026, Toronto.** Sole implementation task under original Steps 03/05/07/13. PM acceptance and deployment remain pending; accepted 13E and historical release gates are retained.

Local dirty `main`, HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`, production build **hdDQACZgIfajgeL0RF7GG**. Node **24.22.0**, npm **11.19.1**. No dependency, lockfile, schema, model, prompt, UI, ownership, expiry or source-replacement behavior changed by this task.

## Problem and boundary

Before application edits, `.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server artifacts/local/13f/entity-before.ts` exited 0 and reproduced all six PM examples using the real installed parser/application provider and injected HTTP only. `entity-before.json` retains the results. Nested encoding is a proven mechanism; the user's original upstream responses were not captured, so this is not a provenance claim for those exact videos.

Inspection of `node_modules/youtube-transcript-plus/dist/youtube-transcript-plus.mjs` (2.0.3) found one replacement pass for `amp`, `lt`, `gt`, `quot`, `apos` and decimal `#39` only. Appending another pass to that output would make the total decoding depth depend on whether a reference happened to be in the package's allowlist.

The existing strict XML shape check now retains each raw text body, in order. The installed parser still runs against the original XML and supplies timing/language. Its segment count must match the validated raw bodies. Immediately afterward, direct-provider text is canonicalized from those raw bodies, replacing the package's partially decoded text. `normalizeSegments` then performs its existing validation and final character-size accounting. No new XML format is accepted and no general XML/HTML parser, DOM or dependency is added.

## Bounded policy and literal ambiguity

There is one canonicalization boundary, with **exactly two simultaneous replacement passes over raw XML text**: XML escaping plus one demonstrated extra escaping layer. There is no decode-until-stable loop. Each pass supports the five case-sensitive XML names `amp`, `lt`, `gt`, `quot`, `apos`, decimal `&#digits;` and hexadecimal `&#xHEX;`. Hex digits accept either case; the XML `x` prefix is lowercase. Unknown names, missing semicolons and malformed references remain text.

Numeric references decode only XML 1.0 character ranges: TAB/LF/CR, U+0020–D7FF, U+E000–FFFD and U+10000–10FFFF. NUL, prohibited controls, surrogate code points, U+FFFE/U+FFFF, overflow and out-of-range values remain their original reference strings. They cannot throw through `String.fromCodePoint` or introduce those invalid characters. No whitespace trimming, sorting, merging, deduplication, markup stripping or Unicode normalization is performed. Existing rejection of empty/whitespace-only captions remains.

| Raw XML text | Installed package output | Canonical direct output |
|---|---|---|
| `don&#39;t` | `don't` | `don't` |
| `don&amp;#39;t` | `don&#39;t` | `don't` |
| `don&#x27;t` | `don&#x27;t` | `don't` |
| `A &amp; B` | `A & B` | `A & B` |
| `&amp;lt;script&amp;gt;` | `&lt;script&gt;` | `<script>` |
| `&amp;amp;` | `&amp;` | `&` |
| `&#128512; &#x1F600;` | unchanged | `😀 😀` |
| `&#38;#39; &#x26;#x27;` | unchanged | `' '` |
| `literal &amp;#39; example` | `literal &#39; example` | `literal ' example` |
| `literal &amp;amp;#39; example` | `literal &amp;#39; example` | `literal &#39; example` |
| `&nbsp; &unknown; &#xZZ; &#39` | unchanged | unchanged |

The complete 19-row fixture records all three layers in `tests/captions/entities.ts`, including invalid values, ordinary Unicode/whitespace, duplicates and inert script/image-looking text. **Literal intent cannot be inferred from plain text:** the extra pass can turn an intentionally displayed reference into its character. Deeper encoding deliberately remains encoded. This bounded compatibility choice does not promise arbitrary-depth decoding or perfect preservation of an author's intended entity notation.

Supadata's normalized JSON and PDF text never enter this decoder. Generic validators, cache writes/reads, owned-source reads, context packing and React rendering do not decode again. Canonical content may still contain entity-looking strings; regression tests verify they survive all downstream layers identically. All source content remains untrusted plain text.

## Cache compatibility and reimport

The existing `providerMetadata.version` is **2 for direct captions**, representing this canonicalization policy, and remains **1 for Supadata**. Provider identity and language/cache keys stay unchanged. A version-1 direct row is a complete cache miss; it is neither served, repaired in place nor deleted on read. A successful extraction upserts version 2 through the existing cache path. Reads do not renew TTL and writes/reads never decode content. Unknown versions remain misses. No migration, shared-cache flush or database operation was performed.

Existing visitor-owned sources are unchanged, even if their cache row is obsolete. After PM deploys this build (or while using the corrected local build), explicitly choose **Source actions → Replace source**, enter the same YouTube URL, and import again. The new import bypasses obsolete direct cache content, then subsequent imports use the canonical row. Merely reopening the source preview does not repair an old source. If extraction fails, the prior source remains available. Public hosted YouTube remains disabled under the existing release policy; this task does not enable it.

## Task files

- `src/server/captions/entities.ts`: bounded raw-text decoder.
- `src/server/captions/provider.ts`: retain validated raw bodies and canonicalize once before final validation.
- `src/server/captions/cache.ts`: provider-specific representation version, old direct rows miss.
- `tests/captions/entities.ts`, `tests/unit/caption-entities.test.ts`: actual-parser, canonical storage/cache/preview/preparation and format-isolation regressions.
- `tests/unit/caption-cache.test.ts`: retain unknown-version and bad-track coverage against the current version.
- `tests/captions/server.mjs`, `scripts/verify-caption-entities.mjs`: explicit isolated test preloads and built browser check, no production imports or mock selectors.
- This report, hash manifest and prepended entries in START_HERE, IMPLEMENTATION_PLAN, PROJECT_STATE and TESTING.

`artifacts/local/13f/task.diff` compares task arrival bytes with final bytes, excluding the pre-existing dirty work. `CAPTION_ENTITY_DECODING_13F_HASHES.json` contains task-file/evidence hashes, package parser identity and preservation-audit pointers. The manifest excludes itself; `artifacts/local/13f/manifest.sha256` hashes it. Original Step 01–14 IDs, prior handoffs and pre-existing deletions remain intact.

## Verification

All checks are local/offline. The actual installed caption parser, application services, production build and Chromium run; upstream HTTP and Prisma storage are synthetic. No real provider/model calls, paid experiments, real DB operations, cache flush, commit/push, deployment or external messages occurred. `prisma generate` in the existing npm scripts is code generation, not a DB operation.

Exact executable, argv, UTC start/end and exit values are in `artifacts/local/13f/commands.jsonl`; each named log is in that directory. The pinned executable is `.tools/node-v24.22.0-win-x64/node.exe`; npm runs through `.tools/node-v24.22.0-win-x64/node_modules/npm/bin/npm-cli.js`, with the pinned Node directory prepended to PATH by the evidence runner.

| Check | Command (pinned Node/npm) | Result / evidence |
|---|---|---|
| Baseline actual-parser reproduction | `node --conditions=react-server artifacts/local/13f/entity-before.ts` | PASS, exit 0 before edits; six defective/current outputs, `entity-before.json` |
| Runtime | `node --version`; `npm --version` | v24.22.0 / 11.19.1, exit 0 |
| Focused new regressions | `node --conditions=react-server --test tests/unit/caption-entities.test.ts` | 6 PASS, exit 0; `entities-2.log` |
| Lint | `npm run lint` | PASS, exit 0; `lint.log` |
| Types | `npm run typecheck` | PASS, exit 0; `typecheck-2.log` |
| Caption/cache/source/context/preparation/owned-mode regressions | Exact 15-file command below | 554 PASS, 0 fail/skip, exit 0; `focused.log` |
| Production build | `npm run build` | PASS, exit 0; `build.log`; hdDQACZgIfajgeL0RF7GG |
| Affected browser preview | `node --conditions=react-server scripts/verify-caption-entities.mjs` | PASS, exit 0; `browser-1.log`, `browser/results.json`, four PNGs |
| Preservation and task diff | `node artifacts/local/13f/finalize.mjs` | Arrival hashes compared, allowed task paths only; `preservation.json`, `task.diff` |

```powershell
node --conditions=react-server --test tests/unit/caption-entities.test.ts tests/unit/captions.test.ts tests/unit/caption-cache.test.ts tests/unit/caption-coordinator.test.ts tests/unit/caption-automatic.test.ts tests/unit/english-captions.test.ts tests/unit/supadata.test.ts tests/unit/youtube-sources.test.ts tests/unit/sources.test.ts tests/unit/pdf.test.ts tests/unit/context.test.ts tests/unit/caption-preparation.test.ts tests/unit/text-caption-packing.test.ts tests/unit/owned-text.test.ts tests/unit/owned-voice.test.ts
```

Initial new-test execution failed (exit 1) because the test referenced a nonexistent `sourceContentDto` export; corrected to the existing `sourceDto(row, true)`. Initial typecheck failed (exit 2) on closure narrowing of optional raw bodies; captured the checked array in a local constant. Both failures/logs are preserved. Subsequent focused/typecheck/lint/build/browser passes include these corrections; no production edits followed the successful build.

Browser verification imports through actual built HTTP routes at 390×900 (fresh) and 1440×900 (cache hit), with no browser-side API response mocking. Both render all **19 segments, 429 UTF-16 characters, 52 words**, retain `en-GB`/automatic provenance and fractional timestamps, and have distinct owned source IDs. Only one three-request injected extraction and one cache write occur. All `.page-text` contents match the canonical fixture; each has zero element children. Script/image/iframe-looking source text creates no such elements, does not execute the sentinel, and produces zero external browser requests/server network violations or page errors. Server teardown is recorded as SIGTERM. All four captures are retained; desktop initial preview and mobile inert-markup capture were visually inspected.

For a rerun, use a fresh `VERIFICATION_ROOT` under `artifacts/local/13f/` after building; the browser script refuses an existing output directory. Tests exercise source ownership, expiry, failed replacement, English selection/cache isolation, final canonical size boundaries and exact reconstruction through **both actual preparation functions**, including locators. The PDF/Supadata literal fixture stays unchanged. Broader unrelated suites were not rerun after the 554 focused checks passed.

## Acceptance mapping and limits

| Requirement | Evidence |
|---|---|
| Actual defect first reproduced; decimal/hex/named/Unicode/malformed/already-normalized cases | Baseline JSON; explicit three-layer fixture and actual-parser test |
| Bounded policy, one boundary, final-size validation | Decoder/provider diff; over-1M raw input canonicalizes below the unchanged final limit; over-limit canonical result rejects |
| Old/new cache and explicit reimport | Synthetic cache/repository/import tests: obsolete miss, fresh canonical write, identical hit; failed extraction retains prior source and old row |
| Segments/fullText/counts/preview/text+voice agree | Both preparation functions decode back to the saved preview sections/fullText, exact timestamps/locators; built HTTP + rendered preview |
| Plain-text safety / no format bleed | Inert script/image browser captures and DOM/network assertions; generic validator, managed JSON/cache and PDF literal checks |
| Preserve 13E and existing dirty work | Focused 554 checks, arrival/preservation hashes, task-only diff; no model/UI/prompt changes |

No live user-video payload, deployed behavior, actual PostgreSQL behavior in this task, physical phone/audio or model-answer accuracy was verified. Browser viewport emulation does not establish phone/audio behavior. Unknown upstream XML formats still fail closed; no broader parser support is claimed. PM reviews this handoff, then owns any release operations and separately bounded live verification. Worker advances no later task.
