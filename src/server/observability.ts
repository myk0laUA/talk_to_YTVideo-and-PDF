import "server-only";
import { performance } from "node:perf_hooks";

// Fixed labels/buckets: never retain SQL, URLs, cookies, prompts, or document text.
export type Operation = "http.source.read" | "http.source.upload" | "http.source.remove" | "http.youtube"
  | "http.voice.prepare" | "http.voice.credential" | "http.voice.cancel" | "http.text.start"
  | "http.text.question" | "http.text.stop" | "http.text.stream" | "db.query" | "db.source.get" | "pdf.parse";
const bounds = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 3000, 10000, Infinity];
type Metric = { count: number; errors: number; totalMs: number; maxMs: number; buckets: number[] };
const state = globalThis as unknown as { operationalMetrics?: Map<Operation, Metric>; operationalTimer?: ReturnType<typeof setInterval> };
const metrics = state.operationalMetrics ??= new Map<Operation, Metric>();
export function observe(operation: Operation, durationMs: number, failed = false) {
  if (process.env.OPERATIONAL_METRICS !== "true") return;
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const metric = metrics.get(operation) ?? { count: 0, errors: 0, totalMs: 0, maxMs: 0, buckets: bounds.map(() => 0) };
  metric.count++; metric.errors += Number(failed); metric.totalMs += durationMs;
  metric.maxMs = Math.max(metric.maxMs, durationMs);
  metric.buckets[bounds.findIndex(bound => durationMs <= bound)]++;
  metrics.set(operation, metric);
}
export async function measured<T>(operation: Operation, work: () => Promise<T>): Promise<T> {
  const start = performance.now(); let failed = false;
  try { return await work(); } catch (error) { failed = true; throw error; }
  finally { observe(operation, performance.now() - start, failed); }
}
export function instrument<Args extends unknown[]>(operation: Operation, handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    const start = performance.now(); let status = 500;
    try { const response = await handler(...args); status = response.status; return response; }
    finally { observe(operation, performance.now() - start, status >= 400); }
  };
}
export function metricSnapshot(reset = false) {
  const snapshot = { boundsMs: bounds.map(x => Number.isFinite(x) ? x : "Infinity"), operations: structuredClone(Object.fromEntries(metrics)) };
  if (reset) metrics.clear();
  return snapshot;
}
export function startOperationalLogging(pool: () => { total: number; idle: number; waiting: number }) {
  if (process.env.OPERATIONAL_METRICS !== "true" || state.operationalTimer) return;
  let cpu = process.cpuUsage(), time = performance.now();
  state.operationalTimer = setInterval(() => {
    const now = performance.now(), usage = process.cpuUsage(cpu);
    cpu = process.cpuUsage();
    console.info(JSON.stringify({ event: "operational_metrics", intervalMs: now - time,
      cpuCorePercent: (usage.user + usage.system) / ((now - time) * 10), rssBytes: process.memoryUsage().rss,
      pool: pool(), ...metricSnapshot(true) }));
    time = now;
  }, 10000);
  state.operationalTimer.unref();
}
