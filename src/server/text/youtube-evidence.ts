import "server-only";
import type { YoutubeSourceContent } from "../../shared/source.ts";
import type { TranscriptSnapshot } from "../../shared/transcript.ts";
import type { YoutubeEvidenceUnit } from "../../shared/youtube-evidence.ts";

export const EVIDENCE_LIMITS = Object.freeze({ units: 8, claim: 600, refs: 3, quote: 240, characters: 16_000 });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Decode a streamed claim string without exposing its surrounding control syntax.
 * Only complete JSON escapes are decoded; an unfinished escape is retained privately.
 */
function claimPrefix(line: string): string | undefined {
  const prefix = /^\s*\{?\s*"claim"\s*:\s*"/u.exec(line);
  if (!prefix) return;
  const start = prefix[0].length;
  let end = start;
  while (end < line.length && end - start <= EVIDENCE_LIMITS.claim * 6) {
    const c = line[end];
    if (c === '"' || c.charCodeAt(0) < 32) break;
    if (c === "\\") {
      const escape = line[end + 1];
      if (!escape) break;
      if (escape === "u") { if (!/^[a-f0-9]{4}$/iu.test(line.slice(end + 2, end + 6))) break; end += 6; }
      else if ('"\\/bfnrt'.includes(escape)) end += 2;
      else break;
    } else end++;
  }
  try { return (JSON.parse('"' + line.slice(start, end) + '"') as string).slice(0, EVIDENCE_LIMITS.claim); }
  catch { return; }
}

// Provider-authored locators/links are never displayed as evidence, even inside a claim.
function natural(text: string) {
  return text.replace(/https?:\/\/\S+|\[segment-[^\]]*\]/giu, "").trim();
}

/** Exact substring membership, with NO whitespace/newline/Unicode normalization.
 * This accepts an authentic but unrelated quote: semantic support requires separate review.
 */
export function resolveYoutubeEvidence(raw: string, source: YoutubeSourceContent, terminal: boolean,
  completed: boolean): readonly YoutubeEvidenceUnit[] {
  const units: YoutubeEvidenceUnit[] = [];
  const sections = new Map(source.sections.map(s => [s.id, s]));
  const bounded = raw.slice(0, EVIDENCE_LIMITS.characters);
  const lines = bounded.split("\n");
  for (let i = 0; i < lines.length && units.length < EVIDENCE_LIMITS.units; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const ended = i < lines.length - 1 || completed && raw.length <= EVIDENCE_LIMITS.characters;
    let parsed: unknown;
    if (ended) { try { parsed = JSON.parse(line); } catch { /* Preserve a readable prefix, never JSON. */ } }
    const candidate = record(parsed) && typeof parsed.claim === "string" ? parsed.claim : claimPrefix(line);
    const plain = candidate === undefined && !/[{}\[\]`]/u.test(line) && !line.trimStart().startsWith('"') ? line : "";
    const text = natural((candidate ?? plain).slice(0, EVIDENCE_LIMITS.claim));
    const invalid = (): YoutubeEvidenceUnit => ({ text, state: "unconfirmed", references: [] });
    if (!ended) { units.push({ text, state: terminal ? "incomplete" : "pending", references: [] }); continue; }
    if (!record(parsed) || Object.keys(parsed).sort().join() !== "claim,refs" || typeof parsed.claim !== "string"
      || !text || text !== parsed.claim.trim() || parsed.claim.length > EVIDENCE_LIMITS.claim
      || !Array.isArray(parsed.refs) || !parsed.refs.length || parsed.refs.length > EVIDENCE_LIMITS.refs
      || !/^[A-Za-z0-9_-]{11}$/u.test(source.videoId)) { units.push(invalid()); continue; }
    const references: YoutubeEvidenceUnit["references"][number][] = [];
    for (const pair of parsed.refs) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string"
        || !pair[1].trim() || pair[1].length > EVIDENCE_LIMITS.quote) break;
      const section = sections.get(pair[0]);
      if (!section || !Number.isFinite(section.startSeconds) || section.startSeconds < 0) break;
      const at = section.text.indexOf(pair[1]);
      if (at < 0) break;
      references.push({ segmentId: section.id, excerpt: section.text.slice(at, at + pair[1].length),
        startSeconds: section.startSeconds,
        url: `https://www.youtube.com/watch?v=${source.videoId}&t=${section.startSeconds}s` });
    }
    units.push(references.length === parsed.refs.length ? { text, state: "matched", references } : invalid());
  }
  if (raw.length > EVIDENCE_LIMITS.characters || lines.filter(l => l.trim()).length > EVIDENCE_LIMITS.units) {
    // Never silently drop excess material as though the answer were complete.
    if (units.length === EVIDENCE_LIMITS.units) units.pop();
    units.push({ text: "Further answer text exceeded the source-reference limit.", state: "incomplete", references: [] });
  }
  return units;
}

/** Registry-only projection: raw provider text/JSON never crosses this scoped wire.
 * Snapshot identity prevents accidental reuse with another source; lifecycle gates own run/turn correlation.
 */
export function youtubeEvidenceTranscript(snapshot: TranscriptSnapshot, source: YoutubeSourceContent): TranscriptSnapshot {
  if (snapshot.identity?.sourceId !== source.id) return { ...snapshot, turns: [] };
  return { ...snapshot, turns: snapshot.turns.map(turn => turn.role !== "assistant" ? turn : { ...turn,
    parts: turn.parts.map(part => {
      if (part.kind !== "output_text") return part;
      const terminal = snapshot.phase !== "active" || turn.generation !== "generating";
      const evidence = resolveYoutubeEvidence(part.text, source, terminal, turn.generation === "completed" && part.state === "final");
      return { ...part, text: evidence.map(u => u.text).filter(Boolean).join("\n"), evidence };
    }) }) };
}
