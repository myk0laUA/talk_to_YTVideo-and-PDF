// Fixed offline simulation, no network/environment APIs. This is never runtime compatibility evidence.
import { probeSequence, type ProbeOptions } from "./realtime-probe.ts";
import type { PrimingTransport } from "../../src/shared/priming-controller.ts";

export function scriptedProbe(options: ProbeOptions): PrimingTransport {
  const sequence = probeSequence(options);
  let open = true, receive: ((event: unknown) => void) | undefined;
  const session = { id: "scripted_session", object: "realtime.session", type: "realtime", model: options.model };
  const emit = (event: object) => queueMicrotask(() => { if (open) receive?.(event); });
  return {
    isOpen: () => open,
    subscribe: listener => { receive = listener; emit({ type: "session.created", session });
      emit({ type: "conversation.created", conversation: { id: "scripted_conversation", object: "realtime.conversation" } });
      return () => { receive = undefined; }; },
    close: () => { open = false; receive = undefined; },
    send: serialized => {
      const event = JSON.parse(serialized);
      if (event.type === "session.update") emit({ type: "session.updated", session: { ...session, ...sequence.configure.session } });
      else if (event.type === "conversation.item.create") emit({ type: "conversation.item.done", item: { ...event.item, status: "completed" }, previous_item_id: event.previous_item_id ?? null });
      else if (event.type === "response.create") {
        emit({ type: "response.created", response: { id: "scripted_response" } });
        emit({ type: "response.done", response: { id: "scripted_response", status: "completed", output: [
          { type: "message", role: "assistant", content: [{ type: "output_text", text: "cobalt" }] },
        ], usage: { input_tokens: 100, output_tokens: 4, total_tokens: 104,
          input_token_details: { text_tokens: 100, audio_tokens: 0, cached_tokens: 0 },
          output_token_details: { text_tokens: 4, audio_tokens: 0 } } } });
      } else throw new Error("Unexpected scripted send.");
    },
  };
}
