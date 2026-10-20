import "server-only";
import { getDatabase } from "../db";
import { createSourceRepository } from "../sources/repository";
import { parseVoiceConfig } from "./config";
import { createVoiceMint } from "./provider";
import { VoiceRegistry } from "./registry";
import { createVoiceHandlers } from "./handlers";

// Shared across separately compiled Next routes; no test globals/factories in production.
const state = globalThis as unknown as { ownedVoiceRegistry02d?: VoiceRegistry; ownedVoiceHandlers02d?: ReturnType<typeof createVoiceHandlers> };
const registry = state.ownedVoiceRegistry02d ??= new VoiceRegistry({ repository: createSourceRepository(getDatabase), mint: createVoiceMint() });
export const voiceHandlers = state.ownedVoiceHandlers02d ??= createVoiceHandlers({ config: () => parseVoiceConfig(process.env), registry });
