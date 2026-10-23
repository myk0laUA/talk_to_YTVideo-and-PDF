import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import type { CaptionTranscript } from "../../shared/captions.ts";
import { readBounded } from "./bounded-body.ts";
import { validSupadataKey } from "./config.ts";
import { CaptionError } from "./errors.ts";
import { matchesCaptionLanguage, normalizeVideo, validLanguage } from "./input.ts";
import { captionBounds, normalizeSegments, type CaptionProvider } from "./provider.ts";

const endpoint = "https://api.supadata.ai/v1/transcript";
export const supadataBounds = { deadlineMs: 15000, polls: 5, pollIntervalMs: 1000,
  responseBytes: captionBounds.transcriptBytes, errorBytes: 8192 } as const;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const malformed = () => new CaptionError("malformed", "Caption service returned an unsupported or incomplete response");

export function normalizeSupadata(raw: unknown, videoId: string): CaptionTranscript {
  if (!record(raw) || !validLanguage(raw.lang) || !Array.isArray(raw.content)
    || "error" in raw || ("status" in raw && raw.status !== "completed")) throw malformed();
  if (raw.content.length > captionBounds.segments) throw new CaptionError("too_large", "Transcript exceeds 20000 segments");
  const language = raw.lang;
  const segments = raw.content.map(value => {
    // Validate milliseconds before division, including overflow; never coerce strings or skip chunks.
    if (!record(value) || typeof value.offset !== "number" || !Number.isFinite(value.offset) || value.offset < 0
      || typeof value.duration !== "number" || !Number.isFinite(value.duration) || value.duration < 0
      || !Number.isFinite(value.offset + value.duration) || value.lang !== language) throw malformed();
    return { text: value.text, offset: value.offset / 1000, duration: value.duration / 1000, lang: language };
  });
  return { ...normalizeSegments(segments, videoId), provider: "supadata" };
}

function limitFailure(raw: unknown): CaptionError {
  if (record(raw) && raw.error === "limit-exceeded") {
    if (raw.details === "Plan usage limit was exceeded.") return new CaptionError("quota_exhausted", "Caption service quota exhausted; operator action required");
    if (["Global request rate limit was exceeded.", "Request rate limit on current plan was exceeded."].includes(raw.details as string)) {
      return new CaptionError("rate_limited", "Caption service request rate exceeded");
    }
  }
  return new CaptionError("provider_limited", "Caption service limit could not be identified; operator review required");
}

export function createSupadataCaptionProvider(options: {
  apiKey?: string; fetch?: typeof fetch; deadlineMs?: number;
  // Test injection only. Runtime always uses the abortable timer below and the fixed interval.
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}): CaptionProvider {
  const network = options.fetch ?? fetch;
  const wait = options.wait ?? (async (ms, signal) => {
    const until = performance.now() + ms;
    do { await delay(Math.max(1, Math.ceil(until - performance.now())), undefined, { signal }); }
    while (performance.now() < until);
  });
  return async input => {
    if (!validSupadataKey(options.apiKey)) return { ok: false, error: { code: "disabled", message: "Caption service configuration unavailable" } };
    const video = normalizeVideo(input.videoId);
    if (!video || video.videoId !== input.videoId || (input.language !== undefined && !validLanguage(input.language))) {
      return { ok: false, error: { code: "invalid_input", message: "Invalid video ID or language" } };
    }
    const deadline = new AbortController();
    const budget = Math.min(options.deadlineMs ?? supadataBounds.deadlineMs, supadataBounds.deadlineMs);
    const started = performance.now();
    const timer = setTimeout(() => deadline.abort(), budget);
    const signal = AbortSignal.any([input.signal, deadline.signal]);
    const check = () => {
      if (performance.now() - started >= budget) deadline.abort();
      signal.throwIfAborted();
    };
    try {
      const get = async (url: URL): Promise<{ status: number; raw: unknown }> => {
        check();
        const response = await network(url, { method: "GET", headers: { "x-api-key": options.apiKey! },
          signal, redirect: "manual", credentials: "omit", cache: "no-store" });
        const cancel = () => { void response.body?.cancel().catch(() => {}); };
        if (![200, 202, 429].includes(response.status)) {
          cancel();
          const code = response.status === 206 ? "no_captions" : response.status === 404 ? "unavailable"
            : [401, 402, 403].includes(response.status) || (response.status >= 300 && response.status < 400) ? "blocked" : "upstream_failure";
          throw new CaptionError(code, response.status === 206 ? "No existing captions available"
            : response.status === 401 ? "Caption service authentication rejected"
            : response.status === 402 ? "Caption service plan does not permit this request"
            : code === "blocked" ? "Caption service access rejected" : code === "unavailable" ? "Caption resource unavailable" : "Caption service request failed",
          "transcript", response.status);
        }
        const cap = response.status === 429 ? supadataBounds.errorBytes : supadataBounds.responseBytes;
        if (Number(response.headers.get("content-length")) > cap) {
          cancel(); throw new CaptionError("too_large", "Caption service response exceeds the proof byte limit");
        }
        const text = await readBounded(response.body, cap, signal);
        check();
        let raw: unknown;
        try { raw = JSON.parse(text); } catch {
          if (response.status === 429) throw limitFailure(null);
          throw malformed();
        }
        if (response.status === 429) throw limitFailure(raw);
        return { status: response.status, raw };
      };
      const url = new URL(endpoint);
      url.searchParams.set("url", video.canonicalUrl);
      url.searchParams.set("mode", "native");
      url.searchParams.set("text", "false");
      if (input.language) url.searchParams.set("lang", input.language);
      const initial = await get(url); // Exactly once, including when a job is returned.
      let raw = initial.raw;
      if (initial.status === 202) {
        if (!record(raw) || typeof raw.jobId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(raw.jobId)
          || "content" in raw || "error" in raw) throw malformed();
        const jobUrl = new URL(`${endpoint}/${raw.jobId}`);
        let completed = false;
        for (let poll = 0; poll < supadataBounds.polls; poll++) {
          check(); await wait(supadataBounds.pollIntervalMs, signal); check();
          const result = await get(jobUrl);
          raw = result.raw;
          // Raw HTTP job fields are flat, unlike the SDK's result wrapper.
          if (result.status !== 200 || !record(raw)) throw malformed();
          if (raw.status === "completed") { completed = true; break; }
          if (raw.status === "failed") {
            if (record(raw.error) && raw.error.error === "limit-exceeded") throw limitFailure(raw.error);
            throw new CaptionError("upstream_failure", "Caption service job failed");
          }
          if (!["queued", "active"].includes(raw.status as string) || "content" in raw || "error" in raw) throw malformed();
        }
        if (!completed) throw new CaptionError("timeout", "Caption job exceeded the proof polling limit");
      }
      const transcript = normalizeSupadata(raw, input.videoId);
      if (!matchesCaptionLanguage(transcript.language, input.language)) {
        throw new CaptionError("no_captions", "Captions unavailable for the requested language");
      }
      check();
      return { ok: true, transcript };
    } catch (error) {
      if (input.signal.aborted) return { ok: false, error: { code: "cancelled", message: "Caption request cancelled", stage: "transcript" } };
      if (deadline.signal.aborted || performance.now() - started >= budget) return { ok: false, error: {
        code: "timeout", message: "Caption service exceeded the total upstream deadline", stage: "transcript" } };
      if (error instanceof CaptionError) return { ok: false, error: { ...error.failure, stage: "transcript" } };
      return { ok: false, error: { code: "upstream_failure", message: "Caption service request failed", stage: "transcript" } };
    } finally { clearTimeout(timer); }
  };
}
