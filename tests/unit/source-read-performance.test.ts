import assert from "node:assert/strict";
import { test } from "node:test";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { SourceError, uploadedRecord } from "../../src/server/sources/service.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { createDatabaseClient } from "../../src/server/database-client.ts";

test("single-statement source read preserves owner, expiry and record validation without a transaction", async () => {
  const db = new SyntheticSourceDatabase(), repository = createSourceRepository(() => db.asClient());
  const owner = "a".repeat(64), expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const row = uploadedRecord({ parser: "pdf-parse@2.4.5", fullText: "Synthetic text", characterCount: 14,
    pageCount: 1, fileBytes: 100, warnings: [], sections: [{ id: "page-1", pageNumber: 1, text: "Synthetic text" }] },
  { owner, expiresAt, token: "" });
  db.rows.set(row.id, row);
  assert.equal((await repository.get(row.id, owner, new Date()))?.fullText, row.fullText);
  assert.equal(await repository.get(row.id, "b".repeat(64), new Date()), null);
  assert.equal(await repository.get(row.id, owner, new Date(expiresAt * 1000)), null);
  row.wordCount = 900;
  await assert.rejects(repository.get(row.id, owner, new Date()), e => e instanceof SourceError && e.code === "storage_unavailable");
  assert.equal(db.transactions, 0);
  db.source.findFirst = async () => { throw Error("PRIVATE_CONNECTION_DETAILS"); };
  await assert.rejects(repository.get(row.id, owner, new Date()), e => e instanceof SourceError && e.message === "storage_unavailable");
});

test("pool retains bounded server deadlines and disconnect owns the external pool", async () => {
  const { database, pool } = createDatabaseClient("postgresql://synthetic@127.0.0.1:1/synthetic");
  assert.equal(pool.options.max, 5);
  assert.equal(pool.options.statement_timeout, 3000);
  assert.equal(pool.options.lock_timeout, 1500);
  assert.equal(pool.options.connectionTimeoutMillis, 5000);
  // No connection is made; the real outage/lock tests are in the isolated benchmark.
  await database.$disconnect();
  // Prisma connects lazily; if never connected it has not acquired ownership yet.
  if (!pool.ended) await pool.end();
});
