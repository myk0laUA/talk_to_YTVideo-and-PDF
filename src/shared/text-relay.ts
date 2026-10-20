import type { TextLifecycle, TextStatus } from "./text-lifecycle.ts";
import type { TranscriptSnapshot } from "./transcript.ts";

/** Same UI contract for the local lifecycle and its HTTP proxy. No provider commands. */
export type TextController = Pick<TextLifecycle, "snapshot" | "transcript" | "canSubmit" | "start" | "setQuestion" | "submit" | "stop" | "reset" | "dispose">;
export type TextRelaySnapshot = Readonly<{ status: TextStatus; transcript: TranscriptSnapshot; questionId?: string }>;
export type TextAvailability = Readonly<{ available: boolean }>;
export const textUuid = (v: unknown): v is string => typeof v === "string"
  && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
