import type { TranscriptSnapshot } from "./transcript.ts";

/** One source-scoped browser workspace. Never persisted or shared between visitors. */
export class ConversationMemory {
  snapshot?: TranscriptSnapshot;
  draft = "";
  resume = false;
  started = false;
  private revision = 0;
  readonly sourceId: string;
  constructor(sourceId: string) { this.sourceId = sourceId; }
  requestHandoff() { this.resume = this.started || !!this.snapshot; }
  save(snapshot?: TranscriptSnapshot) {
    if (!snapshot?.turns.length || snapshot.identity?.sourceId !== this.sourceId) return;
    const prefix = `saved_${++this.revision}_`;
    // Each transport may restart its local item counter. Give archived display rows
    // their own keys; model history contains roles/text, never these display IDs.
    this.snapshot = { ...snapshot, turns: snapshot.turns.map((turn, index) => ({ ...turn, itemId: `${prefix}${index}` })) };
  }
  clear() { this.snapshot = undefined; this.started = false; }
}
