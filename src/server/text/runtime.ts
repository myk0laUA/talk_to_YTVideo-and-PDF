import "server-only";
import { instrument } from "../observability";
import { getDatabase } from "../db";
import { createSourceRepository } from "../sources/repository";
import { parseTextConfig } from "./config";
import { openTextSocket } from "./socket";
import { TextRegistry } from "./registry";
import { createTextHandlers } from "./handlers";

const state = globalThis as unknown as { ownedTextRegistry10d?: TextRegistry };
const registry = state.ownedTextRegistry10d ??= new TextRegistry({ repository: createSourceRepository(getDatabase),
  connect: (owner, signal, policy) => {
    const config = parseTextConfig(process.env);
    if (!config) throw new Error("Text conversation unavailable");
    return openTextSocket(config.apiKey, owner, signal, undefined, policy);
  } });
const handlers = createTextHandlers({ config: () => parseTextConfig(process.env), registry });
export const textHandlers = { start: instrument("http.text.start", handlers.start),
  question: instrument("http.text.question", handlers.question), stop: instrument("http.text.stop", handlers.stop),
  stream: instrument("http.text.stream", handlers.stream) };
