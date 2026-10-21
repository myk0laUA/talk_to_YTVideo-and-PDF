# Task 08N — isolate unintended response after interruption

Sole worker task, parent Steps08/09. Follow prompts/WORKER_PROMPT.md and required repository documents. PM owns deployment and acceptance. Timebox initial investigation to60–90minutes. Application implementation remains in worker chat.

## Evidence and outcome

Starting PM HEAD d6f9e15 plus this handoff; deployed74ec316/v5/threshold0.6. User clarified prior stop/continue test was on speaker, not headphones. New test explicitly used headphones and generally worked, but user reports unexpected interruption and renewed speech. Screenshots show summary, user Stop, assistant acknowledgement, a distinct follow-up question, interrupted assistant answer beginning Based on, user transcription Based on, then another answer. Do not reproduce private resume or hiring content in fixtures. Screenshots establish displayed ordering, not audio/event timestamps, actual words spoken or an app restart. Headphone type, active input route and applied capture processing are unknown. Do not conclude speaker echo, session loss or provider fault.

Outcome: distinguish new provider generation after detected input, local playback replay, duplicate app commands, and transcript ordering defects. Correct a reproduced cause narrowly, or provide safe bounded evidence capture for exactly one PM/device reproduction. Do not tune threshold again.

## Investigation and implementation scope

Inspect src/app/voice-browser-adapters.ts native sender/receiver track wiring and playback binding; src/shared/voice-response.ts interruption events; voice lifecycle, priming and transcript reconciliation. Current manual interrupt sends targeted cancel then buffer-clear; it contains no response.create. Final provider VAD enables automatic response creation. Verify the full route rather than treating this initial read as proof.

Check that only acquired local microphone tracks reach the sender, remote tracks only reach playback, repeated track events cannot restart old output, duplicate/late events cannot cancel a new response, and interruption does not re-prime the document or start a session. Consult current official OpenAI WebRTC interruption, output-buffer and conversation-history behavior before adding client truncation or other wire commands. Spoken Stop is model input, distinct from Stop session; do not silently turn it into session termination. A short acknowledgement after Stop may be intentional; distinguish it from renewed explanation.

Use authored neutral document and explicit scenarios: summary → spoken stop → silence; summary → stop → pause → continue; summary → interrupt with a different factual question. Keep microphone transcription asynchronous; do not gate interruption on delayed transcript, filter short text, or assume displayed text exactly represents what the model heard. Do not implement keyword-based stop/continue control or unsolicited prompt changes without evidence.

If offline reproduction does not establish cause, extend existing diagnostics minimally: bounded in-memory event chronology using monotonic times, closed event/reason categories and session-local numeric response/item ordinals. Include direction for relevant client commands and separate generation/buffer events. Optional capture evidence is allowlisted support/effective boolean processing settings only; no track/device identifiers, labels, audio, source/transcript content, raw events, credentials, cookies or persistent telemetry. Distinguish unknown/unreported settings from false. Clear diagnostics on source/session replacement, bound retained rows and cover late events. Expose only in existing collapsed details if needed; no dashboard/UI redesign. Do not infer active physical headphone routing from permission or requested constraints.

## Acceptance and tests

1. State each hypothesis and evidence for/against it. A diagnosis-only result is partial; don't claim repaired acoustics from a mock.
2. Regression tests cover any reproduced defect, remote/local track separation, no unintended response.create/re-priming/session restart, late cancel/clear and duplicate events. Preserve intentional interruption, follow-up, mute, playback and Stop cleanup.
3. If diagnostic fallback is needed, test closed projection, bounds, lifecycle cleanup and exclusion of all sensitive payloads. Retain source ownership/expiry, exact v5 policy,2048 cap,0.6 threshold,600ms silence,08L optional processing, full-source ACKs and text fallback.
4. Pinned Node24.22.0/npm11.19.1 with established .env-free/network-denied harness: npm run lint, npm run typecheck, npm test, npm run build; affected npm run test:interruption, npm run test:lifecycle, npm run test:transcript, npm run test:voice-adapter and npm run test:owned-voice. Build before built-browser tests; test:transcript-view if view changes, test:owned-text if shared logic changes. Record exact commands/exits/build and failures.

## Evidence, physical follow-up and limits

Use openai-docs at C:/Users/Myk/.codex/skills/.system/openai-docs/SKILL.md for official protocol; local .agents/skills/playwright-cli/SKILL.md for relevant verification; vercel-react-best-practices only for React edits. Return READY_FOR_REVIEW with files/SHA256, HEAD plus dirty identity/build, evidence under artifacts/local/08n, exact commands/results and unresolved hypotheses. Update PROJECT_STATE/TESTING preserving history.

No worker paid/provider calls, deployment, environment/DB/dependency changes or next task. No unbounded live retries or new recording. PM reviews/deploys and coordinates one headphone session with an authored source: summary, say stop, stay quiet five seconds, then ask a distinct question; stop at first unexpected event and capture safe details. Actual device routing, audible behavior and provider success remain NOT_RUN in offline evidence. Voice stays enabled and hosting stays free.
