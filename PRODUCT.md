# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, React and TypeScript; pinned Node 24.22.0/npm 11.19.1; Prisma/PostgreSQL; Render hosting. Original Step 01–14 sequencing remains in [the plan](docs/IMPLEMENTATION_PLAN.md).

## Product Purpose

Help a visitor explore one PDF or YouTube caption source through source inspection, live WebRTC voice and microphone-free text. These flows are implemented. Both conversation modes use the larger gpt-realtime-2.1 default. Final current-candidate hosted/phone evidence remains separate from local verification.

## Users and operating context

Assessment reviewers use desktop and mobile browsers. The accepted cloud exception demonstrates YouTube in the local application; hosted YouTube acquisition remains disabled after blocked upstream requests. Physical phone audio and keyboard checks follow final deployment.

## Capabilities and constraints

One source and one active conversation in the workspace; anonymous one-hour visitor ownership/expiry, full extracted source context, bounded inputs and provider context rejection. No accounts, embeddings, vector database, OCR, video audio transcription or permanent chat history. Switching mode/source clears conversation state. Starting again retains unsent text drafts without automatic resend. Answers can be wrong; citations and perfect summaries are not requirements.

## Accessibility and recovery

Light/dark themes, keyboard focus and source dialogs, reachable mobile controls, explicit status/error recovery, independent microphone/speaker mute and blocked-playback recovery. Browser emulation does not prove physical audio, interruption or native keyboard behavior.

## Evidence on hand

[13C](docs/RELEASE_CANDIDATE_13C.md) is the current clean-export release review. [Project state](docs/PROJECT_STATE.md) preserves historical hosted PDF, local real-source reports, synthetic checks and semantic failures. Cleanup code exists; disposable PostgreSQL/races, production operation, final hosted paths, physical phone and public submission access remain explicit gates. No release completion is inferred from scaffold or test counts.
