# Product References for Talk to a Document

Competitor research and design decisions for a three day build

Use NotebookLM and Acrobat as references for spoken interaction, ChatPDF for immediate PDF and YouTube entry, and Recall for keeping source context visible. Borrow a small set of interaction patterns while keeping our product focused on one source, one conversation, and a reliable mobile web experience.

This collection compares six existing products against the assessment and records what to adopt, what creates a poor fit for our deadline, and which public pages contain useful interface references. Product capabilities are based on first-party product and help documentation; design recommendations are our interpretation. No hands-on reliability, accuracy or speed comparison is claimed.

Research date 17 October 2026 in Toronto. Current Google pages use Gemini Notebook for the product previously called NotebookLM. Unverified in the comparison means a capability is not established in the reviewed public documentation; it does not claim the product lacks that capability. The companion implementation plan defines the three day schedule and technical quality gates.

## 1 Product fit at a glance

| Product | PDF | YouTube | Live voice evidence | Best reference |
| --- | --- | --- | --- | --- |
| NotebookLM or Gemini Notebook | Yes | Yes | Documented mobile live chat with interruption | Source-focused voice and transcript continuity [G1-G3] |
| Adobe Acrobat AI Assistant | Yes | Unverified | Documented interruptible mobile voice | Clear microphone, playback and session controls [A1-A2] |
| ChatPDF | Yes | Yes | Unverified | Immediate input, source inspection and video timestamps [C1-C2] |
| NoteGPT | Yes | Yes | Generated podcast documented | Clear source choices and extracted-text access [N1-N3] |
| Recall | Yes | Yes | Read-aloud documented | One-source chat, source Reader and context visibility [R1-R3] |
| AskYourPDF | Yes | Unverified | Generated podcast documented | Upload-to-chat flow and source verification [Y1-Y2] |

A video transcript, a live conversation transcript, recorded speech transcription, generated podcasts and interruptible voice chat are different capabilities. Only the last one satisfies the core spoken-conversation behavior in our assessment. We should compare behavior without inferring a competitor's model or transport architecture.

## 2 Product analysis

### NotebookLM and Gemini Notebook

Documented overlap: PDF and public captioned YouTube imports feed source-based chat. The current help also describes mobile Live Voice Chat with interruption, mic/end controls and a chat transcript. [G1] [G2]

What works well as a reference: the source and the answer remain visibly connected. Spoken interaction can return to readable text, so listening is not the only way to follow the conversation. This is the closest overall reference for our intended workflow.

Limitations relevant to our build: the documented live feature is in the mobile app for adults; rollout and plan availability are qualified in the launch announcement. Caption import uses a video's spoken transcript rather than its visual content. Its broader notebook and creation surfaces are more than this assignment needs. [G1-G3]

Apply: keep the active source visible, connect voice and transcript in one conversation view, and make microphone/end controls obvious. Our assessment needs these behaviors in the browser. Do not add notebook management, a generated host discussion or a studio of output tools as prerequisites for asking a question.

### Adobe Acrobat AI Assistant

Documented overlap: Acrobat's mobile guide explicitly allows users to speak while an answer is playing. It shows separate microphone, playback and close controls. Its text guide shows questions, suggestions and references to document content. [A1] [A2]

What works well as a reference: the control labels distinguish listening from audio playback. A user can understand which part of the experience will change before tapping. Suggested questions also make the first interaction easier.

Limitations relevant to our build: the reviewed AI Assistant material does not establish a YouTube ingestion path or the exact timing of both speakers' live partial transcripts. Account and content requirements apply. These are evidence limits and workflow differences, not reports of product failure. [A1-A3]

Apply: borrow explicit labels and persistent access to the text conversation. Define our Stop or End action as closing the session and releasing the microphone. Adobe's Stop pauses playback, so copying the label without matching behavior would be confusing. Keep a separate mute control.

### ChatPDF

Documented overlap: the product offers PDF chat and a YouTube chat page. It presents a direct upload or paste entry, source-linked PDF answers, and a video transcript with timestamp navigation and suggested questions. Core use can begin before creating an account. [C1] [C2]

What works well as a reference: the first useful action is obvious. Source inspection stays close to the answer, and timestamps make video text easier to verify. This is the strongest reference for our initial input and preview workflow.

Limitations relevant to our build: the reviewed pages do not establish live voice. Its interactive YouTube transcript is the source transcript, not evidence of a live voice-conversation log. A desktop side-by-side layout would need a deliberate mobile adaptation rather than two narrow columns. [C1] [C2]

Apply: offer PDF and YouTube inputs together, then one ready source with a clear Start Voice Chat action. Use Source and Conversation views on the phone. Retain timestamp links already supplied by ingestion; automatic answer citations and a complete PDF annotation viewer can wait.

### NoteGPT

Documented overlap: dedicated PDF and YouTube entry pages expose extraction, preview, summaries and chat-related tools. Its separate audio generator creates a podcast from a script and chosen voices. That does not establish live, interruptible question answering. [N1-N3]

What works well as a reference: source choices are recognizable, and extracted text is useful in its own right. The product does not force every source into an identical-looking input form.

What is weaker: the PDF page displays a 50 MB file limit near upload and 30 MB in its FAQ. The actual enforced limit was not tested, but the conflicting copy is visible in the reference. Its many adjacent tools also create a poor scope model for our short build. [N1]

Apply: keep the two input choices and inspectable text. Use one authoritative 25 MB definition and consistent client/server messaging. Avoid adding summarize, translate, make slides, generate a podcast and create flashcards as competing primary actions.

### Recall

Documented overlap: Recall accepts PDFs and YouTube. It distinguishes a single-card conversation from global knowledge-base chat, retains a Reader view, and documents source references, video timestamps and suggested follow-ups. Its extension audio example is read-aloud. [R1-R3]

What works well as a reference: the user can see what the conversation is about and return to the original material. Its focused card-level chat is particularly relevant to our one-source decision.

Limitations relevant to our build: global context selection, a knowledge graph, model choices and saved-library workflows answer a larger product problem. Copying those controls would consume time and make a single-source interface harder to understand. Live interruptible voice was not established by the reviewed material. [R1-R3]

Apply: show a persistent Using source label, a quick Source view and two or three starter prompts. Do not add a source scope selector for web versus library, since our assistant should answer from the selected source and acknowledge missing information.

### AskYourPDF

Documented overlap: the PDF chat flow supports questions, follow-ups and clickable references to pages. Its separate podcast tool describes document-to-script-to-speech generation. The reviewed pages do not establish native YouTube ingestion or live interruption. [Y1] [Y2]

What works well as a reference: the upload-to-question sequence is short, and page references give users a concrete verification action instead of asking them to trust an isolated answer.

Limitations relevant to our build: generated audio is an asynchronous output, so it cannot stand in for the required Realtime conversation. Website agents, saved knowledge bases and broad model choices also add product surfaces with little value to this deadline.

Apply: make source text accessible and keep a clear path from upload to question. Preserve page metadata now so future source navigation is possible, but only display answer citations if their mapping is validated. Avoid absolute accuracy promises.

## 3 Decisions to apply in our interface

| Pattern | Our implementation | Priority |
| --- | --- | --- |
| Immediate source entry | Two clear choices: Upload PDF and YouTube link. No account, model or workspace selection first. | Build |
| One visible source | Show title or filename, type, language when known and extraction readiness. Keep an Inspect text action. | Build |
| Mobile source access | Conversation and Source views, with controls remaining reachable. Side-by-side display only when width supports it. | Build |
| Starter questions | Two or three fixed prompts reduce the blank-chat problem without another generation request. | Build |
| Voice strip | Plain status text, microphone state, Mute and End. A small visual meter is optional and must reflect real state. | Build |
| Text access | A visible text option before microphone permission, plus recovery after denial. | Build |
| Original locations | Keep page boundaries and timestamped segments. Basic timestamp links are useful when already available. | Optional |
| Automatic citations | Only add after validating source mapping. Do not fabricate page or timestamp references. | Optional |
| Large product surfaces | No notebook library, knowledge graph, account onboarding, podcast generation or multi-source search. | Defer |

The intended first-use sequence is choose a source, inspect the result, then speak or type. Keep extraction visible and avoid a mandatory generated-summary delay. A summary can be one of the user's questions after the conversation starts.

The voice experience should remain the visual priority. A decorative animated orb cannot replace clear states, transcript readability or correct interruption. Spend the final polish time on touch controls, keyboard behavior, scrolling and accurate recovery messages.

## 4 States that need deliberate design

| State | User-facing behavior |
| --- | --- |
| Empty | Show both source actions, accepted PDF size and a short explanation of captioned YouTube support. |
| Importing | Show the actual stage and a way to cancel or replace input. Do not invent percentage progress. |
| Source ready | Show source details and extracted text. Enable Start Voice Chat and the text-mode option. |
| Connecting | Show microphone permission or connection work. Offer text mode on denial. Accept questions only after source context is loaded. |
| Live | Keep listening/responding/muted states distinct, transcript readable, and mute/end reachable. |
| Interrupted | Stop the old response appropriately and mark its turn honestly while accepting the follow-up. |
| Connection problem | Preserve the selected source where possible. Retry starts a clearly indicated fresh conversation when seamless recovery is not implemented. |
| Unsupported source | Explain the specific problem and return to editable input without losing control of the interface. |

Competitor public pages do not establish how each product behaves during our exact microphone-denial and network-loss scenarios. Our assessment evidence therefore needs real checks of those states on our own deployed application.

## 5 Reference pages and what to inspect

These links are the reference collection. Prefer the linked public pages over fragile direct image URLs. Adobe's help pages, ChatPDF's product pages and Google's announcement include useful interface illustrations; inspect those in their original context.

### NotebookLM and Gemini Notebook

[G1] [Source import rules including PDF and YouTube captions](https://support.google.com/gemininotebook/answer/16215270?hl=en)

[G2] [Chat and Live Voice Chat controls with transcript behavior](https://support.google.com/notebooklm/answer/16179559?hl=en)

[G3] [September 2026 launch visuals and voice rollout details](https://blog.google/innovation-and-ai/products/gemini-notebook/new-study-tools-september-2026/)

### Adobe Acrobat AI Assistant

[A1] [Mobile voice controls and Android and iOS interface examples](https://helpx.adobe.com/acrobat/mobile/acrobat-ai/voice-commands.html)

[A2] [Typed questions suggestions and source references](https://helpx.adobe.com/acrobat/mobile/acrobat-ai/ask-questions.html)

[A3] [Account and content requirements](https://helpx.adobe.com/acrobat/desktop/use-acrobat-ai/get-started-with-generative-ai/ai-tech-requirements.html)

### ChatPDF

[C1] [PDF entry source citations and document alongside chat](https://www.chatpdf.com/)

[C2] [YouTube entry preview interactive transcript and timestamps](https://www.chatpdf.com/youtube)

### NoteGPT

[N1] [PDF input text extraction and preview](https://notegpt.io/pdf-summary)

[N2] [YouTube input and transcript-based workflow](https://notegpt.io/youtube-video-summarizer)

[N3] [Generated podcast workflow and voice choices](https://notegpt.io/ai-podcast-generator)

### Recall

[R1] [Single-source chat visible context and follow-up suggestions](https://docs.recall.it/deep-dives/chat/overview)

[R2] [Supported PDF and YouTube content](https://docs.recall.it/supported-content/all-supported-content)

[R3] [Reader view source transcript and read-aloud examples](https://docs.recall.it/use-cases/workflow/ai-extension)

### AskYourPDF

[Y1] [PDF questions follow-ups and page references](https://askyourpdf.com/chat-with-pdf)

[Y2] [Generated podcast pipeline](https://askyourpdf.com/podcast-generation)
