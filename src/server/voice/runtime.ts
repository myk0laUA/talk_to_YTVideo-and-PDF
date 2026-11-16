import "server-only";
import { instrument } from "../observability";
import { createPreparationDiagnostics } from "./diagnostics";
import { getDatabase } from "../db";
import { createSourceRepository } from "../sources/repository";
import { parseVoiceConfig } from "./config";
import { createVoiceMint } from "./provider";
import { VoiceRegistry } from "./registry";
import { createVoiceHandlers } from "./handlers";

// Shared across separately compiled Next routes; no test globals/factories in production.
const state = globalThis as unknown as { ownedVoiceRegistry02d?: VoiceRegistry; ownedVoiceHandlers02d?: ReturnType<typeof createVoiceHandlers> };
const registry = state.ownedVoiceRegistry02d ??= new VoiceRegistry({ repository: createSourceRepository(getDatabase), mint: createVoiceMint() });
const handlers = state.ownedVoiceHandlers02d ??= createVoiceHandlers({ config: () => parseVoiceConfig(process.env), registry,
  diagnostics: createPreparationDiagnostics(line => console.info(line)) });
export const voiceHandlers = { prepare: instrument("http.voice.prepare", handlers.prepare),
  credential: instrument("http.voice.credential", handlers.credential), cancel: instrument("http.voice.cancel", handlers.cancel) };
