import "server-only";
import { getDatabase } from "../db";
import { createSourceRepository } from "../sources/repository";
import { parseTextConfig } from "./config";
import { openTextSocket } from "./socket";
import { TextRegistry } from "./registry";
import { createTextHandlers } from "./handlers";

const state = globalThis as unknown as { ownedTextRegistry10d?: TextRegistry };
const registry = state.ownedTextRegistry10d ??= new TextRegistry({ repository: createSourceRepository(getDatabase),
  connect: (owner, signal) => {
    const config = parseTextConfig(process.env);
    if (!config) throw new Error("Text conversation unavailable");
    return openTextSocket(config.apiKey, owner, signal);
  } });
export const textHandlers = createTextHandlers({ config: () => parseTextConfig(process.env), registry });
