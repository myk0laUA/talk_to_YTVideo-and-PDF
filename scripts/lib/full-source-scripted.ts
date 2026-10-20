// Explicit simulation only. Never reachable from the live factory.
import type { PrimingTransport } from "../../src/shared/priming-controller.ts";

export function scriptedFullSource(kind: "PDF" | "YOUTUBE", scenario = "success"): PrimingTransport {
  let receive: ((e: unknown) => void) | undefined, lost: (() => void) | undefined;
  let sequence = 0, turn = 0, open = true;
  const emit = (e: object) => { if (open) receive?.({ event_id: `scripted_${++sequence}`, ...e }); };
  return {
    isOpen: () => open, close: () => { open = false; receive = lost = undefined; },
    subscribe: (r, l) => { receive = r; lost = l; return () => { receive = lost = undefined; }; },
    send: raw => {
      const e = JSON.parse(raw);
      queueMicrotask(() => {
        if (scenario === "missing") return;
        if (scenario === "error") { emit({ type: "error", error: { code: "invalid_request_error", message: "NEVER_REPORT_PROVIDER_BODY" } }); return; }
        if (scenario === "disconnect") { lost?.(); return; }
        if (e.type === "session.update") emit({ type: "session.updated", session: { ...e.session, model: "gpt-realtime-2.1-mini", id: "session_scripted", object: "realtime.session" } });
        if (e.type === "conversation.item.create") emit({ type: "conversation.item.done", previous_item_id: e.previous_item_id ?? null, item: { ...e.item, status: "completed" } });
        if (e.type === "response.create") {
          const n = ++turn, response_id = `response_${n}`, item_id = `answer_${n}`;
          const text = scenario === "fact-mismatch" && n === 2 ? "Zoë." : kind === "PDF" ? n === 1 ? "06:15; Iris; east cedar gate." : "A: 0.4 kWh/crate; B: 0.3 kWh/crate; Zoë."
            : n === 1 ? "Mira; 09:20; violet; shelf Q." : "A: 6 minutes/lamp; B: 4 minutes/lamp; René.";
          const item = { id: item_id, type: "message", role: "assistant", status: "completed", content: [{ type: "text", text }] };
          emit({ type: "response.created", response: { id: response_id, conversation_id: "conversation_scripted", status: "in_progress", output_modalities: ["text"], metadata: e.response.metadata } });
          emit({ type: "response.output_item.added", response_id, output_index: 0, item: { ...item, content: [], status: "in_progress" } });
          emit({ type: "conversation.item.added", previous_item_id: `text_1_question_${n}`, item: { ...item, content: [], status: "in_progress" } });
          emit({ type: "response.content_part.added", response_id, item_id, output_index: 0, content_index: 0, part: { type: "text", text: "" } });
          emit({ type: "response.output_text.delta", response_id, item_id, output_index: 0, content_index: 0, delta: text });
          emit({ type: "response.output_text.done", response_id, item_id, output_index: 0, content_index: 0, text });
          emit({ type: "response.output_item.done", response_id, output_index: 0, item });
          emit({ type: "conversation.item.done", previous_item_id: `text_1_question_${n}`, item });
          emit({ type: "response.done", response: { id: response_id, conversation_id: "conversation_scripted", status: "completed", output: [item], usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120,
            input_token_details: { text_tokens: 100, audio_tokens: 0, image_tokens: 0, cached_tokens: 0 }, output_token_details: { text_tokens: 20, audio_tokens: 0 } } } });
        }
      });
    },
  };
}
