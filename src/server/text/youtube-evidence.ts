import "server-only";
import type { YoutubeSourceContent } from "../../shared/source.ts";
import type { TranscriptSnapshot } from "../../shared/transcript.ts";
import type { YoutubeEvidenceUnit } from "../../shared/youtube-evidence.ts";

export const EVIDENCE_LIMITS = Object.freeze({ units: 8, claim: 600, refs: 3, quote: 240, characters: 16_000, depth: 16 });
export type EvidenceRejection = "framing" | "schema" | "unknown_id" | "quote_mismatch" | "bounds" | "incomplete" | "missing_references";
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const space = (c: string) => /\s/u.test(c);

/** Complete JSON escapes only; unfinished escape bytes never become display text. */
function stringToken(raw: string, start: number) {
  let end = start + 1;
  while (end < raw.length) {
    const c = raw[end];
    if (c === '"') { try { return { text: JSON.parse(raw.slice(start, end + 1)) as string, end: end + 1, closed: true }; } catch { break; } }
    if (c.charCodeAt(0) < 32) break;
    if (c === "\\") {
      const escape = raw[end + 1];
      if (!escape) break;
      if (escape === "u") { if (!/^[a-f0-9]{4}$/iu.test(raw.slice(end + 2, end + 6))) break; end += 6; }
      else if ('"\\/bfnrt'.includes(escape)) end += 2;
      else break;
    } else end++;
  }
  try { return { text: JSON.parse(raw.slice(start, end) + '"') as string, end, closed: false }; }
  catch { return { text: "", end, closed: false }; }
}

/** Recover only a top-level named claim string, never a nested quote/ref or arbitrary field. */
function partialClaim(raw: string) {
  let depth = 0, key = false;
  for (let i = 0; i < raw.length;) {
    const c = raw[i];
    if (c === '"') {
      const token = stringToken(raw, i);
      if (depth === 1 && key && token.closed && token.text === "claim") {
        let at = token.end; while (space(raw[at] ?? "")) at++;
        if (raw[at++] !== ":") return;
        while (space(raw[at] ?? "")) at++;
        return raw[at] === '"' ? stringToken(raw, at).text.slice(0, EVIDENCE_LIMITS.claim) : undefined;
      }
      i = Math.max(i + 1, token.end); key = false; continue;
    }
    if (c === "{" || c === "[") { depth++; key = depth === 1; }
    if (c === "}" || c === "]") depth--;
    if (c === "," && depth === 1) key = true;
    i++;
  }
}

/** Locate a complete object without interpreting braces inside strings. No resynchronizing repair. */
function objectEnd(raw: string, start: number) {
  const stack: string[] = [];
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') { const token = stringToken(raw, i); if (!token.closed) return { end: raw.length, closed: false }; i = token.end - 1; continue; }
    if (c === "{" || c === "[") { stack.push(c); if (stack.length > EVIDENCE_LIMITS.depth) return { end: raw.length, closed: false, bounds: true }; }
    if (c === "}" || c === "]") {
      if (stack.pop() !== (c === "}" ? "{" : "[")) return { end: raw.length, closed: false, malformed: true };
      if (!stack.length) return { end: i + 1, closed: true };
    }
  }
  return { end: raw.length, closed: false };
}
function natural(text: string) { return text.replace(/https?:\/\/\S+|\[segment-[^\]]*\]/giu, "").trim(); }

/** Whitespace runs only. Index mapping returns original stored characters, not a normalized quote. */
function originalExcerpt(original: string, quote: string): string | undefined {
  const exact = original.indexOf(quote); if (exact >= 0) return original.slice(exact, exact + quote.length);
  let normalized = ""; const starts: number[] = [], ends: number[] = [];
  for (let i = 0; i < original.length;) {
    const start = i, whitespace = space(original[i]);
    if (whitespace) { while (i < original.length && space(original[i])) i++; } else i++;
    normalized += whitespace ? " " : original[start]; starts.push(start); ends.push(i);
  }
  const q = quote.replace(/\s+/gu, " "), at = normalized.indexOf(q);
  return at < 0 ? undefined : original.slice(starts[at], ends[at + q.length - 1]);
}

/** Bounded supported formats: object sequence, optional JSON fence, or array of objects;
 * natural prose outside objects remains unconfirmed. No source text or diagnostics are logged. */
export function analyzeYoutubeEvidence(raw: string, source: YoutubeSourceContent, terminal: boolean, completed: boolean) {
  const counts: Record<EvidenceRejection, number> = { framing: 0, schema: 0, unknown_id: 0, quote_mismatch: 0, bounds: 0, incomplete: 0, missing_references: 0 };
  let first: EvidenceRejection | undefined, matched = 0;
  const reject = (reason: EvidenceRejection) => { first ??= reason; counts[reason]++; };
  const units: YoutubeEvidenceUnit[] = [], sections = new Map(source.sections.map(s => [s.id, s]));
  let text = raw.slice(0, EVIDENCE_LIMITS.characters), wrapperComplete = true, framing = false;
  const opening = /^\s*```(?:json)?[ \t]*\r?\n/u.exec(text);
  if (opening) {
    text = text.slice(opening[0].length);
    const closing = /\r?\n```[ \t]*\s*$/u.exec(text);
    if (closing) text = text.slice(0, closing.index); else wrapperComplete = false;
  }
  const array = text.trimStart().startsWith("[");
  if (array) {
    text = text.trim(); wrapperComplete &&= text.endsWith("]");
    if (wrapperComplete) { try { if (!Array.isArray(JSON.parse(text))) framing = true; } catch { framing = true; } }
    text = text.slice(1, text.endsWith("]") ? -1 : undefined);
  }
  let pos = 0, excess = raw.length > EVIDENCE_LIMITS.characters;
  const add = (claim: string, state: YoutubeEvidenceUnit["state"], references: YoutubeEvidenceUnit["references"] = []) => {
    const value = natural(claim.slice(0, EVIDENCE_LIMITS.claim));
    units.push({ text: value, state: !value && (state === "unconfirmed" || state === "matched" || terminal && state === "incomplete") ? "format_error" : state, references });
  };
  while (pos < text.length) {
    while (pos < text.length && (space(text[pos]) || array && text[pos] === ",")) pos++;
    if (pos >= text.length) break;
    if (units.length >= EVIDENCE_LIMITS.units) { excess = true; break; }
    if (text[pos] !== "{") {
      let end = pos; while (end < text.length && text[end] !== "\n" && text[end] !== "{") end++;
      const line = text.slice(pos, end).trim();
      const plain = !array && !/[{}\[\]`]/u.test(line) && !line.startsWith('"') ? line : "";
      reject("framing"); add(plain, !terminal && end === text.length ? "pending" : "unconfirmed");
      pos = Math.max(pos + 1, end); continue;
    }
    const end = objectEnd(text, pos), chunk = text.slice(pos, end.end); pos = end.end;
    let parsed: unknown;
    if (end.closed) { try { parsed = JSON.parse(chunk); } catch { /* Recover only the named string below. */ } }
    const claim = record(parsed) && typeof parsed.claim === "string" ? parsed.claim : partialClaim(chunk) ?? "";
    const delimited = completed || /[\r\n]/u.test(text.slice(pos, text.indexOf("{", pos) < 0 ? text.length : text.indexOf("{", pos))) || array && wrapperComplete;
    if (end.bounds) { reject("bounds"); add(claim, "incomplete"); break; }
    if (end.malformed) { reject("framing"); add(claim, "unconfirmed"); continue; }
    if (!end.closed || !wrapperComplete || !delimited) {
      if (terminal) reject("incomplete"); add(claim, terminal ? "incomplete" : "pending"); continue;
    }
    if (framing || end.malformed || !record(parsed)) { reject("framing"); add(claim, "unconfirmed"); continue; }
    if (Object.keys(parsed).sort().join() !== "claim,refs" || typeof parsed.claim !== "string" || !claim.trim() || !Array.isArray(parsed.refs)
      || natural(claim) !== claim.trim() || !/^[A-Za-z0-9_-]{11}$/u.test(source.videoId)) { reject("schema"); add(claim, "unconfirmed"); continue; }
    if (claim.length > EVIDENCE_LIMITS.claim || parsed.refs.length > EVIDENCE_LIMITS.refs) { reject("bounds"); add(claim, "unconfirmed"); continue; }
    if (!parsed.refs.length) { reject("missing_references"); add(claim, "unconfirmed"); continue; }
    const references: YoutubeEvidenceUnit["references"][number][] = []; let reason: EvidenceRejection | undefined;
    for (const pair of parsed.refs) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string") { reason = "schema"; break; }
      if (pair[1].length > EVIDENCE_LIMITS.quote) { reason = "bounds"; break; }
      const section = sections.get(pair[0]);
      if (!section || !Number.isFinite(section.startSeconds) || section.startSeconds < 0) { reason = "unknown_id"; break; }
      const excerpt = pair[1].trim() ? originalExcerpt(section.text, pair[1]) : undefined;
      if (excerpt === undefined) { reason = "quote_mismatch"; break; }
      if (excerpt.length > EVIDENCE_LIMITS.quote) { reason = "bounds"; break; }
      references.push({ segmentId: section.id, excerpt, startSeconds: section.startSeconds, url: `https://www.youtube.com/watch?v=${source.videoId}&t=${section.startSeconds}s` });
    }
    if (reason) { reject(reason); add(claim, "unconfirmed"); }
    else { matched++; add(claim, "matched", references); }
  }
  if (excess) {
    reject("bounds"); if (units.length === EVIDENCE_LIMITS.units) units.pop();
    units.push({ text: "Further answer text exceeded the source-reference limit.", state: "incomplete", references: [] });
  }
  if (!units.length && terminal && (raw.trim() || completed)) { reject("framing"); add("", "unconfirmed"); }
  return { units, diagnostics: { characters: raw.length, records: units.length, matched, first, counts } };
}
/** Private content-free projection only; no built-in capture, persistence or wire exposure. */
export function diagnoseYoutubeEvidence(raw: string, source: YoutubeSourceContent, terminal: boolean, completed: boolean) {
  return analyzeYoutubeEvidence(raw, source, terminal, completed).diagnostics;
}
export function resolveYoutubeEvidence(raw: string, source: YoutubeSourceContent, terminal: boolean, completed: boolean): readonly YoutubeEvidenceUnit[] {
  return analyzeYoutubeEvidence(raw, source, terminal, completed).units;
}
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
