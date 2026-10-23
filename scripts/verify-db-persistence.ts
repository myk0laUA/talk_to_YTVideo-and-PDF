import "server-only";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { databaseUrl, ProbeError, requireUnexpiredManifest, runProbe } from "./lib/db-persistence.ts";
import { prepareManifest } from "./lib/probe-manifest.ts";
import type { ProbeCommand } from "./lib/db-persistence.ts";

const help = `Operator-only database persistence probe (Node 24.22.0 / npm 11.19.1)
npm run db:probe -- --help
npm run db:probe -- prepare --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- validate --manifest <same-file>
npm run db:probe -- write --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- write-existing --manifest <same-prepared-file>
npm run db:probe -- verify --manifest <same-file>
npm run db:probe -- cleanup --manifest <same-file>
Write creates an exclusive private manifest BEFORE inserting one Source; never overwrites.
Prepare only creates a manifest; validate only checks its format/privacy/expiry. Neither loads credentials or connects.
Write-existing reads a prepared manifest and inserts once; duplicate IDs fail, never upsert.
TTL: exactly 2 hours. Retain the manifest securely off-host before restarting the web service.
Verify never writes or refreshes expiry. Cleanup matches only this fixture (even after expiry).
Exit 0: success; exit 1: sanitized failure category; no credentials/owner hashes in output.
Read docs/DATABASE_PROBE.md before live use.`;

function report(category: string) {
  process.stderr.write(JSON.stringify({ status: "FAIL", category, at: new Date().toISOString() }) + "\n");
}

let watchdog: ReturnType<typeof setTimeout> | undefined;
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    process.stdout.write(help + "\n");
  } else {
    if (args.length !== 3 || !["prepare", "validate", "write", "write-existing", "verify", "cleanup"].includes(args[0])
      || args[1] !== "--manifest" || !isAbsolute(args[2])) throw new ProbeError("USAGE");
    const mode = args[0] as ProbeCommand;
    // Final process cap also closes OS sockets if driver shutdown itself stalls.
    watchdog = setTimeout(() => { report("TIMEOUT"); process.exit(1); }, 20_000);
    // Preserve the legacy modes' configuration-first behavior.
    let url: string | undefined;
    if (["write", "verify", "cleanup"].includes(mode)) { config({ quiet: true }); url = databaseUrl(process.env); }
    const manifest = await prepareManifest(mode, args[2], fileURLToPath(new URL("..", import.meta.url)));
    if (mode !== "cleanup") requireUnexpiredManifest(manifest);
    let outcome: string | undefined;
    if (mode === "prepare" || mode === "validate") {
      outcome = mode === "prepare" ? "PREPARED" : "VALIDATED";
    } else {
      if (!url) { config({ quiet: true }); url = databaseUrl(process.env); }
      const connectionString = url;
      const { openProbeDatabase } = await import("./lib/probe-database.ts");
      outcome = await runProbe(mode, manifest, () => openProbeDatabase(connectionString));
    }
    process.stdout.write(JSON.stringify({ status: "PASS", mode, outcome, id: manifest.id,
      createdAt: manifest.createdAt, expiresAt: manifest.expiresAt, at: new Date().toISOString() }) + "\n");
  }
} catch (error) {
  report(error instanceof ProbeError ? error.category : "DATABASE");
  process.exitCode = 1;
} finally {
  if (watchdog) {
    // Leave an unref'ed backstop for any sockets remaining after failed shutdown.
    watchdog.unref();
  }
}
