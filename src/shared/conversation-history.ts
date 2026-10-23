import { TRANSCRIPT_LIMITS, type TranscriptSnapshot } from "./transcript.ts";

export type ConversationHistory = { sourceId: string; turns: { role: "user" | "assistant"; text: string }[] };
export const HISTORY_BODY_BYTES = 800_000;
/** Client dialogue is untrusted context, never system instructions or source evidence. */
export function parseHistory(value: unknown, sourceId: string): ConversationHistory {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid history");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "sourceId,turns" || v.sourceId !== sourceId || !Array.isArray(v.turns)
    || v.turns.length > TRANSCRIPT_LIMITS.items) throw new Error("Invalid history");
  let characters = 0;
  const turns = v.turns.map(t => {
    if (!t || typeof t !== "object" || Array.isArray(t) || Object.keys(t).sort().join(",") !== "role,text"
      || !["user", "assistant"].includes(t.role) || typeof t.text !== "string" || !t.text.trim()) throw new Error("Invalid history");
    characters += t.text.length;
    if (characters > TRANSCRIPT_LIMITS.totalCharacters) throw new Error("History limit");
    return { role: t.role as "user" | "assistant", text: t.text as string };
  });
  return { sourceId, turns };
}

export function completedHistory(snapshot: TranscriptSnapshot, sourceId: string) {
  if (snapshot.identity?.sourceId !== sourceId || snapshot.limit || snapshot.counts.characters > TRANSCRIPT_LIMITS.totalCharacters
    || snapshot.turns.length > TRANSCRIPT_LIMITS.items) throw new Error("Conversation history unavailable");
  let dropped = false;
  const turns: ConversationHistory["turns"] = [];
  for (const turn of snapshot.turns) {
    const complete = turn.ordering === "established" && turn.parts.length > 0 && turn.parts.every(p => p.state === "final")
      && (turn.role === "user" || turn.generation === "completed" && !turn.interrupted
        && turn.serverOutput !== "streaming" && turn.serverOutput !== "unknown");
    const text = turn.parts.map(p => p.text).join("\n");
    if (!complete || !text.trim()) { dropped = true; continue; }
    turns.push({ role: turn.role, text });
  }
  return { history: parseHistory({ sourceId, turns }, sourceId), dropped };
}
