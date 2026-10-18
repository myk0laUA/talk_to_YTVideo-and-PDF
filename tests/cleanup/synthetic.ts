import assert from "node:assert/strict";
import type { BatchRequest, CleanupStore, CleanupTable } from "../../src/server/cleanup/service.ts";

export type SyntheticRow = { id: string; expiresAt: Date; body: string; owner: string; activeOwner?: string; status?: string };
// Orchestration simulation only: this deliberately makes no PostgreSQL guarantee.
export class SyntheticCleanupStore implements CleanupStore {
  rows: Record<CleanupTable, SyntheticRow[]> = { Source: [], TranscriptCache: [] };
  calls: BatchRequest[] = [];
  afterSelect?: (request: BatchRequest, ids: string[]) => Promise<void> | void;
  beforeCommit?: (request: BatchRequest) => void;
  batch = async (request: BatchRequest) => {
    this.calls.push(request);
    request.guard();
    const { table, cutoff, cursor, limit } = request;
    const selected = this.rows[table].filter(row => row.expiresAt <= cutoff && (!cursor
      || row.expiresAt > cursor.expiresAt || (+row.expiresAt === +cursor.expiresAt && row.id > cursor.id)))
      .sort((a, b) => +a.expiresAt - +b.expiresAt || a.id.localeCompare(b.id)).slice(0, limit);
    // Copy cursor before a simulated concurrent refresh mutates its expiry.
    const last = selected.at(-1);
    const next = last ? { id: last.id, expiresAt: new Date(last.expiresAt) } : undefined;
    const ids = selected.map(row => row.id);
    await this.afterSelect?.(request, ids);
    request.guard(); this.beforeCommit?.(request); request.guard();
    const eligible = this.rows[table].filter(row => ids.includes(row.id) && row.expiresAt <= cutoff);
    if (request.execute) this.rows[table] = this.rows[table].filter(row => !eligible.includes(row));
    return { selected: selected.length, deleted: request.execute ? eligible.length : 0, cursor: next };
  };
}
export function fixture() {
  const store = new SyntheticCleanupStore();
  for (const table of ["Source", "TranscriptCache"] as const) {
    store.rows[table] = [
      { id: "03", expiresAt: new Date(999), body: "private", owner: "old", status: "FAILED" },
      { id: "02", expiresAt: new Date(999), body: "proof", owner: "legacy", status: "PENDING" },
      { id: "04", expiresAt: new Date(1000), body: "boundary", owner: "boundary" },
      { id: "05", expiresAt: new Date(1001), body: "live", owner: "live", activeOwner: "live" },
      { id: "01", expiresAt: new Date(998), body: "old", owner: "oldest" },
    ];
  }
  return store;
}
export function assertLivePreserved(store: SyntheticCleanupStore) {
  for (const table of ["Source", "TranscriptCache"] as const) {
    assert.deepEqual(store.rows[table], [{ id: "05", expiresAt: new Date(1001), body: "live", owner: "live", activeOwner: "live" }]);
  }
}
