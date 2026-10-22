import "server-only";
import type { YoutubeSourceContent } from "../../shared/source.ts";
import type { TranscriptSnapshot } from "../../shared/transcript.ts";
import type { YoutubeEvidenceUnit } from "../../shared/youtube-evidence.ts";

export const EVIDENCE_LIMITS = Object.freeze({ units: 8, refs: 3, quote: 240, characters: 16_000 });

/** Optional literal markers only. No claim parsing, quote copying, repair or semantic inference.
 * Positions refer to unchanged part.text. Adjacent whitespace-separated markers form one group.
 * The transcript owns the answer limit; annotation bounds never change its text.
 */
export function resolveYoutubeEvidence(raw: string, source: YoutubeSourceContent, terminal: boolean, completed: boolean): readonly YoutubeEvidenceUnit[] {
  const units: YoutubeEvidenceUnit[] = [], sections = new Map(source.sections.map(s => [s.id, s]));
  const text = raw.slice(0, EVIDENCE_LIMITS.characters);
  let count = 0;
  for (const match of text.matchAll(/\[[^\[\]\r\n]*(?:\]|(?=[\[\r\n]|$))/gu)) {
    const start = match.index, end = start + match[0].length;
    const previous = units.at(-1), adjacent = previous && !text.slice(previous.end, start).trim();
    if (!adjacent && units.length >= EVIDENCE_LIMITS.units) {
      units[units.length - 1] = { ...units.at(-1)!, state: terminal && !completed ? "incomplete" : terminal ? "unconfirmed" : "pending", reason: "bounds", references: [] };
      break;
    }
    count = adjacent ? count + 1 : 1;
    const id = /^\[(segment-[A-Za-z0-9_-]{1,128})\]$/u.exec(match[0])?.[1];
    const section = id ? sections.get(id) : undefined;
    const reason = count > EVIDENCE_LIMITS.refs ? "bounds" : !id ? "malformed" : !section ? "unknown_id"
      : section.text.length > EVIDENCE_LIMITS.quote ? "long_excerpt"
        : !section.text.trim() || !Number.isFinite(section.startSeconds) || section.startSeconds < 0 || !/^[A-Za-z0-9_-]{11}$/u.test(source.videoId) ? "invalid_source" : undefined;
    const state = !terminal ? "pending" : !completed ? "incomplete" : reason || adjacent && previous.reason ? "unconfirmed" : "source_matched";
    const reference = state === "source_matched" && section ? [{ segmentId: section.id, excerpt: section.text,
      startSeconds: section.startSeconds, url: `https://www.youtube.com/watch?v=${source.videoId}&t=${section.startSeconds}s` }] : [];
    const unit: YoutubeEvidenceUnit = { start: adjacent ? previous.start : start, end, state,
      ...(reason || adjacent && previous.reason ? { reason: adjacent && previous.reason || reason } : {}),
      references: state === "source_matched" ? [...(adjacent ? previous.references : []), ...reference] : [] };
    if (adjacent) units[units.length - 1] = unit; else units.push(unit);
  }
  if (!units.length) units.push({ start: 0, end: 0, state: !terminal ? "pending" : completed ? "unconfirmed" : "incomplete", reason: "missing", references: [] });
  if (raw.length > EVIDENCE_LIMITS.characters) units[units.length - 1] = { ...units.at(-1)!, state: terminal && !completed ? "incomplete" : terminal ? "unconfirmed" : "pending", reason: "bounds", references: [] };
  return units;
}

/** Source/run/turn gates are owned by registry/lifecycle/store. Never replace answer text. */
export function youtubeEvidenceTranscript(snapshot: TranscriptSnapshot, source: YoutubeSourceContent): TranscriptSnapshot {
  if (snapshot.identity?.sourceId !== source.id) return { ...snapshot, turns: [] };
  return { ...snapshot, turns: snapshot.turns.map(turn => turn.role !== "assistant" ? turn : { ...turn,
    parts: turn.parts.map(part => {
      if (part.kind !== "output_text") return part;
      const terminal = snapshot.phase !== "active" || turn.generation !== "generating";
      const completed = turn.generation === "completed" && part.state === "final" && !turn.interrupted;
      try { return { ...part, evidence: resolveYoutubeEvidence(part.text, source, terminal, completed) }; }
      catch { return { ...part, evidence: [{ start: 0, end: 0, state: !terminal ? "pending" : completed ? "unconfirmed" : "incomplete",
        reason: "invalid_source", references: [] }] as readonly YoutubeEvidenceUnit[] }; }
    }) }) };
}
