import "server-only";
import type { Limits } from "./proof/admission.ts";

// Assessment controls remain process-local, finite and independent of proof endpoints.
// The unverified-network bucket is shared, so its bound must equal the aggregate.
const lane = (visitor: number, aggregate: number, lifetime: number, concurrent: number): Limits =>
  Object.freeze({ visitor, ip: aggregate, global: aggregate, lifetime, concurrent, windowMs: 3600_000 });
export const ownedVoicePreparations = lane(120, 1200, 20_000, 2);
export const ownedVoiceStarts = lane(60, 600, 10_000, 2);
export const ownedVoiceCommands = lane(600, 6000, 100_000, 4);
export const ownedVoiceCancellations = lane(240, 2400, 40_000, 4);
export const ownedTextStarts = lane(60, 600, 10_000, 20);
export const ownedTextCommands = lane(2400, 24_000, 400_000, 20);
export const ownedTextStops = lane(240, 2400, 40_000, 20);
export const ownedVoiceReplayEntries = 20_000;
export const ownedTextReplayEntries = 50_000; // Starts plus independently admitted stop-before-start tombstones.
