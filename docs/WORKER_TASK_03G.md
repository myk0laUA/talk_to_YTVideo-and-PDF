# Task 03G — restore a simple full-source YouTube conversation path

## Outcome and authority

Sole active implementation task, under original Steps 03/07/10. User approved the PM reassessment and simpler delivery route: “good. Let's finish what's left”. Apply `prompts/WORKER_PROMPT.md`. Implement offline, return evidence, then stop for PM review. Estimated implementation timebox: 90 minutes; record verification time separately. Do not extend into another architecture experiment.

The product will provide source-grounded natural conversation without a citation feature. Historical 03F FAIL results remain FAIL; 03G is a changed prospective product contract, not a correction to old scores. Hosted YouTube is deferred bonus work under the assessment's local exception. Public YouTube stays disabled and voice stays enabled. No deployment or live spending in this task.

## Starting evidence

PM inspection: main HEAD `1d30684b5e5d046197038273f67d2f29db93abf4`; existing dirty PM documentation must be preserved. Read `PM_REQUIREMENTS_REASSESSMENT.md` and latest PROJECT_STATE. No reference-contract report/evidence directory found; that prior assignment is superseded and its unused allocation is not available. Last dashboard-confirmed Live commit is `52ba0a0` (previous PM turn, not a new functional test).

Lossless caption packing and full-source readiness work; current YouTube text/B manifest adds citation-specific instructions, the text registry projects evidence, and transcript UI displays citation states. Responses candidate/catalog/passage code is isolated and must remain outside runtime. PDF and voice have scoped working evidence to protect.

## Scope and implementation notes

1. Remove YouTube text citation-generation instructions and reference-specific answer constraints. Retain concise natural answers, source attribution where appropriate, uncertainty, absent-information behavior and untrusted-source boundaries. Reuse existing general grounding behavior; do not add another elaborate prompt or change provider/model/reasoning/output limits.
2. Preserve complete source context, original caption IDs/text/order/times, lossless packing, event bounds, paced delivery, exact admission, readiness ACKs, cancellation and Stop. Update representation/version checks consistently if required; reject stale or forged manifests rather than weakening admission. PDF and all voice manifests must remain byte-identical for fixed existing inputs.
3. Remove active YouTube evidence projection and citation-status UI coupling. Stream and retain ordinary answer text normally, with no citation badges/warnings or claim that text is verified. Retain full source preview and all normal transcript states. Do not regex-rewrite generated prose or fabricate links if a model happens to mention a locator.
4. Remove only citation-exclusive runtime helpers/types/styles/tests made obsolete by this change after checking references. Preserve general transcript/lifecycle/security tests. The isolated Responses experiments may remain inert for this bounded task; demonstrate no production route/client reachability. Do not spend the timebox reorganizing historical experiments or evidence. Record a precise residual dead-code inventory for final cleanup.
5. Preserve one source/conversation, anonymous ownership/expiry, PostgreSQL, WebRTC voice, real microphone-free text mode, existing public flags, permanent-key boundary and source replacement behavior. No service/schema/dependency/lockfile/configuration changes, retrieval, model swap, proxy, accounts, embeddings or new feature.

Verified relevant paths (inspect their current contents before editing): `src/shared/priming-manifest.ts`, `src/server/text/registry.ts`, `src/server/text/youtube-evidence.ts`, `src/shared/youtube-evidence.ts`, `src/shared/transcript.ts`, `src/app/text-http-controller.ts`, `src/app/transcript-view.tsx`, `scripts/lib/full-source-text.ts`, `tests/priming/caption-decoder.ts`. Locate actual consumers before deletion; do not assume this list is exhaustive.

## Applicable selected skills

- `.agents/skills/vercel-react-best-practices/SKILL.md`: relevant React/transcript boundary and rendering guidance only.
- `.agents/skills/playwright-cli/SKILL.md`: verify the changed transcript presentation and existing app lifecycle using isolated browser tests.
- No design overhaul; Impeccable/web-design audit is not needed for deleting citation presentation. Consult installed `node_modules/next/dist/docs/` only if framework behavior changes. Do not add skills/dependencies to complete this task.

## Acceptance and commands

Use Node 24.22.0/npm 11.19.1 from the existing pinned installation. Run offline checks in a task-owned `.env`-free isolated checkout with fake configuration, unusable database and established network-denial safeguards. Never copy the private root `.env` or change deployed flags. Preserve the root build and prior artifacts.

Required behavior:

- Complete saved 428-caption stress-source reconstruction remains exact, including final text and original locators. This is an offline preservation check, not live ingestion proof.
- Fixed-input PDF/text and all voice manifests remain unchanged. YouTube text/B retains bounds/admission/cancellation/readiness, rejects old/forged representations and contains no citation-generation contract.
- Both normal and citation-looking synthetic answer text remain readable/streamed/retained after Stop without citation notices. Actual owned text route/registry/transcript presentation is exercised with explicitly fake provider input; no mock counted as semantic accuracy.
- Source replacement, expiry, wrong visitor, Stop during priming, late output and single transport protections remain effective. No microphone request in text mode. No Responses candidate in production route/client dependency traces.

Exact existing commands, in order where dependent:

```sh
node --version
npm --version
npm run lint
npm run typecheck
npm test
npm run build
npm run test:owned-text
npm run test:transcript-view
npm run test:smoke
git diff --check
```

Use existing manifest preservation fixtures and affected admission/packing tests within `npm test`; add only meaningful regressions for changed behavior. If an existing browser assertion checks intentionally removed citation UI, replace it with the ordinary-answer expectation and disclose why. Do not delete unrelated failing tests. Add `test:owned-voice` or `test:voice-adapter` only if changes reach their behavior or preservation evidence identifies a risk; do not rerun unrelated suites by habit. Record every actual command/exits and failures honestly.

## Manual/browser checks

1. In the isolated local built app with fake provider boundary, display a YouTube conversation at desktop and 390 px. Send a question, observe natural text streaming, then Stop: answer and preview remain; no source-reference warnings/badges.
2. Replace the source and verify the prior conversation stops/clears per existing policy; late old output does not appear in the new conversation.
3. Verify text mode requires no microphone permission. Label screenshots as local/mocked/viewport emulation, never phone or audio proof.

Real uncached import, live answer accuracy, YouTube WebRTC voice and physical phone checks are NOT_RUN in 03G. Do not launch any old live runner or use a prior ledger. PM will review the offline result, freeze the two-source/ten-answer whole-transcript evaluation and allocate its cost separately. No user phone action is needed for this task.

## Evidence and stopping rule

Return `docs/YOUTUBE_SIMPLE_CONVERSATION_03G.md`, concise PROJECT_STATE/TESTING entries, actual branch/HEAD plus dirty delivery identity, changed-file hashes, isolated build ID, commands/exits, manifest/source preservation, production import exclusion, screenshots and exact residual code inventory. Put logs/screenshots under ignored `artifacts/local/03g/`. Preserve every historical failure and ledger.

Stop if this needs transport/model/provider redesign, weakens authorization/admission, changes PDF/voice output, or exceeds the implementation timebox. Report the concrete blocker; do not silently widen scope. No commit/push/deploy merely to manufacture identity. Return READY_FOR_REVIEW for this offline scope; original grounded conversation and release gates remain incomplete until live checks pass.
