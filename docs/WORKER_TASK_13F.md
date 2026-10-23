# Task 13F — Correct caption entity decoding

Sole active implementation task under original Steps 03/05/07/13. PM owns review and deployment. Preserve accepted 13E and the existing dirty tree; HEAD at issue time is 1d30684b5e5d046197038273f67d2f29db93abf4, latest reviewed local build Olc_TqoFi9G8zHh4fCcAo. Read AGENTS.md, START_HERE.md, implementation plan, project state, testing/skills policy and worker prompt first.

## Proven problem

User screenshots from two videos show literal `&#39;` in contractions. The installed youtube-transcript-plus 2.0.3 performs one replacement pass for a short entity allowlist. PM reproduced through the actual application direct provider and installed parser with injected HTTP responses, zero network/model/DB calls:

| XML text | Current normalized text |
|---|---|
|`don&#39;t`|`don't`|
|`don&amp;#39;t`|`don&#39;t`|
|`don&#x27;t`|`don&#x27;t`|
|`A &amp; B`|`A & B`|
|`&amp;lt;script&amp;gt;`|`&lt;script&gt;`|
|`&amp;amp;`|`&amp;`|

Reproduction: `.tools/node-v24.22.0-win-x64/node.exe --conditions=react-server artifacts/local/13f-pm/entity-repro.ts`; final exit 0, evidence entity-repro.json. An initial PM runner used an incorrect relative import and exited 1; only the runner import was corrected. No application changes were made. Actual upstream XML for the user's videos has not been captured, so nested encoding is a demonstrated mechanism, not confirmed provenance for those exact screenshots.

The preview correctly renders plain React text in src/app/source-workspace.tsx. Provider output is validated/stored without further decoding, and old transcript-cache rows can preserve the defect. Source fullText and segments feed both preview and conversation; a display-only replacement would leave model input wrong.

## Required outcome

1. Correct entity normalization at the direct-caption extraction boundary. Inspect the installed parser before choosing the smallest implementation. Handle decimal/hex character references and the supported named entities, including the demonstrated extra escaping layer for contractions. Define and document a bounded decoding policy; never recursively decode until stable. Preserve ordinary apostrophes, Unicode, whitespace, caption order, timing, duplicates and language/provider provenance. Unknown/malformed references must not silently erase content; invalid code points must not crash or inject invalid text. Keep source-size validation on the final canonical representation.
2. Decode exactly once at a documented canonicalization boundary. Keep generic validators, source reads, context packing and React rendering free of repeated decoding. Distinguish provider formats: do not blindly apply XML decoding to Supadata's already-normalized JSON text or PDFs. Include literal entity-looking source examples and document the ambiguity of nested encoded text; do not claim arbitrary depth/literal intent can be inferred from plain text.
3. Cache correctness is part of the fix. Old direct-provider cache rows must not reintroduce the defect on reimport. Use the smallest compatible representation-version/provenance treatment or safely invalidate obsolete direct rows on read; preserve English language/cache isolation and other provider behavior. Do not flush a shared database, mutate existing owned sources behind active sessions or add a schema migration merely for this correction. Existing imported sources may require explicit reimport; document that plainly. New cache writes/reads must not decode again or change canonical content.
4. Canonical segments, fullText, counts, source preview and text/voice preparation must agree. All decoded text remains untrusted plain text. Never use dangerouslySetInnerHTML, insert HTML into a live DOM, strip apparent markup or execute source content. Keep 13E's English policy, packing/bounds, ownership/expiry/replacement and default models unchanged.

Likely files: src/server/captions/provider.ts, cache.ts and focused fixtures/tests; inspect before editing. No dependency upgrade, retrieval, model/prompt change, UI redesign, caption merging or transcription feature. Prefer a narrowly scoped solution using existing project facilities; justify any new runtime dependency before adding it.

## Acceptance and verification

- First reproduce the current defect. Add regressions through the real direct provider/parser (injected upstream only) for the table above, hexadecimal and decimal Unicode references, malformed/unknown entities, already-normalized text and a bounded nested/literal example. Clearly state expected text at each layer.
- Test fresh import and old/new cache paths. Reimport after correction produces canonical readable contractions; subsequent cache hits preserve identical text and counts. Failed replacement still retains the prior source; English selection remains intact. Supadata and PDF text stay unchanged.
- Verify identical canonical text reaches stored source/preview and both mode preparations, preserving timestamps/locators. Include inert markup-looking text in a rendered preview; it must be visible text and create no elements/scripts or network activity.
- Use pinned Node 24.22.0/npm 11.19.1. Run lint, typecheck, focused caption/cache/source/packing regressions, build and one affected browser preview check. Use repo React/Playwright skills only if touching UI/browser verification; no design cycle. Preserve old evidence and use fresh artifacts/local/13f outputs.
- No real provider calls, paid experiments, DB operations, commit/push/deployment or external messaging. Stop if an upstream format cannot be supported safely within this boundary; report exact evidence instead of a broad parser rewrite.

Return READY_FOR_REVIEW with docs/CAPTION_ENTITY_DECODING_13F.md, task diff and file/evidence hashes, exact commands/exits/build, policy/literal caveats and reimport instructions. Update canonical trackers without claiming PM acceptance. PM reviews then resumes release operations.
