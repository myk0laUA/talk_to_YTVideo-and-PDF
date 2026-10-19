import { getEventListeners } from "node:events";
import assert from "node:assert/strict";
import { VoiceLifecycle, type VoiceAdapters, type VoiceIdentity, type VoiceMedia, type VoiceConnection, type VoiceStatus, type VoiceTrack } from "../../src/shared/voice-lifecycle.ts";
import { encodeManifest } from "../../src/shared/priming-manifest.ts";
import type { PrimingInput } from "../../src/shared/priming-admission.ts";
import type { PrimingStatus } from "../../src/shared/priming-controller.ts";
import { FakeClock, ScriptedTransport, SyntheticPrimingController, fixture, flush } from "./harness.ts";

export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export class Track implements VoiceTrack {
  enabled = false; readyState = "live"; stops = 0; removals = 0; throws = false;
  listeners = new Set<() => void>(); stale?: () => void;
  stop() { this.stops++; this.readyState = "ended"; if (this.throws) throw new Error("SECRET"); }
  subscribeEnded(callback: () => void) {
    this.listeners.add(callback); this.stale = callback;
    return () => { this.removals++; this.listeners.delete(callback); if (this.throws) throw new Error("SECRET"); };
  }
  end() { this.readyState = "ended"; for (const callback of this.listeners) callback(); }
}
export function resources() {
  const transport = new ScriptedTransport(), tracks = [new Track(), new Track()];
  const counts = { closes: 0, playbackReleases: 0, plays: 0, mediaReleases: 0, attaches: 0 };
  let throwing = false;
  const playback = { play: async () => { counts.plays++; }, release: () => { counts.playbackReleases++; if (throwing) throw new Error("SECRET"); } };
  const connection: VoiceConnection = { transport, playback, close: () => { counts.closes++; transport.close(); if (throwing) throw new Error("SECRET"); } };
  const media: VoiceMedia = { tracks, attach: () => { assert.ok(tracks.every(t => !t.enabled)); counts.attaches++; },
    release: () => { counts.mediaReleases++; if (throwing) throw new Error("SECRET"); } };
  return { transport, tracks, counts, connection, media, throwing: () => { throwing = true; tracks.forEach(t => t.throws = true); } };
}
export async function voiceHarness(production = false) {
  const a = await fixture(), b = await fixture("YOUTUBE");
  const clock = new FakeClock(), states: VoiceStatus[] = [], signals: AbortSignal[] = [];
  const all: ReturnType<typeof resources>[] = [];
  const inputs = new Map<string, PrimingInput>();
  const calls = { prepare: 0, connect: 0, media: 0 };
  let selected = a;
  const makeInput = (identity: VoiceIdentity) => {
    const f = identity.sourceId === a.row.id ? a : b;
    const manifest = encodeManifest(f.prepared.variants.B, identity.runId, "voice", 2048);
    const input = { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } };
    inputs.set(identity.runId, input); return input;
  };
  const adapters: VoiceAdapters = {
    prepare: async identity => makeInput(identity),
    connect: async () => { const r = resources(); all.push(r); return r.connection; },
    acquireMedia: async () => all.at(-1)!.media,
  };
  class ScriptedVoice extends VoiceLifecycle {
    protected override createPriming(notify: (s: PrimingStatus) => void, primed: () => void) {
      return new SyntheticPrimingController(clock, notify, primed, 1000);
    }
  }
  const Controller = production ? VoiceLifecycle : ScriptedVoice;
  // Instrument at the boundary so replacing a handler cannot hide pending acquisitions.
  const counted: VoiceAdapters = {
    prepare: (identity, signal) => { calls.prepare++; signals.push(signal); return adapters.prepare(identity, signal); },
    connect: (identity, signal) => { calls.connect++; return adapters.connect(identity, signal); },
    acquireMedia: (identity, signal) => { calls.media++; return adapters.acquireMedia(identity, signal); },
  };
  const controller = new Controller(clock, counted, s => states.push(s), { preparationMs: 100, connectionMs: 200, primingMs: 1000, mediaMs: 300 });
  const begin = async () => { assert.equal(controller.start(selected.row.id), true); await flush(); };
  const config = async () => { const r = all.at(-1)!; r.transport.emit(r.transport.config()); await flush(); };
  const items = async (withhold = false) => {
    const r = all.at(-1)!, input = inputs.get(controller.snapshot.identity!.runId)!;
    for (const item of input.manifest.items.slice(withhold ? 1 : 0)) r.transport.emit(r.transport.item(item));
    await flush();
  };
  const final = async () => { const r = all.at(-1)!; r.transport.emit(r.transport.config()); await flush(); };
  const ready = async () => { await config(); await items(); await final(); };
  const clean = () => {
    controller.stop();
    assert.equal(clock.timers.size, 0);
    for (const signal of signals) assert.equal(getEventListeners(signal, "abort").length, 0);
    for (const r of all) {
      assert.equal(r.counts.closes, 1); assert.equal(r.transport.closes, 1);
      assert.equal(r.counts.playbackReleases, 1); assert.equal(r.transport.receive, undefined);
      assert.equal(r.transport.unsubscribes, r.transport.outbound.length ? 1 : 0);
      for (const t of r.tracks) assert.equal(t.listeners.size, 0);
    }
  };
  const trace = (scenario: string) => ({ scenario, states: states.map(s => ({ ...s, identity: s.identity ? {
    source: s.identity.sourceId === a.row.id ? "A" : "B", runId: s.identity.runId, connectionId: s.identity.connectionId } : undefined })),
    calls, resources: all.map(r => ({ ...r.counts, transportCloses: r.transport.closes, unsubscribes: r.transport.unsubscribes,
      outbound: r.transport.outbound.length, questionSends: r.transport.outbound.filter(e => (e as { type: string }).type === "response.create").length,
      stops: r.tracks.map(t => t.stops), enabled: r.tracks.map(t => t.enabled), listeners: r.tracks.map(t => t.listeners.size) })),
    timers: clock.timers.size, abortListeners: signals.map(s => getEventListeners(s, "abort").length) });
  return { controller, clock, states, signals, all, calls, adapters, a, b, inputs, makeInput, begin, config, items, final, ready, clean, trace,
    selectB: () => { selected = b; } };
}
