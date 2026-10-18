// Explicit Node --import preload, never imported/traced by application code.
// Reuses the existing private lazy-client slot; no request/config mock selectors.
import { SyntheticSourceDatabase } from "./database.ts";
const database = new SyntheticSourceDatabase();
globalThis.database = database.asClient();
const realNow = Date.now;
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;
process.on("message", message => {
  if (!message?.sourceTestCommand) return;
  const { sourceTestCommand: command, requestId } = message;
  if (command === "seed") {
    const value = { ...message.row, expiresAt: new Date(message.row.expiresAt) };
    database.rows.set(value.id, value);
  } else if (command === "fail-create") database.failCreate = true;
  else if (command === "fail-cache-read") database.failCacheRead = true;
  else if (command === "fail-cache-write") database.failCacheWrite = true;
  else if (command === "expire-cache") { for (const row of database.cacheRows.values()) row.expiresAt = new Date(0); }
  else if (command === "configure-cache") {
    // Explicit test process IPC, never reachable from HTTP/application code.
    process.env.YOUTUBE_CAPTION_CACHE_BYPASS = message.bypass ? "true" : "false";
    if (message.provider) process.env.YOUTUBE_INGESTION_PROVIDER = message.provider;
    if (message.key !== undefined) process.env.SUPADATA_API_KEY = message.key;
  }
  else if (command === "delay-create") database.delayCreateMs = message.ms;
  else if (command === "delay-read") database.delayReadMs = message.ms;
  else if (command === "advance-clock") clockOffset += message.ms;
  else if (command === "delay-cache-read") database.delayCacheReadMs = message.ms;
  else if (command !== "snapshot") throw new Error("Unknown test command");
  process.send?.({ sourceTestReply: requestId, snapshot: {
    ids: [...database.rows.keys()], uploaded: [...database.rows.values()].filter(row => row.activeSourceOwner !== null).length,
    transactions: database.transactions, creates: database.creates, reads: database.reads, deletes: database.deletes,
    cacheRows: database.cacheRows.size, cacheReads: database.cacheReads, cacheWrites: database.cacheWrites,
    cacheExpiries: [...database.cacheRows.values()].map(row => row.expiresAt.toISOString()),
    coordinatorJobs: globalThis.captionCoordinator06b?.size ?? 0,
    captionAdmission: globalThis.captionAdmission06b ? {
      participants: globalThis.captionAdmission06b.participants.size,
      active: globalThis.captionAdmission06b.requests.active.size,
      total: globalThis.captionAdmission06b.requests.total,
      lifetime: globalThis.captionAdmission06b.requests.lifetime,
      visitorCounts: [...globalThis.captionAdmission06b.requests.visitors.values()].sort(),
      ipCounts: [...globalThis.captionAdmission06b.requests.ips.values()],
    } : null,
  } });
});
