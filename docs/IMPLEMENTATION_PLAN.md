# Talk to a Document and YouTube Project Plan

Three day implementation roadmap targeting exceptional quality

Build a polished mobile web application that accepts one PDF or YouTube video at a time, displays its extracted text, and supports a live, interruptible voice conversation with a genuine text fallback. Working deployed YouTube ingestion is now a completion target alongside deployed PDF ingestion. Include a verified local caption-extraction backup and a direct deployed extraction trial with no transcript-service fee.

Target the assessment's highest rubric level in all four areas from the start. Work items retain their original IDs, but the schedule, deployed YouTube strategy, storage, context experiments, and quality gates below replace the earlier seven day plan. A high score depends on evidence of execution, rather than the number of features or services.

Plan revised 17 October 2026 in Toronto. Aim for a reviewable application within 36 to 48 elapsed hours, and finish testing, README, and the 10 to 15 minute walkthrough within 72 hours. Starting Saturday evening 17 October makes Monday 19 October the preferred demo target and Tuesday evening 20 October the outer target. These are planning targets; implementation checks remain pending.

## 1 Requirements and scope

The assessment establishes required behavior and a four-level grading rubric. Our target is level 4 in each category, plus the deployed YouTube bonus. Also verify a genuine local YouTube fallback under the brief's exception. Local success satisfies that contingency; it does not by itself prove the deployed target. [1, pp. 1-5]

| Requirement | Acceptance check | Steps |
| --- | --- | --- |
| PDF upload | A PDF up to 25 MB reaches the deployed backend and yields its full extractable text. | 04, 13 |
| YouTube URL | The public deployment retrieves real captions for several captioned videos through the configured provider chain. | 03, 06 |
| Local caption backup | The local application retrieves uncached captions with managed transcript providers disabled and supports a source-grounded question. | 03, 07, 13 |
| Free direct deployment trial | Test direct extraction on the actual host without transcript-provider credentials; record verified success or the exact blocker separately from managed results. | 03, 06 |
| Source preview | The user can inspect extracted text in a collapsible or preview area. | 05 |
| Source context | The active source reaches the Realtime conversation before questions are accepted. | 07 |
| Live voice | Start Voice Chat opens a real session; spoken questions receive spoken answers. | 02, 08 |
| Required transport | Voice uses OpenAI Realtime and WebRTC. | 02, 08 |
| Conversation transcript | User and assistant text appears while the conversation is in progress. | 09 |
| No microphone | A user can ask typed questions and receive real text answers without microphone permission. | 10 |
| Session controls | Start, Stop, and Mute have clear labels and accurate behavior. | 08 |
| Mobile layout | Source entry, preview, transcript, and controls remain usable at roughly 390 px width. | 05, 12 |
| Connection feedback | Connecting, ready, speaking, ended, and recoverable errors are visibly distinct. | 08, 11 |
| Interruption and follow-up | On mobile, interrupt an answer and continue with a relevant follow-up. | 08, 13 |
| Poor network | A degraded or lost connection yields understandable feedback and a usable recovery action. | 11, 13 |
| Credential security | The ordinary OpenAI key stays server-side; the backend issues ephemeral credentials. | 01, 02, 11 |
| Public application | The public HTTPS app supports PDF and YouTube import and the full mobile conversation workflow. | 01, 04, 13 |
| Public repository | Source is modular and typed; dependencies, environment setup, and appropriate tests are included. | 01, 13, 14 |
| README | A fresh developer can run the app and understand architecture and trade-offs. | 14 |
| Walkthrough | A 10-15 minute video shows the workflow and explains implementation choices and tools. | 14 |
| AI disclosure | Briefly identify where and how AI-assisted tools helped. | 14 |

### Scope and quality targets

Both deployed source paths belong in the delivery target. Demonstrate actual external transcript retrieval, including a new video or a cleared application cache, and explain the provider architecture in the README. A preloaded transcript alone is insufficient evidence of the new goal. [1, pp. 1-2]

Keep one active source and one active conversation. Embeddings and a vector database are excluded for this version. Preserve source structure, tune the voice prompt, and test full-context performance first. Chunk organization and keyword-based retrieval remain possible engineering choices if a measured context or accuracy problem justifies them.

Accounts and OAuth are deferred following the latest scope decision. Anonymous visitor sessions own temporary sources; account-based recovery, persistent conversation history and cross-document search can be reconsidered only if needed. Keep the current conversation in browser state, without saving every turn. Embeddings and a vector database remain excluded. Payments, OCR, native apps and generated podcasts are also outside this three day build. Image-only and encrypted PDFs need accurate detection and useful next steps. PostgreSQL retains bounded temporary source records and public-caption cache entries.

### Evidence for the exceptional rubric level

| Rubric area | Evidence we intend to demonstrate |
| --- | --- |
| Product polish | Usable 390 px flow; clear import, readiness and connection states; live transcript; reliable interruption, follow-up, mute, stop and retry; real phone audio; text mode after microphone denial. |
| Ingestion quality | Full extractable text from deployed PDFs up to 25 MB; deployed captions on varied real videos; timestamps and page boundaries retained where available; useful corrupt, empty, unavailable, quota and timeout errors. |
| Code quality | Typed source and event contracts; small replaceable adapters; secrets only on the server; focused failure and lifecycle tests; reproducible setup, migrations, and a concise decision record. |
| System design | Clear UI, ingestion, context and session boundaries; shared PostgreSQL source state; visitor isolation; bounded uploads, storage, concurrency and retries; explicit context strategy and measured limits. |

The rubric uses scores 1 to 4 without percentage weights. These checks are our evidence for the highest level, not a promise about the evaluator's final score. Scalable architecture can be one application with shared storage and clear boundaries; microservices are unnecessary for this workload. [1, pp. 4-5]

## 2 Architecture and researched decisions

### Recommended stack

| Layer | Proposed choice | Reason |
| --- | --- | --- |
| Application | Next.js App Router, React, TypeScript | One deployable codebase with typed client and server boundaries. |
| Runtime | Pinned Node 24 and compatible released packages | Verify build, parsing, and database compatibility before committing to versions. |
| PDF | pdf-parse adapter; pdfjs-dist fallback | Server-side extraction with page metadata where available. |
| YouTube | Direct Node extractor plus Supadata and ScrapeCreators adapters | A fee-free direct trial, managed deployment fallback, and a verified local backup. |
| Voice | OpenAI Realtime through browser WebRTC | Live microphone input, spoken output and interruption. |
| Text | Realtime WebSocket with an ephemeral credential | A path that never needs microphone access. |
| Data | Managed PostgreSQL on Render with Prisma | Durable shared source state; familiar typed schema and migrations. |
| Hosting | Render Node web service in the database region | Straightforward Node deployment and shared database connectivity. |
| Context | Structured full source, then measured improvements | No embeddings or vector database; retain original text and locators. |

### Hosting and the 25 MB upload

Vercel Functions have a 4.5 MB request and response body limit. Next.js Server Actions separately default to a 1 MB request limit. Raising the Next.js limit does not remove the hosting limit. A direct multipart PDF upload to a Node-runtime Route Handler on a Node service is the proposed path. Vercel remains possible with direct object-storage uploads, but that adds storage and cleanup work. [2] [3]

Render documents full Next.js deployment as a Node web service. Its documentation does not establish a guaranteed 25 MB upload allowance for this plan, so a deployed boundary-size upload remains an early acceptance gate. Its free services sleep after 15 minutes without inbound traffic and take about a minute to wake. Prefer a service configuration that remains available for review if the budget allows; otherwise document the cold start. [4] [5]

### PDF and YouTube adapters

The current pdf-parse project documents the PDFParse class, getText(), cleanup with destroy(), and Node 24 support. Its troubleshooting guide covers Next.js worker and bundling problems. Pin a released version only after a production-build extraction succeeds; a successful standalone script is insufficient evidence. [6] [7]

Add a direct Node adapter using youtube-transcript-plus. Its documented API returns caption segments, supports cancellation and language selection, and uses unofficial YouTube endpoints. Reuse this adapter locally and on Render; pin a published release after it passes extraction and production-build checks. This route has no transcript-service charge, while hosting and voice usage remain separate costs. [29]

Cloud success is unproven. Upstream youtube-transcript-api documentation warns that cloud-provider IPs are often blocked; unofficial extraction can also break when YouTube changes. Test the same videos on the actual Render service, with managed providers disabled and all application/extractor caches bypassed. Allow 30 to 45 minutes for this deployment trial after the adapter exists. If blocked, record the result and keep the managed route; the fee-free deployed goal remains unproven. [29] [30]

Use validated cache results first. Enable direct extraction ahead of Supadata and ScrapeCreators only after the hosted proof passes; otherwise use the managed chain. Give direct requests an initial 8 to 10 second total budget, cancellation and zero automatic retries. A block or repeated failure disables direct attempts for a cooldown. Keep one total import deadline across all fallback attempts. These timings are engineering starting points to measure.

The linked jaypaun007/youtube-transcript-api repository describes a separate hosted FastAPI service; its visible main branch contains a README and license, not the service implementation. Its README advertises a free hosted endpoint with a five-request-per-minute IP limit. The PyPI package instead points to jdepoix/youtube-transcript-api as its upstream. Use that canonical Python package for a reserve, not the similarly named hosted service. No live request to the linked hosted endpoint was made during planning. [36] [37]

The local fallback is a separate run of the complete application on the developer's computer. Force direct mode, disable managed transcript providers and bypass caches. Import two public captioned videos, check beginning and end content, then ask a source-grounded question. Record setup commands, package versions and observed results. If the Node local proof fails, try a small youtube-transcript-api wrapper; caption-only yt-dlp is a further reserve. A saved fixture or a script that never reaches the application does not satisfy this checkpoint. [30] [31]

Keep reserve tools inside the local backend using validated video IDs, argument arrays, bounded subprocesses and normalized results. yt-dlp supports subtitle-only operation; its current YouTube setup may require EJS and an external JavaScript runtime. PO-token requirements are separate. Do not add audio transcription, cookie exports, token-generation infrastructure or proxy services to this timebox. The official YouTube caption-download API requires video edit permission, so Google OAuth would not grant arbitrary public-caption access. [9] [31] [32] [35]

Retain Supadata and ScrapeCreators as managed caption providers. For Supadata set mode=native and text=false to request existing captions with segment timing; auto mode may generate a transcript. These services have not been live-tested during planning. Step 03 proves a real deployed request. [19] [21]

Normalize providers into one source contract and validate contents as well as status. Direct Node segments use seconds; Supadata timing uses milliseconds, so convert deliberately and test the resulting timestamps. HTTP 206 can mean no transcript; HTTP 202 can return a pending jobId. Poll pending work within a deadline, support cancellation, and never resubmit an existing job. Empty captions and malformed timestamps fail validation. [19] [20] [21] [29]

On Supadata 429, inspect the error details: back off for rate limiting, but do not retry exhausted quota. Apply the provider allowance across transcript, metadata and polling calls. Retry transient failures only within a total request budget, then try the configured alternative when appropriate. [28]

Start with published free allowances for feasibility. Supadata lists 100 credits per month and one request per second; Pro is US$17 monthly. Its US$5 headline applies to a US$60 annual commitment. ScrapeCreators advertises 100 free credits and a US$47 prepaid pack with 25,000 credits. Confirm prices before purchase. Disable automatic top-ups initially and limit public usage. [22] [23]

### Database choice and deployment behavior

SQLite can serve a hosted application; its own guidance includes low and medium traffic websites. The issue is whether local-disk lifetime and concurrent writes fit the deployment. Render disks bind a service to one instance, while managed PostgreSQL provides shared state independently of application restarts. Choose PostgreSQL for durable sources, provider caching and future multiple instances with a small schema. This preference is not a requirement imposed by public hosting. [24] [26] [27]

### Anonymous access and API authentication

An application account is not required for the server-owned Realtime API flow. The backend authenticates to OpenAI with its ordinary API key; the browser receives a temporary client secret. Our anonymous cookie identifies possession of a visitor session for source access, not a verified person. Google or GitHub login can be added later without changing the provider adapter. OpenAI guidance explicitly accommodates previews for users who are not logged in. [10] [34]

On Start, obtain microphone permission first where practical, validate the visitor's source and expiry, apply admission limits, then mint a fresh credential. Use POST with origin/CSRF checks, visitor/IP and global issuance limits, and Cache-Control no-store. Keep credentials out of URLs, logs and persistent browser storage. Add a non-secret safety identifier derived from the visitor session to the server mint request, never the cookie bearer value. [10] [34]

Set an explicit short client-secret TTL, initially 60 seconds, and verify enough connection time on mobile. Expiry prevents new sessions but does not end an active session; a secret can create multiple sessions before expiry, and attached session settings can be overridden by the client. It is not a single-use, source-bound credential or a hard spending cap. Pair issuance controls with provider usage monitoring and available project controls. Cookie loss or another device does not restore ownership without a future account mechanism. [33]

### Realtime connection and model

The documented ephemeral flow is backend POST /v1/realtime/client_secrets, followed by the browser's authenticated SDP POST to /v1/realtime/calls. The ordinary key stays on the server; the short-lived credential is intended for the browser. Mint it when starting, do not cache or log it, and request a fresh one after a failed or expired connection attempt. [10]

Current official WebRTC examples use gpt-realtime-2.1. Its model page lists a 128,000-token context window. Keep the model configurable and confirm access in the user's API project in Step 02. This plan does not assume that older beta examples or the original model's context limits still apply. [10] [11]

For voice, output_modalities ['audio'] includes the assistant transcript. For text mode use ['text']; the current schema does not allow requesting both values together. Enable input transcription explicitly because it defaults to off. It runs asynchronously. Automatic truncation can discard old messages; use an explicit source/history budget and controlled handling when it is exhausted. Ephemeral expiry prevents new connections and does not end an active session. [12]

WebRTC with voice activity detection supports interruption and automatic removal of unheard audio from conversation context. Browser WebSockets with ephemeral credentials are documented too. Use them only for the proposed text fallback; the required voice path stays on WebRTC. [13] [14]

### Context structure and prompt experiments without embeddings

Keep trusted application instructions separate from source content. Preserve page, paragraph, or timestamp sections with stable IDs. Start with all supported source text in the session, organized by those sections, and wait for its acceptance before enabling questions. Use brief spoken responses, resolve follow-ups from conversation context, distinguish source facts from inference, acknowledge absent information, and treat instructions inside the source as quoted material. [13]

Splitting text into labeled sections improves organization but does not reduce total tokens when every section is sent. Upload capacity, model context, and message transport are separate limits. Budget source, instructions, conversation and output; if a WebRTC event is too large, send ordered complete conversation.item.create events containing lossless input_text pieces. Never split a JSON event across sends and assume server reassembly. [11] [13] [15]

Do not silently discard text. Use truncation='disabled' and explicit session-limit recovery. Hold the behavior prompt constant when comparing plain and structured full text. Only experiment with a short section index and lexical retrieval if testing exposes a capacity, accuracy or latency problem. PostgreSQL full-text search can rank passages without embeddings, but production retrieval also requires a Realtime tool-call/result path, authorization, pending-response handling and grounding tests. A 60 to 90 minute experiment assesses feasibility; it does not guarantee completion. Retain full source loading with an explicit limit if the experiment fails. [12] [25]

### Runtime boundaries and data lifetime

The browser owns source-entry UI, text preview, connection state, transcript rendering, and microphone/audio resources. The backend owns input validation, extraction, temporary source records, source-access checks, and ephemeral-token issuance. Audio travels directly between the browser and OpenAI. Both ingestion adapters return the same source shape so the conversation UI does not depend on the source type.

| Proposed route | Responsibility |
| --- | --- |
| POST /api/sources/pdf | Accept multipart upload, validate, extract, and return source metadata plus preview text. |
| POST /api/sources/youtube | Validate a YouTube URL, retrieve captions server-side, and return the same source shape. |
| GET /api/sources/{id} | Return a complete source only when its visitor owns it and it has not expired; support source restoration after refresh. |
| POST /api/realtime/token | Check the source and anonymous session, select voice or text configuration, and mint a credential. |
| DELETE /api/sources/{id} | Clear a source when replaced or explicitly removed. |
| GET /api/health | Expose a small readiness response for deployment checks. |

Proposed shared types are Source, IngestionError, SessionState, and ConversationTurn. Source carries an opaque ID, kind, display name, full normalized text, counts, optional page/language metadata, warnings, expiry, and context eligibility. Turns have stable IDs and draft, final, interrupted, or failed status. Do not render extracted content as executable HTML.

Use a Source table with an opaque ID, owner-session hash, kind, canonical origin, title, full text, section JSON, language, provider, extraction status, optional provider job ID, counts and expiry. The server creates a high-entropy visitor token in an HttpOnly, Secure, SameSite cookie and stores only its hash. Check ownership and expiry on source reads, deletion, credential issuance and any search tool. Never accept an owner hash supplied by the browser. A client may retain only the last opaque source ID to restore the source; restoring an OpenAI conversation is a separate problem.

Use a TranscriptCache table for validated public YouTube caption data only. A unique video/language-preference/mode key supports upsert and expiry; retain actual selected language and provider metadata. A cache hit creates the requesting visitor's own Source record, never exposes someone else's source ID. Run one app instance in this build, with process-level deduplication and throttling. Multiple instances would need coordinated limits and deduplication; PostgreSQL durability alone does not provide them. Do not retain raw microphone audio or write every transcript delta to the database.

Microphone capture requires a secure context and user permission. Use the HTTPS deployment for phone tests; an ordinary HTTP LAN address is not equivalent to localhost. Handle audio playback rejection with a user-initiated play action. [16] [17]

## 3 Sequential implementation steps

The initial planning snapshot had all implementation steps pending. The local bootstrap now covers part of Step 01; consult `PROJECT_STATE.md` for current status and `BOOTSTRAP.md` for version decisions and evidence. Work through these numbered checkpoints one at a time; a completed item needs a short note naming the build, evidence and remaining limitation. Tests and deployment checks begin with each feature, while Step 13 consolidates the final review. The three day schedule groups these work items into deliverable milestones.

### Step 01 — Project foundation and HTTPS deployment

**Depends on:** None  
**Initial status:** PENDING — reconcile with the actual repository.

Create a reproducible application and a deployment target.

- Initialize one Next.js App Router project with React and TypeScript, a lockfile, pinned compatible runtime, lint/type checks and environment validation.
- Create the managed PostgreSQL connection, minimal Source and TranscriptCache schema, migrations, and backend-only access. Keep permanent keys and connection strings out of browser code and repository history.
- Deploy a minimal Node service over HTTPS in the database region. Confirm available OpenAI and transcript-provider credentials, hosting configuration and a physical phone. Keep the first foundation block around 90 minutes.
- Reconcile the repository handoff and install only selected project skills needed for the immediate work. Record actual tool versions and commands. Skill setup is part of the foundation timebox; do not replace existing AGENTS.md or an established APM tracker.

**Done when:** A clean production build and migration succeed, the public shell opens on a phone, a server-written source record survives a service restart, and no permanent credential reaches the client.

**Output:** Repository, HTTPS shell, database migration, environment example, and recorded account/deployment access.

### Step 02 — Prove the Realtime voice connection

**Depends on:** 01  
**Initial status:** PENDING — reconcile with the actual repository.

Resolve audio, authentication, and browser feasibility before building the full interface.

- Add the anonymous visitor session, protected backend ephemeral-token route and minimal WebRTC client using a tiny fixed source. Check visitor ownership and admission limits; mint after microphone permission, return no-store and use an explicit short TTL.
- Connect the microphone, play model audio, and capture actual session/transcript events for inspection. Include basic Stop cleanup and bounded connection errors immediately.
- Check a spoken question on a physical phone where available. Also make a small text-only connection check so microphone fallback has a verified path.

**Done when:** A real question receives a real spoken answer without signup or OAuth, stopping releases the microphone, and only an ephemeral credential reaches the browser. Missing or unauthorized source requests fail.

**Output:** A working voice proof with the tested model, browser, and API events recorded. This is not yet the finished chat UI.

### Step 03 — Prove deployed and local YouTube retrieval

**Depends on:** 01  
**Initial status:** PENDING — reconcile with the actual repository.

Prove local and deployed captions, and test the free direct route.

- Add the small direct Node adapter. Run the local application ingestion path with managed providers disabled and caches bypassed; import two public captioned videos, preferably manual and automatic, and inspect beginning/end text. If it fails, use the bounded local Python or caption-only yt-dlp reserve. Complete the full-app grounded-question check in Step 07 once source context is connected.
- Try that adapter from Render in forced direct mode, with no managed provider credentials and no cached transcript. Timebox this deployment experiment to 30 to 45 minutes. Record relevant text, language, timestamp units, URLs, package version and failures.
- Prove deployed Supadata native captions on the same fixtures. Timebox the first managed check to 45 to 60 minutes, then switch promptly to ScrapeCreators if needed. Exercise a configured alternative when credentials are available.
- Enable direct-first production selection only after a successful hosted proof. Otherwise retain the managed route and document the free-path blocker. A metadata/title lookup must not block valid captions.

**Done when:** Two real captioned videos yield relevant text through the local backend without managed transcript credentials, and two work through the public deployment. Free direct deployment has its own recorded outcome; managed success does not establish it. All provider keys remain server-only.

**Output:** Local caption proof, deployed provider proof, free direct trial result and exact configuration. Complete the local conversation proof in Step 07 and recheck it in Step 13.

### Step 04 — Complete deployed PDF ingestion

**Depends on:** 01  
**Initial status:** PENDING — reconcile with the actual repository.

Meet the strictest deployment and upload requirement early.

- Implement the multipart server route, authoritative size checks, PDF-content validation, and server-side extraction in the production runtime.
- Extract all pages and normalize whitespace without discarding substantive text. Release parser resources, bound work, and return actionable errors.
- Handle missing, corrupt, encrypted, oversized, and image-only/no-text files. Use a consistent byte definition for the displayed 25 MB limit and allow multipart overhead at the request layer.

**Done when:** A known multi-page PDF and a valid PDF near the allowed size work in the deployed app. Beginning, middle, and final-page markers are present. The size boundary and oversized case behave consistently.

**Output:** The deployed PDF endpoint, extraction fixture results, and actual parser/runtime configuration.

### Step 05 — Build source selection and preview at mobile width

**Depends on:** 03, 04  
**Initial status:** PENDING — reconcile with the actual repository.

Turn the ingestion proofs into a coherent user flow.

PM sequencing, 18 October: 05a is the bounded PDF-only UI subcheck following accepted Step 04, now accepted locally/on host with physical phone pending. Task03c next closes the Step03→05 owned-caption-source handoff using existing adapters, without public YouTube UI, cache or automatic fallback. It requires no provider key for isolated worker implementation. The original combined Step05 dependency on Steps03/04 remains: YouTube workflow and conversation readiness are not advanced or marked complete by05a/03c. FullStep06 remains downstream.

- Use the selected Impeccable design skill to record concise product/design context from this plan, then shape the single-source mobile flow. Apply React best practices during implementation; avoid a separate branding or landing-page project.
- Connect both source choices to shared Source and IngestionError contracts. Show clear PDF and YouTube actions before a single active-source card.
- Build a Conversation view and an easy-to-open Source view for mobile; desktop side-by-side layout is optional. Show readiness, metadata, readable extraction and two or three fixed starter questions.
- Ignore stale request results, cancel abandoned imports and stop the session before replacing the source. Enable Start once extraction and the source-budget check pass. Start connects and primes the session; accept questions only after every source item is acknowledged. Keep Stop available during connection and priming.

**Done when:** At roughly 390 px width, a user can import a source, inspect its text, recover from a failed import, and deliberately choose a different source.

**Output:** The usable ingestion screen and shared contracts.

### Step 06 — Finish the YouTube ingestion adapter

**Depends on:** 03, 05  
**Initial status:** PENDING — reconcile with the actual repository.

Provide a consistent and understandable YouTube path.

- Validate allowed YouTube hosts and normalize canonical IDs. Put direct, Supadata and ScrapeCreators behind the same typed adapter. Support developer configuration for automatic selection or a forced provider; keep these implementation controls out of the user flow.
- Retain segments and language. Cache validated public captions in PostgreSQL, and create a visitor-owned Source on a cache hit. Use a unique cache key, upsert, expiry and in-process request deduplication for the single app instance.
- Validate immediate and pending responses. Handle 202 job IDs with bounded polling without resubmission; distinguish no captions, restrictions, malformed output, bad credentials, quota, rate limiting and timeouts. Back off on rate limits, never on exhausted quota; fallback is selective and bounded. Coordinate retries in one layer; a known blocked direct adapter goes into cooldown rather than delaying every import. Propagate user cancellation through the complete chain.

**Done when:** The deployed YouTube import and preview work; repeats use the cache, failures recover clearly, and a malformed successful HTTP response cannot mark a source ready.

**Output:** Provider selection, cache/expiry behavior, repeatable local configuration, and a provider failure matrix.

### Step 07 — Structure and evaluate the source context

**Depends on:** 02, 04, 06  
**Initial status:** PENDING — reconcile with the actual repository.

Make the conversation reliably about the selected source.

- Preserve page/paragraph/timestamp sections and stable IDs. Start connects and loads the complete supported source. Accept questions only after every context item is acknowledged, while keeping Stop available throughout setup.
- On Day 1 prove a grounded voice answer plus facts from both ends of a source. During Day 2 compare plain and structured full text on the same 12-question set with the behavioral prompt held constant. Make prompt refinements separate recorded iterations.
- Enforce source/history/transport budgets and disable silent truncation. Timebox lexical retrieval feasibility to 60 to 90 minutes only if a real failure remains. Include the Realtime tool loop, authorization and grounding checks before calling retrieval complete; otherwise keep the tested full-source path.
- Complete the local fallback through the full application: keep managed transcript providers disabled, import fresh captions, inspect the text and ask a source-grounded question. This finishes the local conversation check introduced in Step 03.

**Done when:** Day 1: real source-grounded voice and beginning/end facts pass. Day 2 quality follow-up: fixed facts and follow-ups pass, missing answers are acknowledged, no source contamination occurs, and the selected prompt/context design has recorded results.

**Output:** Versioned prompt, structured source contract, evaluation table and explicit context limits.

### Step 08 — Complete voice controls and interruption

**Depends on:** 05, 07  
**Initial status:** PENDING — reconcile with the actual repository.

Create a natural voice session with accurate controls.

- Implement Start, Stop, Mute, and Unmute around one active connection. Distinguish connecting, priming, ready, listening, generating, playing audio, ended, and failed states.
- Use voice activity detection with interruption enabled. Handle the difference between finishing response generation and finishing audible playback.
- Clean up tracks, peer connection, data channel, audio element, listeners, and pending work on stop, navigation, or replacement. A late response must not restart a stopped session.

**Done when:** The user can ask, hear, interrupt, follow up, mute, unmute, stop, and start again without overlapping sessions or stale audio.

**Output:** A usable source-based voice conversation and lifecycle checks.

### Step 09 — Render live conversation transcripts

**Depends on:** 08  
**Initial status:** PENDING — reconcile with the actual repository.

Make both sides of the voice exchange visible as it happens.

- Enable user transcription and handle incremental/final input events; render the assistant's audio transcript events.
- Update turns by stable item/response IDs instead of assuming all events arrive in order. Reconcile final text without duplicating bubbles.
- Mark interrupted or failed turns honestly. Avoid treating generated text as proof that every word was heard; keep the transcript readable while the user scrolls.

**Done when:** Both speakers appear during an active session, final transcripts do not duplicate drafts, and delayed events do not reorder unrelated turns.

**Output:** Transcript reducer and a small set of event-ordering tests.

### Step 10 — Add genuine text fallback

**Depends on:** 07, 09  
**Initial status:** PENDING — reconcile with the actual repository.

Keep the application usable with no microphone.

- Add an explicit text option and an immediate path to it after microphone denial or unavailability.
- Use the verified text-only Realtime connection, the same source preparation, and streamed text responses. Text mode must not call getUserMedia.
- Keep one active transport. Initially, changing modes starts a clearly indicated new conversation with the same source and resets history consistently. Preserve the current session transcript; do not imply that a new model session remembers turns it has not received.

**Done when:** Deny microphone permission before starting, type a source-based question, and receive a real answer. No audio device or successful voice session is required.

**Output:** A functioning microphone-free workflow and documented mode-switch behavior.

### Step 11 — Harden network and backend behavior

**Depends on:** 04, 06, 10  
**Initial status:** PENDING — reconcile with the actual repository.

Pass the poor-network and security review without introducing a large platform.

- Add bounded waits, cancellation, and clear recovery for imports, token issuance, SDP negotiation, connection failure, and provider errors.
- Observe connection state, preserve the selected source where possible, and offer a fresh-session retry with a new credential. Text fallback also requires an internet connection.
- Complete limits, ownership and expiry checks across read/delete/token/search routes, source restoration and database cleanup. Bound database connections and provider requests. Log timings/error categories without document bodies, raw audio or keys. Apply no-store token responses, origin/CSRF checks, visitor/IP/global issuance limits and privacy-preserving safety identifiers; monitor usage without treating token TTL as a session or spending limit.

**Done when:** Network loss, expired credentials, rejected setup, and unavailable sources yield recoverable UI. Stopping during connection cannot create a hidden second session. Separate visitors cannot read each other's sources.

**Output:** Failure-state matrix, cleanup behavior, and security checks.

### Step 12 — Polish the mobile experience

**Depends on:** 10, 11  
**Initial status:** PENDING — reconcile with the actual repository.

Make the required workflow comfortable on the target screen.

- Polish 390 px plus nearby widths. Keep source inspection, transcript, starter prompts and voice controls reachable with the keyboard open. Use an active-source label and restrained visual hierarchy.
- Provide readable labels, touch-sized controls, keyboard focus, disabled states, and status text that does not rely only on color.
- Test actual microphone permission and audio playback on available iOS Safari and Android Chrome devices. Handle blocked playback with a clear tap-to-play action; do not treat viewport emulation as a substitute for audio testing.
- Use focused Impeccable adaptation/hardening/polish commands, the web-design-guidelines audit and Playwright CLI for observable UI checks. Keep real microphone and physical phone evidence separate from automation.

**Done when:** A user can complete source entry, preview, voice, interruption, and text fallback on a real phone without clipped controls or unusable scrolling.

**Output:** A browser/device checklist that states exactly what was tested and any remaining platform gap.

### Step 13 — Run focused tests and the reviewer script

**Depends on:** 12  
**Initial status:** PENDING — reconcile with the actual repository.

Verify the risky behaviors and the exact submission build.

- Complete focused tests for upload/URL validation, extraction completeness, source isolation, context handling, transcript event order, and stop/start races.
- Mock external APIs in automated tests so CI is reproducible, then separately verify real OpenAI and YouTube behavior manually.
- Run the exact reviewer script on the deployment. Use five varied captioned videos, near-limit and mixed-layout PDFs, microphone denial, interruption, follow-up and physical connectivity changes. Check cold/warm imports, clean install/build/migrations and browser/repository secret exposure. Re-run uncached local extraction with managed providers disabled; separately force direct deployment to confirm or update its recorded status. Verify that provider switching and cooldown do not hide failures or exceed the total import deadline.

**Done when:** Both deployed ingestion paths and the full mobile conversation have evidence; focused tests pass; the exceptional-level quality matrix is reviewed; no material known defect is hidden in the demonstration.

**Output:** Test results, a completed review checklist, and the exact build/commit intended for the demo.

### Step 14 — Prepare the README and walkthrough

**Depends on:** 13  
**Initial status:** PENDING — reconcile with the actual repository.

Deliver the complete assessment package.

- Finish setup/run/environment instructions, migrations, hosting rationale, Realtime behavior, caption-provider configuration, context experiments, temporary data lifetime, supported inputs and targeted tests. Include the anonymous-session explanation, optional future OAuth boundary, local fallback commands and forced-provider test settings.
- Explain which deployed provider succeeded and whether free direct mode passed, including cache behavior and observed failures. Document the verified local fallback and show a brief local backup demonstration if cloud retrieval is unavailable. Disclose where AI helped and how code and prompts were checked.
- Record a 10-15 minute walkthrough, rehearse both source paths and voice controls, and verify access to the public application, public repository, and recording.

**Done when:** A fresh reader can run the repo from the README, all three deliverables are accessible, and the video covers the required workflow and architectural reasoning.

**Output:** Public app, public repository, recording, complete README and an evidence-based submission note.

## 4 Verification and useful test fixtures

These engineering acceptance targets supplement the assessment. The brief does not mandate specific sample counts or timings. Tests remain pending. Use shareable or synthetic PDF fixtures and actual captioned public videos.

| Fixture or scenario | Evidence to collect |
| --- | --- |
| Five varied captioned videos | Deployed imports on short and long content, manual and automatic captions where available; an uncached import proves live retrieval. |
| Local direct fallback | Managed transcript providers off; cache bypassed; two real videos yield full text and a grounded answer through the local application. |
| Free hosted direct mode | Force direct extraction with no managed keys or cache; record actual provider, text completeness, timestamp units and a success or blocker. |
| Anonymous token issuance | No login needed; ownership and admission checks work; fresh short-lived credentials are not cached or logged. Expiry is not presented as a session limit. |
| Near-limit PDF and page markers | A valid PDF near 25 MB uploads in deployment; beginning, middle and end text is present; consistent oversize rejection. |
| Mixed layout and unsupported PDFs | Check multi-column or table-bearing text for readable order. Corrupt, encrypted and no-text inputs produce specific messages. |
| Provider anomalies | Pending 202 jobs, HTTP 206, null/empty captions, malformed timing and quota/rate limits are distinct; retries and polling are bounded and do not resubmit pending work. |
| Twelve grounding questions | Expected facts, answer, prompt version, pass/fail and notes; direct facts, synthesis, follow-up, missing answers and source instructions. |
| Source replacement and two visitors | Source B replaces A; reads, deletion and token requests reject another visitor; a shared transcript cache yields a new visitor-owned source. |
| Interruption and repeated start | Interrupt, follow up, mute and stop; repeat without leaked tracks, old audio or duplicate sessions. |
| Denied microphone | Start text mode after denial and receive a real source-based answer without acquiring audio. |
| Connection loss and cancellation | Switch connectivity and stop during setup; responsive UI and a fresh, clearly labeled session. |
| Mobile and keyboard | Physical phone audio plus 390 px layout, keyboard, scrolling, labels and touch controls. |
| Database and cache lifecycle | Source survives app restart within TTL; expired rows are inaccessible; migrations/cleanup run; repeat imports avoid provider calls. |
| Submission build | Clean install, build, migrations, tests, secret checks, and accessible app/repository/video. |

Use six direct fact questions spread through the source, two comparisons or synthesis questions, two natural follow-ups, one absent-answer question and one attempt to turn embedded source instructions into app commands. Require support for fixed facts, no source contamination and honest uncertainty. Judge explanation quality separately. Add adversarial examples when a failure identifies a concrete gap.

Measure import time and end-of-question to first-audible-response time on the tested device. Suggested internal goals on an ordinary connection are a median first-audio delay around three seconds or less and audible interruption within about one second. These are provisional usability targets, not provider guarantees or grading thresholds. Record the median and worst of several trials; prioritize broken states and obvious regressions over tuning a tiny sample.

### Realtime implementation reminders

Use current GA event types from the selected SDK/reference and actual observed events. Useful families include conversation.item.input_audio_transcription.*, response.output_audio_transcript.*, response.output_text.*, input_audio_buffer.speech_started, and response.done. Keep one event adapter so UI components do not contain scattered protocol handling. Verify terminal response status using the current API types; do not mix older beta or GPT-Live examples into this Realtime integration. [13] [18]

### Context experiment decision

Experiment A uses a concise source-grounded prompt and full text. Experiment B keeps that prompt unchanged and adds stable section IDs and preserved boundaries. Record subsequent prompt refinements separately. Experiment C is conditional lexical-retrieval feasibility, including the Realtime tool loop. Compare the same questions, coverage, failures and latency. All-section loading does not reduce tokens merely because the text is chunked.

## 5 Three day delivery schedule

| Milestone | Work items | Evidence |
| --- | --- | --- |
| Day 1 Deployed foundations | 01 to 07 | Both imports work publicly; local caption backup is verified; free direct deployment has a recorded result; voice and initial grounding work. Complete Step 07 experiments on Day 2. |
| Day 2 Complete interaction | 07 follow-up and 08 to 12 | Transcript, interruption, follow-up, controls, text fallback and recoverable errors work on a phone. |
| Day 3 Submission quality | 13 and 14 | Final review/fixes, reproducible setup, README, public repository and walkthrough are complete. |

Target 28 to 34 focused engineering hours across at most three calendar days: approximately 24 to 28 planned hours plus four to six hours of contingency. The additional local/free direct checks may consume up to 90 minutes of that reserve; optional polish yields first. The estimate assumes managed captions remain available when direct cloud extraction fails, one source, no accounts and no retrieval system unless justified. Aim for a full demo in 36 to 48 elapsed hours, then verification and delivery. The user's three-day target governs the schedule. [1, p. 4]

| Time block | Planned focus | Gate |
| --- | --- | --- |
| Day 1 9 to 10 hours | Deployment, PostgreSQL, voice proof, managed captions, PDF, source UI and initial grounding checks. | Both deployed sources and a grounded voice answer. |
| Day 2 9 to 10 hours | Context experiments, interruption, controls, transcript, text mode, lifecycle failures and mobile refinement. | Complete phone workflow and microphone-denied fallback. |
| Day 3 6 to 8 hours | Quality checks, fixes, README, recording and public-link verification. | Complete submission with material defects addressed. |
| Reserve 4 to 6 hours | Contingency across the three days. Cut optional additions once consumed. | Protect testing and recording time. |

### Walkthrough outline

| Approximate time | Content |
| --- | --- |
| 0-1 minute | Introduce the problem and the mobile-first workflow. |
| 1-4 minutes | Use the deployed PDF path; inspect text, ask a question, interrupt, and follow up. |
| 4-6 minutes | Use the public deployment to import a captioned YouTube video, inspect its transcript and ask a relevant question. Include an uncached application import to show live provider retrieval. |
| 6-7 minutes | Demonstrate mute/stop and real text fallback after microphone denial. |
| 7-10 minutes | Explain source adapters, context loading, ephemeral credentials, WebRTC, and hosting. |
| 10-12 minutes | Show meaningful tests, a failure/recovery state, limits, and AI assistance. Leave room for natural pacing within 10-15 minutes. |

Freeze new features in the final 12 elapsed hours. Cut generated summaries, automatic answer citations, custom voices, history UI, decorative animation and optional lexical retrieval before cutting deployed ingestion, text fallback, interruption, recovery, mobile checks or submission materials. If either hosted source remains blocked at the end of Day 1, resolve or escalate the concrete blocker before optional polish.

### Starting the next working session

Start with Step 01: one Next.js project, public HTTPS deployment, a minimal PostgreSQL migration and server-only configuration. Prove anonymous Realtime in Step 02, deployed plus local captions and the free direct trial in Step 03, then a near-limit deployed PDF in Step 04. Capture README notes from the first commit.

### Product design references

The separate Product References and Design Decisions document compares six products with source links. Apply direct PDF or YouTube entry, one visible source, mobile Source and Conversation views, starter questions, clear voice controls and original-text access. Retain page boundaries and timestamp links when available; automatic answer citation generation remains optional.

## 6 Skills and manager-worker handoff

The repository handoff accompanies this plan. It includes a full Markdown implementation plan, current-state tracker, testing procedures, skill selection, product references, an APM manager prompt and a worker prompt. APM names the manager role here; no specific external APM framework is assumed or installed.

| Repository / component | Decision and use |
| --- | --- |
| pbakaus/impeccable | Primary design skill: impeccable. Use product setup, flow design, mobile adaptation, error-state hardening, audit and final polish. Apply a bounded set of commands. [38] |
| vercel-labs/agent-skills | Select vercel-react-best-practices for relevant React/Next implementation and web-design-guidelines for UI/accessibility review. Skip Vercel deployment/optimization, native-app and transition additions. [39] [40] |
| microsoft/playwright-cli | Select playwright-cli for browser interactions, screenshots, console/network inspection and focused workflow checks. Retain actual live-service/phone checks. [41] |
| leonxlnx/taste-skill | Reserve alternative only. Its default design-taste-frontend emphasizes art direction and image-led public pages. Do not activate a second design framework alongside Impeccable. [42] |
| voltagent/awesome-design-md | Reference collection, not a necessary installed skill. Consult selectively and write compact design decisions for this application. [43] |
| dmmulroy/anti-slop | Defer install-anti-slop. It vendors opinionated Oxlint rules and configuration; it is code-lint tooling, not visual design guidance. Reconsider only if existing lint policy makes it useful. [44] |

Use prompts/APM_MANAGER_PROMPT.md in the manager chat. It first inspects repository instructions, files, git status, scripts and evidence; reconciles docs/PROJECT_STATE.md; then issues one bounded worker brief. Paste prompts/WORKER_PROMPT.md and that brief into the separate coding chat. Return the worker report to the manager for review, targeted testing and the next step.

The tracker begins with implementation unverified and Steps 01-14 pending. This records the planning session, not an assertion that the actual repository is empty. The manager preserves newer verified work, requires explicit test evidence before marking a gate passed, and never treats mocked services, cached captions or viewport emulation as live integration or physical-phone proof.

docs/SKILLS.md contains source links, current command names and setup notes. No skills were installed, app code implemented, deployment created or live integration verified during planning. Preserve repository instructions and existing authorization; do not let a design skill introduce accounts, vector retrieval, hosting migration or unrelated animation.

## 7 Sources

Requirements come from the supplied five-page brief. Technical and product references were checked on 17 October 2026 in Toronto. Provider reliability, performance goals and estimates require the roadmap's live checks. Published prices are in US dollars and may change.

[1] Supplied assessment, Talk to a Document(2).pdf, pages 1-5.

[2] [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

[3] [Next.js Server Action request body limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)

[4] [Render guide for deploying Next.js as a Node web service](https://render.com/docs/deploy-nextjs-app)

[5] [Render free-service behavior and limitations](https://render.com/docs/free)

[6] [pdf-parse project documentation](https://github.com/mehmet-kozan/pdf-parse)

[7] [pdf-parse worker and deployment troubleshooting](https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md)

[8] [youtube-transcript-plus project documentation](https://github.com/ericmmartin/youtube-transcript-plus/blob/main/README.md)

[9] [Google YouTube Data API caption-download permissions](https://developers.google.com/youtube/data/reference/rest/v3/captions/download)

[10] [OpenAI Realtime WebRTC connection guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime)

[11] [OpenAI GPT-Realtime-2.1 model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)

[12] [OpenAI Realtime client-secret and session configuration reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)

[13] [OpenAI Realtime conversation management](https://developers.openai.com/api/docs/guides/realtime-conversations)

[14] [OpenAI Realtime WebSocket connection guide](https://developers.openai.com/api/docs/guides/voice-websockets?voice-api=realtime)

[15] [MDN WebRTC negotiated maximum message size](https://developer.mozilla.org/en-US/docs/Web/API/RTCSctpTransport/maxMessageSize)

[16] [MDN microphone access and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

[17] [MDN audio autoplay behavior](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

[18] [OpenAI Realtime TypeScript reference](https://developers.openai.com/api/reference/typescript/resources/realtime)

[19] [Supadata transcript endpoint and native mode](https://docs.supadata.ai/get-transcript)

[20] [Supadata response and error codes](https://docs.supadata.ai/errors/list)

[21] [ScrapeCreators YouTube transcript endpoint](https://docs.scrapecreators.com/v1/youtube/video/transcript/)

[22] [Supadata published plans and credits](https://supadata.ai/pricing)

[23] [ScrapeCreators published credits and pricing](https://scrapecreators.com/#pricing)

[24] [SQLite appropriate uses and concurrency](https://www.sqlite.org/whentouse.html)

[25] [PostgreSQL full text search introduction](https://www.postgresql.org/docs/current/textsearch-intro.html)

[26] [Render persistent disk limitations](https://render.com/docs/disks)

[27] [Render managed PostgreSQL and connections](https://render.com/docs/postgresql-creating-connecting)

[28] [Supadata rate limits versus exhausted quota](https://docs.supadata.ai/errors/limit-exceeded)

[29] [youtube-transcript-plus direct Node extraction and segment units](https://github.com/ericmmartin/youtube-transcript-plus/blob/main/README.md)

[30] [youtube-transcript-api usage and cloud IP limitations](https://github.com/jdepoix/youtube-transcript-api)

[31] [yt-dlp subtitle-only options](https://github.com/yt-dlp/yt-dlp)

[32] [yt-dlp external JavaScript runtime and EJS setup](https://github.com/yt-dlp/yt-dlp/wiki/EJS)

[33] [OpenAI client secrets expiration reuse and client overrides](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)

[34] [OpenAI anonymous preview and safety identifiers](https://developers.openai.com/api/docs/guides/safety-best-practices)

[35] [yt-dlp proof of origin token requirements](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)

[36] [Linked hosted YouTube transcript service documentation](https://github.com/jaypaun007/youtube-transcript-api/)

[37] [Canonical youtube-transcript-api package and upstream metadata](https://pypi.org/project/youtube-transcript-api/)

[38] [Impeccable current commands and installation](https://github.com/pbakaus/impeccable)

[39] [Vercel React best practices skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md)

[40] [Vercel web design guidelines skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md)

[41] [Microsoft Playwright CLI skill](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md)

[42] [Taste Skill current scope and variants](https://github.com/leonxlnx/taste-skill)

[43] [Awesome DESIGN.md reference collection](https://github.com/voltagent/awesome-design-md)

[44] [Anti-slop Oxlint rules and installation skill](https://github.com/dmmulroy/anti-slop)
