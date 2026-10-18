// Explicit Node --import preload, never imported/traced by application code.
// Reuses the existing private lazy-client slot; no request/config mock selectors.
import { SyntheticSourceDatabase } from "./database.ts";
const database = new SyntheticSourceDatabase();
globalThis.database = database.asClient();
process.on("message", message => {
  if (!message?.sourceTestCommand) return;
  const { sourceTestCommand: command, requestId } = message;
  if (command === "seed") {
    const value = { ...message.row, expiresAt: new Date(message.row.expiresAt) };
    database.rows.set(value.id, value);
  } else if (command === "fail-create") database.failCreate = true;
  else if (command === "delay-create") database.delayCreateMs = message.ms;
  else if (command === "delay-read") database.delayReadMs = message.ms;
  else if (command !== "snapshot") throw new Error("Unknown test command");
  process.send?.({ sourceTestReply: requestId, snapshot: {
    ids: [...database.rows.keys()], uploaded: [...database.rows.values()].filter(row => row.activeSourceOwner !== null).length,
    transactions: database.transactions, creates: database.creates, reads: database.reads, deletes: database.deletes,
  } });
});
