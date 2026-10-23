# Task 12B — source-focused conversation redesign

Sole active implementation task, Steps05/09/12/13. Follow AGENTS.md and WORKER_PROMPT. Updated22October after user rejected the current design and supplied references: redesign the presentation around ElevenLabs voice-chat-01, preserving working behavior. This supersedes the earlier polish-only brief; do not preserve unwanted layout merely because it exists. Target90–120minutes, one initial inspection and one final batched verification, with concrete defect repairs afterward. Read `references/UI_DIRECTION_12B.md` before implementation. Inspect any in-flight12B changes rather than overwriting them; no completed12B report existed at this revision.

## Starting evidence and outcome

08P accepted offline by PM:14 delivery hashes match and323 fresh focused tests pass; build `9plm_yr0fscZi-VDwACfo`, HEAD `1d30684` plus accepted dirty work. Both owned modes default larger. User local text tests pass for PDF/YouTube, follow-ups, Stop/remove/new source. Larger voice live check remains pending and may occur while this UI-only task proceeds. Do not claim audio/device success from fake media.

Make import → preview → conversation → Stop/remove understandable and comfortable on390px and desktop. Adopt the committed conversation-first design and component selections in UI_DIRECTION_12B: compact source header, readable transcript, bottom composer, compact voice controls, responsive source preview. Retain one source/conversation and current interaction semantics. Existing paper/green style and equal two-column panels are not binding. No model/prompt/caption/backend changes.

## Selected skills and scope

User explicitly requests Taste and Awesome Design. Use pinned Taste SKILL.md/app-screen guidance and Awesome Design ElevenLabs reference linked in UI_DIRECTION_12B; Taste replaces Impeccable for this task. Read PRODUCT.md/DESIGN.md and references/PRODUCT_REFERENCES.md, treating bootstrap-only status as historical. Use project React/Playwright skills for implementation/checks. No broad discovery, alternative visual worlds or generated imagery. Small presentational dependencies require compatibility/license review and rationale; no conversation-runtime, provider or styling-framework migration merely to install a kit. Update DESIGN.md for implemented decisions.

Priorities:

1. Clear primary action and selected mode; group Start/Stop/Mute/Interrupt by their purpose and actual availability. Keep necessary playback recovery accessible. Do not change controller or media lifecycle behavior, hide actionable errors, or make disabled controls look available.
2. Reduce repetitive explanatory/technical copy. Keep a concise, visible warning before mode changes clear conversation/draft. Put optional technical details behind existing disclosures where suitable; ordinary success should not dominate the answer. Preserve incomplete/interrupted/error warnings and honest playback status.
3. Improve transcript reading width, body text/line height, role distinction, spacing and long-answer wrapping. Preserve literal safe rendering, reading-position anchoring, Jump to latest, transcript retention and no focus theft while streaming. Never hide source/answer text or imply verified citations.
4. Make source entry/preview and conversation comfortable at390px,320px and desktop; compact unnecessary vertical space, maintain48px control targets and visible focus. Check long URLs, long source names, extracted text, empty/loading/error/ready/stopped states and200% zoom. No horizontal clipping or inaccessible preview close/remove confirmation. Keep keyboard navigation and announcements useful without announcing every token.

Likely files: `src/app/globals.css`, `source-workspace.tsx`, `conversation-area.tsx`, `text-session.tsx`, `voice-session.tsx`, `transcript-view.tsx`, `page.tsx`. Inspect actual callers. Keep server/security/model/transport/expiry and source normalization unchanged. HTML-entity normalization in captions is a separate known issue, not permission to rewrite ingestion here. No new session history, persistent data or Markdown/HTML execution.

## Verification

Use Node24.22.0/npm11.19.1. Inspect representative existing synthetic browser harnesses and adapt only assertions affected by intended UI/copy changes; retain meaningful lifecycle/accessibility checks. Offline/synthetic storage/provider/media only, external network denied, no real source deletion or paid calls. Save before/after views under `artifacts/local/12b/`, including390px/desktop transcript, source preview and one actionable failure. Visually inspect rendered final screenshots; viewport tests do not prove a phone.

Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:smoke`, `npm run test:transcript-view`, and the relevant existing source/voice/text UI checks for touched components. If touching shared conversation/voice UI, include `npm run test:voice-adapter` and `npm run test:owned-text`. Inspect package.json for exact additional scripts. Run focused units if logic changes; no new tests merely mirroring CSS. Preserve old ignored evidence by using supported task directories or backing up outputs before harnesses overwrite them. Consult installed Next docs if framework behavior is changed.

Acceptance: existing workflows retained; visibly improved hierarchy/readability at representative widths; keyboard/focus/long content and key states verified; no broken selected-mode controls or new horizontal overflow. No blanket accessibility/physical-device claim.

## Return and stop

Return `docs/UI_POLISH_12B.md`, concise PROJECT_STATE/TESTING updates, changed-file hashes, build, actual commands/exits, before/after paths and short explanation of concrete improvements/gaps. Update DESIGN.md only for final UI decisions if necessary. Stop READY_FOR_REVIEW. No deploy, paid model calls, provider-setting changes, broad cleanup or next task. PM then reviews user live voice findings and remaining recovery/storage/security/release gates.
