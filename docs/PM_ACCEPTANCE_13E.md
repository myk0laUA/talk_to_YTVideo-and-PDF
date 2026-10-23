# Task 13E — PM acceptance, 22 October 2026 Toronto

**ACCEPTED for its bounded offline scope.** No blocking finding in the task diff. No application edits, deployment, real database/provider calls or spend during this review. No active worker task remains; resume release preparation rather than another model or UI experiment.

Reviewed main HEAD `1d30684b5e5d046197038273f67d2f29db93abf4` plus the preserved dirty tree, local production build **Olc_TqoFi9G8zHh4fCcAo**. All 902 changed-file/final-file/evidence hash entries matched before PM tracker edits. All 16 retained deletions remain absent; all 714 arrival inventory entries reconcile with retained copies. The worker manifest is historical evidence; subsequent PM documentation is intentionally outside that identity.

## Findings and checks

- Server-owned YouTube imports now request English. Direct extraction selects advertised English tracks deterministically; managed results and cache hits are validated. Legacy unspecified/Arabic cache keys cannot satisfy the new default. Missing English fails with guidance and preserves the prior source. Actual upstream behavior remains untested in this task.
- English response instructions are present in both owned modes for PDF and YouTube, with new policy revisions and exact ACK validation. This verifies instructions sent, not guaranteed model compliance. Source previews retain original PDF text; there is no translation or new transcription feature.
- The erroneous input-section limit is removed. Both modes pack 4,097 short captions into bounded messages, preserving exact text, order, locators and timing. The unchanged 16,384-byte event, 4,096 emitted-item and 8,000,000-byte wire bounds still reject genuine oversize. No truncation, retrieval or architecture replacement.
- Local size rejection is typed and reauthorizes the source before disclosure. Foreign/missing/expired/replaced sources retain unavailable behavior. Rejected preparation acquires no model connection, credential or microphone. UI preserves preview/replacement and removes the deterministic-failure retry action.
- The PDF helper reads “Up to 25 MB. Text PDFs only.” Selectable-text guidance and parser behavior remain.

Fresh PM commands used `.tools/node-v24.22.0-win-x64/node.exe` through the ignored `artifacts/local/13e-pm/review.mjs` runner:

| Check | Result |
|---|---|
|Manifest SHA-256 verification|902 entries match; exit 0|
|`--require ./tests/text-relay/network.cjs --conditions=react-server --test` with english-captions, caption-preparation, text-caption-packing, voice-browser-adapters, text-lifecycle and voice-lifecycle unit files|324 passed, no skips; exit 0|
|Same test invocation with owned-text and owned-voice unit files|157 passed, no skips; exit 0|
|`--conditions=react-server scripts/verify-english-preparation.mjs` with fresh output directory|20 matrix entries / 16 PNGs; exit 0; build matches|

Exact executable/arguments/UTC timestamps/exits are in `artifacts/local/13e-pm/commands.jsonl`; hash result in `hashes.json`; browser results in `browser/results.json`. Browser run uses production Next UI/routes with synthetic storage and blocked provider/native media. Both themes at 390 and 1440 px passed size recovery, retained full source read, new-source Start restoration, helper copy and overflow/clipping checks; zero forbidden network requests, zero native calls/mints, server terminated. PM inspected mobile dark voice failure, mobile light text failure and desktop light PDF helper screenshots. Emulation is not physical-phone/audio evidence.

Worker lint/typecheck/build, wider focused suite and built text/voice/native/YouTube checks were reviewed through matching evidence; PM did not duplicate every suite or rebuild. Retained worker intermediate failures remain historical failures, with final corrections recorded in [worker report](ENGLISH_CAPTION_PREPARATION_13E.md).

## Remaining delivery gates

The exact user 13-hour video URL/count is still unavailable. This acceptance fixes a reproduced application boundary; it does not prove that video's cause or model capacity. Fresh English import/replies and actual long-source behavior remain unverified. Any real-app check must be bounded and recorded, without an automatic retry/model-comparison loop. A clear capacity rejection is distinct from successful conversation.

Next: freeze the reviewed release revision; complete PM production cleanup operations/configuration and deployment; verify representative hosted PDF/text/voice/recovery behavior with recorded cost; then user physical-phone check and final recording/access checks. Public hosted YouTube remains disabled under the accepted local-demo exception. Prior SQL acceptance, dependency residual and historical answer limitations remain unchanged. Project completion is not declared.
