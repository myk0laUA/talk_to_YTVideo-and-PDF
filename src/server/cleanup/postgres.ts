import "server-only";
import type { BatchRequest, CleanupStore, Cursor } from "./service.ts";
import { CleanupBatchFailure, CleanupStop } from "./service.ts";

// Structural pg boundary also permits SQL contract tests without a real database.
export type CleanupConnection = { query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };
export function createPostgresCleanupStore(connection: CleanupConnection): CleanupStore {
  return { async batch({ table, cutoff, cursor, limit, execute, guard }: BatchRequest) {
    // Table names are a closed allowlist, never CLI SQL/identifiers.
    if (!["Source", "TranscriptCache"].includes(table)) throw new Error("TABLE");
    const started = Date.now();
    const check = () => { guard(); if (Date.now() - started >= 5000) throw new CleanupStop("timeout"); };
    check();
    await connection.query(execute ? "BEGIN ISOLATION LEVEL READ COMMITTED" : "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
    let committing = false;
    try {
      check();
      await connection.query("SELECT set_config('lock_timeout', '500ms', true), set_config('statement_timeout', '1500ms', true), set_config('idle_in_transaction_session_timeout', '3000ms', true)");
      check();
      const result = await connection.query(`SELECT "id", "expiresAt" FROM "public"."${table}" WHERE "expiresAt" <= $1
        AND ($2::timestamptz IS NULL OR ("expiresAt", "id") > ($2::timestamptz, $3::uuid))
        ORDER BY "expiresAt", "id" LIMIT $4`, [cutoff, cursor?.expiresAt ?? null, cursor?.id ?? null, limit]);
      check();
      let deleted = 0;
      if (execute && result.rows.length) {
        // READ COMMITTED re-evaluates the predicate after waiting for a concurrent update.
        // Refresh/upsert can make an old candidate live; IDs alone never authorize deletion.
        const removal = await connection.query(`DELETE FROM "public"."${table}" WHERE "id" = ANY($1::uuid[]) AND "expiresAt" <= $2`,
          [result.rows.map(row => row.id), cutoff]);
        deleted = removal.rowCount ?? 0;
      }
      check();
      committing = true;
      await connection.query("COMMIT");
      const last = result.rows.at(-1);
      return { selected: result.rows.length, deleted,
        cursor: last ? { id: last.id as string, expiresAt: last.expiresAt as Date } satisfies Cursor : undefined };
    } catch (error) {
      // No retry. A failed rollback is still a failed batch; the CLI destroys its connection.
      let rolledBack = false;
      try { await connection.query("ROLLBACK"); rolledBack = true; } catch { /* connection will be destroyed by its owner */ }
      throw new CleanupBatchFailure(!committing && rolledBack ? "rolled_back" : "unknown", error);
    }
  } };
}
