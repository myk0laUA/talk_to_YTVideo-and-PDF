# Task03M — larger model as the default for owned text

Sole active implementation task under Steps07/10/13. Follow WORKER_PROMPT and required handoffs. User explicitly chose the larger model as default after03L. This replaces the unfinished automatic size-routing delivery objective; no calibrated Mini threshold is now required for text delivery. It does not erase accuracy failures or authorize deployment.

## Outcome

**Subsequent user clarification:** the 03L PDF rule-exception omission is accepted as a known delivery limitation. Preserve its FAIL grade and document it; correcting or retrying it is not required for 03M or a prerequisite for later app verification. Perfect semantic accuracy is not a delivery criterion. This does not waive functional, source-fidelity, authorization or recovery checks, and does not allocate live spending.

Default every new owned PDF and YouTube text conversation to **gpt-realtime-2.1**, with accepted2048output ceiling/minimal reasoning/full-source instructions. Keep selected model fixed for session lifetime. Preserve working WebRTC voice policy/settings; this task is owned text only. No claim that this is the best model available across all APIs, or that observed larger-model answers are universally accurate.

Starting HEAD1d30684 plus accepted dirty03G/03I/03K work; buildz-ZMCK6ul_aC9cv1h0_TM. Read USER_SOURCE_COMPLETION_03L.md/TEXT_OUTPUT_LIMIT_03K.md. Larger video checks and PDF summary passed, targeted PDF exception failed; keep all grades. No active allocation from prior ledgers.

## Implementation

1. Make the ordinary runtime path default to larger without requiring a routing-enable flag/cutoff. Both source kinds must use the same default. Old deployment config with no routing variables must not retain Mini inadvertently. Remove automatic size/estimator selection from the production owned-text path: this user decision replaces it. Do not silently choose Mini on unavailable larger or invalid configuration. Continue to report recoverable failures.
2. Propagate one immutable allowlisted model/policy through preparation/provenance, socket URL, session ACK validation, response permits/accounting and output reserves. Avoid changing voice through shared constants. Rename defaults/types clearly if needed; keep old policy revisions rejectable. Source fidelity/authorization/expiry checks added in03I remain valuable and must stay.
3. Remove now-unused production routing knobs/helpers and tokenizer dependency ONLY after confirming no retained caller needs them. Preserve historical reports, tests demonstrating authorization/lifecycle behavior, fixtures, ignored evidence and ledgers. Diagnostic comparison helpers may retain an explicit allowlisted model override outside production; no user-facing selector or automatic fallback. Avoid broad cleanup/refactoring. If estimator remains needed by diagnostics, keep it isolated and document why; no dependency deletion that breaks retained scripts. Old test-only cutoff harnesses should be adapted to explicit diagnostic injection or retired with rationale, not misrepresented as production switches.
4. Document larger default,2048cap, no automatic size switching, cost implication and source-accuracy limitation in relevant environment/README/handoff instructions. Remove obsolete active requirements for cutoff calibration, not historical evidence. Keep default public YouTube-disabled/voice-enabled deployment policy unchanged. No environment secrets read into output or copied.

## Verification

Pinned Node24.22.0/npm11.19.1. Meaningful tests: default/unset environment selects larger for both kinds; obsolete size knobs cannot silently select Mini; exact model/policy/cap ACK and stale revision rejection; larger unavailable fails without downgrade; follow-ups stay on larger; foreign/expired/replaced source rejected; Stop cleans resources; voice declarations/manifest remain unchanged. Update built owned-text fake boundaries to prove both source kinds use larger through actual registry/socket, not merely selected constant. Preserve partial-answer recovery/context errors and genuine no-microphone text mode.

Run relevant focused tests, lint,typecheck,full units,build and built owned-text checks. If dependency/lock changes are required, use npm and record audit result without unrelated upgrades. No model calls or realDB operations in this task. Application implementation and integration checks are offline; remaining livePDFapp verification is a separate PM gate. This prevents changing product while interpreting new answers. No speculative prompt correction or retry of failed PDF detail.

## Return and stop

Target90minutes. Return docs/DEFAULT_TEXT_MODEL_03M.md, concise PROJECT_STATE/TESTING updates, changed-file hashes, actual commands/exits, fresh build, default-policy proof for PDF/YouTube, unchanged-voice evidence, removal/dependency rationale and known gaps. Read selected project skills only when their scope applies; consult official OpenAI documentation if API assumptions change, installed Next docs only for framework changes.

Return READY_FOR_REVIEW then stop. No deployment, hostedYouTubeactivation, paid generation or next task. PM reviews default migration and then completes remaining app/release gates. User's preference accepts the larger model as operating default; it does not convert03L's exception omission into a pass.
