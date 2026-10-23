# 12B redesign direction — user references, 22 October 2026

User rejects the existing debugging-interface appearance and does not want a ChatGPT clone. Preferred reference is [ElevenLabs voice-chat-01](https://ui.elevenlabs.io/blocks/agents#voice-chat-01). PM inspected its rendered browser preview: compact identity/status header, large conversation region, restrained empty state, bottom message input with send/voice actions. The preview shown was dark. Use this composition; theme is our design choice, not proof the user requested dark-only.

## Committed direction

A source-focused conversation workspace: compact product/source header, generous transcript, anchored composer, compact voice control surface. On arrival, offer PDF upload or YouTube URL in one concise import surface. After import, collapse source controls into the header; Preview opens a side sheet on desktop and a near-full-screen drawer on mobile. Keep the source's identity visible. No history sidebar, accounts, model picker, marketing hero or developer-status column.

Use warm neutral surfaces, charcoal text and one restrained blue accent for active interaction; readable sans-serif body and comfortable16px message text. Distinguish user messages with a subtle surface, assistant responses through spacing and typography. Use the product name and a small source/speech motif for identity, not another branded chatbot avatar. No gradient wallpaper, glass cards, decorative dashboard widgets or giant animated orb. Voice may have a small state indicator with reduced-motion support; do not fabricate audio activity. Technical success details recede; errors, incomplete answers and microphone/playback actions remain visible.

This is a deliberate proposal chosen from the references, not an assertion that every reference uses these exact tokens. Final actual tokens and layout belong in DESIGN.md. Existing paper/green/serif and equal source/conversation columns are no longer binding.

## Component choices and integration constraints

| Reference | Selection |
|---|---|
| [assistant-ui Thread](https://www.assistant-ui.com/elements/thread) | Use message spacing, streaming and scroll affordances as reference. Full Thread requires AssistantRuntimeProvider and has no standalone form; do not replace our tested runtime to get its appearance. |
| [Composer](https://www.assistant-ui.com/elements/composer) | Prefer standalone props-driven presentation if dependencies fit; otherwise adapt its layout with existing textarea/actions. Keep draft/send/stop behavior in current controllers. No model menu or per-message multi-file attachments. |
| [Voice Conversation](https://www.assistant-ui.com/elements/voice-conversation) | Standalone presentation is a candidate for compact listening/speaking/mute/end controls wired to existing state. Keep complete transcript accessible; do not adopt its separate voice runtime. |
| [Attachments](https://www.assistant-ui.com/elements/composer-attachments) | Borrow compact source-file treatment for the one active source; not message attachments or a multi-document system. |
| [Empty State](https://www.assistant-ui.com/elements/empty-state) / [Error State](https://www.assistant-ui.com/elements/error-state) | Short source-specific invitation and actionable retry, fitted to real states. No invented capabilities or generated starter-question requests. |
| [shadcn Input](https://ui.shadcn.com/docs/components/base/input), [Item](https://ui.shadcn.com/docs/components/base/item) | URL entry and compact source title/type/action row. Item alone is not a dropdown-menu implementation; use an accessible menu primitive or existing disclosure for Replace/Remove. |
| [Sheet](https://ui.shadcn.com/docs/components/base/sheet) / [Drawer](https://ui.shadcn.com/docs/components/base/drawer) | Responsive source preview pattern with focus management, Escape/Close, scroll and focus restoration. |
| [Amidarh](https://dribbble.com/shots/25693832-Amidarh-Conversational-AI-Assistant) | Secondary reference only; user dislikes its generic-AI appearance. Do not copy its branding/assets. |

ElevenLabs is the visual/interaction reference, not a switch to its provider SDK. This repository currently uses ordinary CSS and existing controllers: do not blindly run whole-kit installers or introduce Tailwind/runtime migrations. Inspect source/license/dependencies before copying code; record attribution and justify each new primitive dependency. Recreating the selected layout with existing React components is acceptable. Prefer a small compatible presentational dependency only when it reduces implementation risk. No external font dependency required to run/build; use licensed/local fonts.

## User-requested skill and design reference

Taste skill was absent locally; PM located upstream `design-taste-frontend` (tasteskill v2). Use it as sole design authority for this task, replacing Impeccable, per explicit user instruction. It supports app screens: read its app-screen path, not landing-page workflow. Upstream pinned revision `6010f91a9935f1c167dfc500fb1a475681892e6b`:

- [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/6010f91a9935f1c167dfc500fb1a475681892e6b/skills/taste-skill/SKILL.md)
- [App-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/6010f91a9935f1c167dfc500fb1a475681892e6b/skills/taste-skill/references/app-screens.md)

Read referenced resources as needed; any skill-script setup must be isolated, inspectable and not alter app runtime. User-selected ElevenLabs composition takes precedence over random style draws or unrelated dashboard/chart rules. No broad reference search, marketing assets or scoring loop required by this PM brief. Preserve the user's chosen product scope.

Use [Awesome Design's ElevenLabs DESIGN.md](https://github.com/voltagent/awesome-design-md/blob/3b605329240ce735b510037cca322f1831fdd7f8/design-md/elevenlabs/DESIGN.md) as reference-only for restrained typography, spacing and surfaces. This is a third-party analysis, largely of marketing pages, not official ElevenLabs app specifications. Do not copy its entire theme, licensed fonts or unsupported font/licensing assertions into our app. Pin `3b605329240ce735b510037cca322f1831fdd7f8`. No Figma connection required; Figma becomes useful only if the user wants to author an exact mockup themselves.
