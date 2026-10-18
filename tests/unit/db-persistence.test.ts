import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prepareManifest } from "../../scripts/lib/probe-manifest.ts";
import { createManifest, databaseUrl, fixture, identity, parseManifest, perform, ProbeError, runProbe, TTL_MS } from "../../scripts/lib/db-persistence.ts";
import type { Category, Identity, ProbeDatabase } from "../../scripts/lib/db-persistence.ts";

const rejects = (category: Category) => (error: unknown) => {
  assert.ok(error instanceof ProbeError);
  assert.equal(error.category, category);
  assert.equal(error.message, category);
  return true;
};

test("real private manifest I/O refuses tracked paths, overwrites and invalid files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "td-probe-test-"));
  const root = join(directory, "repository");
  const path = join(directory, "handle.json");
  try {
    await mkdir(root);
    await assert.rejects(prepareManifest("write", join(root, "handle.json"), root), rejects("MANIFEST"));
    const m = await prepareManifest("write", path, root);
    const bytes = await readFile(path, "utf8");
    await assert.rejects(prepareManifest("write", path, root), rejects("MANIFEST"));
    assert.equal(await readFile(path, "utf8"), bytes);
    assert.deepEqual(await prepareManifest("verify", path, root), m);
    if (process.platform !== "win32") {
      await chmod(path, 0o644);
      await assert.rejects(prepareManifest("verify", path, root), rejects("MANIFEST"));
      await chmod(path, 0o600);
    }
    await writeFile(path, "x".repeat(4097));
    await assert.rejects(prepareManifest("verify", path, root), rejects("MANIFEST"));
    await writeFile(path, "{}");
    await assert.rejects(prepareManifest("cleanup", path, root), rejects("MANIFEST"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

// All persistence tests use this in-memory boundary, NOT a live PostgreSQL service.
function mockDatabase(rows = new Map<string, Record<string, unknown>>()) {
  const deletes: Identity[] = [];
  let closed = 0;
  let writes = 0;
  const db: ProbeDatabase = {
    async create(data) {
      if (rows.has(data.id)) throw new Error(`duplicate row private owner=${data.ownerSessionHash}`);
      writes++;
      rows.set(data.id, structuredClone(data));
    },
    async find(id) { return rows.get(id) ?? null; },
    async deleteFixture(where) {
      deletes.push(where);
      const row = rows.get(where.id);
      if (!row || !Object.entries(where).every(([key, value]) => {
        try { assert.deepEqual(row[key], value); return true; } catch { return false; }
      })) return 0;
      rows.delete(where.id);
      return 1;
    },
    async close() { closed++; },
  };
  return { db, rows, deletes, closed: () => closed, writes: () => writes };
}

test("probe configuration fails closed without exposing credentials", () => {
  for (const env of [
    {}, { DATABASE_URL: "https://user:private-marker@example.test/db" },
    { DATABASE_URL: "postgres://localhost" },
    { NEXT_PUBLIC_DATABASE_URL: "private-marker" },
    { DATABASE_URL: "postgres://localhost/db?sslmode=no-verify" },
    { DATABASE_URL: "postgres://localhost/db", NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: "postgres://localhost/db?uselibpqcompat=true" },
  ]) assert.throws(() => databaseUrl(env), rejects("CONFIGURATION"));
  const url = "postgres://localhost/db?sslmode=verify-full";
  assert.equal(databaseUrl({ DATABASE_URL: url }), url);
});

test("manifest has independent random identity, bounded expiry and strict format", () => {
  const m = createManifest();
  assert.deepEqual(parseManifest(JSON.parse(JSON.stringify(m))), m);
  assert.notEqual(m.ownerSessionHash, createManifest().ownerSessionHash);
  assert.notEqual(m.id, createManifest().id);
  assert.equal(Date.parse(m.expiresAt) - Date.parse(m.createdAt), TTL_MS);
  for (const bad of [null, {}, { ...m, version: 2 }, { ...m, ownerSessionHash: "short" },
    { ...m, expiresAt: m.createdAt }, { ...m, createdAt: "invalid" }, { ...m, extra: true }]) {
    assert.throws(() => parseManifest(bad), rejects("MANIFEST"));
  }
});

test("mocked exact verification survives serialized handle and never writes", async () => {
  const m = createManifest();
  const mock = mockDatabase();
  assert.equal(await runProbe("write", m, () => mock.db), "WRITTEN");
  assert.equal(await runProbe("verify", parseManifest(JSON.parse(JSON.stringify(m))), () => mock.db), "VERIFIED");
  assert.equal(mock.writes(), 1);
  assert.equal(mock.closed(), 2);
  assert.equal(fixture(m).characterCount, fixture(m).fullText.length);
  assert.equal(fixture(m).pageCount, fixture(m).sections.length);
});

test("mocked missing and expired rows reject without recreation or TTL refresh", async () => {
  const m = createManifest();
  const mock = mockDatabase();
  await assert.rejects(runProbe("verify", m, () => mock.db), rejects("MISSING"));
  await perform("write", m, mock.db);
  await assert.rejects(perform("verify", m, mock.db, () => new Date(m.expiresAt)), rejects("EXPIRED"));
  const old = createManifest(new Date(Date.now() - TTL_MS - 100));
  await assert.rejects(runProbe("write", old, () => mock.db), rejects("EXPIRED"));
  assert.equal(mock.writes(), 1);
  assert.deepEqual(mock.rows.get(m.id), fixture(m));
});

test("mocked verification rejects changes to every stored field", async () => {
  const m = createManifest();
  for (const key of Object.keys(fixture(m))) {
    const mock = mockDatabase();
    mock.rows.set(m.id, { ...fixture(m), [key]: "altered-private-marker" });
    await assert.rejects(runProbe("verify", m, () => mock.db), rejects("ALTERED"));
    assert.equal(mock.writes(), 0);
    assert.equal(mock.closed(), 1);
  }
  const mock = mockDatabase();
  mock.rows.set(m.id, { ...fixture(m), sections: [...fixture(m).sections].reverse() });
  await assert.rejects(runProbe("verify", m, () => mock.db), rejects("ALTERED"));
});

test("mocked verification rejects a fixture that expires during the read", async () => {
  const m = createManifest();
  const mock = mockDatabase();
  mock.rows.set(m.id, fixture(m));
  let reads = 0;
  await assert.rejects(perform("verify", m, mock.db,
    () => new Date(reads++ === 0 ? m.createdAt : m.expiresAt)), rejects("EXPIRED"));
});

test("mocked cleanup deletes only matching fixture; repeat cleanup is explicit", async () => {
  const m = createManifest(new Date(Date.now() - TTL_MS - 100));
  const other = createManifest();
  const mock = mockDatabase();
  mock.rows.set(m.id, fixture(m));
  mock.rows.set(other.id, fixture(other));
  assert.equal(await runProbe("cleanup", m, () => mock.db), "REMOVED");
  assert.deepEqual(mock.deletes, [identity(m)]);
  assert.deepEqual(mock.rows.get(other.id), fixture(other));
  assert.equal(await runProbe("cleanup", m, () => mock.db), "ALREADY_ABSENT");
  assert.equal(mock.deletes.length, 1);
});

test("mocked cleanup rejects mismatched identity and concurrent row replacement", async () => {
  const m = createManifest();
  for (const key of Object.keys(identity(m))) {
    const mock = mockDatabase();
    mock.rows.set(m.id, { ...fixture(m), [key]: "another-run" });
    await assert.rejects(runProbe("cleanup", m, () => mock.db), rejects("IDENTITY_MISMATCH"));
    assert.equal(mock.deletes.length, 0);
    assert.equal(mock.rows.size, 1);
  }
  const mock = mockDatabase();
  mock.rows.set(m.id, fixture(m));
  const originalDelete = mock.db.deleteFixture;
  mock.db.deleteFixture = async (where) => {
    mock.rows.set(m.id, { ...fixture(m), ownerSessionHash: createManifest().ownerSessionHash });
    return originalDelete(where);
  };
  await assert.rejects(runProbe("cleanup", m, () => mock.db), rejects("IDENTITY_MISMATCH"));
  assert.equal(mock.rows.size, 1);
});

test("mocked operational and shutdown failures are sanitized and close the boundary", async () => {
  for (const method of ["create", "find", "deleteFixture", "close"] as const) {
    const mock = mockDatabase();
    const m = createManifest();
    mock.rows.set(m.id, fixture(m));
    mock.db[method] = async () => { throw new Error("postgres://user:private-marker@private-host/db RAW ROW"); };
    await assert.rejects(runProbe(method === "create" ? "write" : "cleanup", m, () => mock.db), rejects("DATABASE"));
    if (method !== "close") assert.equal(mock.closed(), 1);
  }
  await assert.rejects(runProbe("write", createManifest(), () => { throw new Error("private-marker"); }), rejects("DATABASE"));
});

test("mocked hung operation or pool shutdown has a bounded sanitized timeout", async () => {
  for (const method of ["create", "close"] as const) {
    const mock = mockDatabase();
    mock.db[method] = () => new Promise(() => {});
    await assert.rejects(runProbe("write", createManifest(), () => mock.db,
      { operationMs: 10, closeMs: 10 }), rejects("TIMEOUT"));
    if (method === "create") assert.equal(mock.closed(), 1);
  }
});

test("mocked late read after deadline cannot start a cleanup deletion", async () => {
  const mock = mockDatabase();
  const m = createManifest();
  let finishRead: (row: Record<string, unknown>) => void = () => {};
  mock.db.find = () => new Promise((resolve) => { finishRead = resolve; });
  await assert.rejects(runProbe("cleanup", m, () => mock.db,
    { operationMs: 10, closeMs: 10 }), rejects("TIMEOUT"));
  finishRead(fixture(m));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(mock.deletes.length, 0);
  assert.equal(mock.closed(), 1);
});

test("real CLI help is credential-free and all modes reject invalid config without output leaks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "td-cli-config-test-"));
  const script = resolve("scripts/verify-db-persistence.ts");
  const env = { ...process.env, DATABASE_URL: "private-invalid-config-marker", DOTENV_CONFIG_QUIET: "true" };
  const cli = (args: string[]) => spawnSync(process.execPath,
    ["--conditions=react-server", script, ...args], { cwd: directory, env, encoding: "utf8", timeout: 10_000 });
  try {
    const help = cli(["--help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /TTL: exactly 2 hours/);
    for (const mode of ["write", "verify", "cleanup"]) {
      const result = cli([mode, "--manifest", join(directory, "unused.json")]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /CONFIGURATION/);
      assert.ok(!(result.stdout + result.stderr).includes("private-invalid-config-marker"));
    }
    assert.equal(cli([]).status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("real Node operator condition loads existing generated Prisma adapter without credentials", () => {
  const result = spawnSync(process.execPath,
    ["--conditions=react-server", "--input-type=module", "-e", "await import('./scripts/lib/probe-database.ts')"],
    { encoding: "utf8", timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr);
});

test("prepared file is read unchanged for hosted write, validate, verify and cleanup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "td-prepared-test-"));
  const root = join(directory, "repository");
  const path = join(directory, "handle.json");
  try {
    await mkdir(root);
    await assert.rejects(prepareManifest("prepare", join(root, "handle.json"), root), rejects("MANIFEST"));
    const m = await prepareManifest("prepare", path, root);
    const before = await readFile(path, "utf8");
    await assert.rejects(prepareManifest("prepare", path, root), rejects("MANIFEST"));
    for (const mode of ["write-existing", "validate", "verify", "cleanup"] as const) {
      assert.deepEqual(await prepareManifest(mode, path, root), m);
      assert.equal(await readFile(path, "utf8"), before);
      await assert.rejects(prepareManifest(mode, join(directory, "missing.json"), root), rejects("MANIFEST"));
      await assert.rejects(prepareManifest(mode, "relative.json", root), rejects("MANIFEST"));
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("mocked retained-manifest write rejects duplicates; independent readers never recreate missing data", async () => {
  const manifest = createManifest();
  const writer = mockDatabase();
  const unrelated = createManifest();
  writer.rows.set(unrelated.id, fixture(unrelated));
  assert.equal(await runProbe("write-existing", manifest, () => writer.db), "WRITTEN");
  await assert.rejects(runProbe("write-existing", manifest, () => writer.db), rejects("DATABASE"));
  assert.equal(writer.writes(), 1);
  assert.equal(writer.closed(), 2);
  // A distinct boundary/handle reads only a copy of the persisted mock state.
  // This is NOT a real process restart or hosted PostgreSQL evidence.
  const reader = mockDatabase(structuredClone(writer.rows));
  const retained = parseManifest(JSON.parse(JSON.stringify(manifest)));
  for (let start = 0; start < 2; start++) {
    assert.equal(await runProbe("verify", retained, () => reader.db), "VERIFIED");
    assert.equal(reader.writes(), 0);
  }
  assert.equal(await runProbe("cleanup", retained, () => reader.db), "REMOVED");
  for (let start = 0; start < 2; start++) {
    await assert.rejects(runProbe("verify", retained, () => reader.db), rejects("MISSING"));
  }
  assert.deepEqual(reader.rows.get(unrelated.id), fixture(unrelated));
  assert.equal(reader.writes(), 0);
});

test("mocked hosted write rejects expiry and sanitizes operational errors with pool closure", async () => {
  const mock = mockDatabase();
  const expired = createManifest(new Date(Date.now() - TTL_MS - 1000));
  await assert.rejects(runProbe("write-existing", expired, () => mock.db), rejects("EXPIRED"));
  assert.equal(mock.writes(), 0);
  assert.equal(mock.closed(), 1);
  mock.db.create = async () => { throw new Error("private connection / owner / row marker"); };
  await assert.rejects(runProbe("write-existing", createManifest(), () => mock.db), rejects("DATABASE"));
  assert.equal(mock.closed(), 2);
});

test("real CLI prepare/validate need no credentials; hosted write rejects invalid inputs before config", async () => {
  const directory = await mkdtemp(join(tmpdir(), "td-cli-prepared-test-"));
  const path = join(directory, "handle.json");
  const script = resolve("scripts/verify-db-persistence.ts");
  // Isolated cwd contains no .env. Deliberately invalid configuration is never a live target.
  const env = { ...process.env, DATABASE_URL: "private-invalid-config-marker" };
  const cli = (mode: string, manifest = path) => spawnSync(process.execPath,
    ["--conditions=react-server", script, mode, "--manifest", manifest],
    { cwd: directory, env, encoding: "utf8", timeout: 10_000 });
  const check = (result: ReturnType<typeof cli>, expected: string, code: number, secret = "") => {
    assert.equal(result.status, code);
    const output = result.stdout + result.stderr;
    assert.ok(output.includes(expected));
    assert.ok(!output.includes("private-invalid-config-marker"));
    if (secret) assert.ok(!output.includes(secret));
  };
  try {
    check(cli("prepare"), "PREPARED", 0);
    const before = await readFile(path, "utf8");
    const m = parseManifest(JSON.parse(before));
    check(cli("prepare"), "MANIFEST", 1, m.ownerSessionHash);
    check(cli("validate"), "VALIDATED", 0, m.ownerSessionHash);
    check(cli("write-existing"), "CONFIGURATION", 1, m.ownerSessionHash);
    assert.equal(await readFile(path, "utf8"), before);
    for (const mode of ["validate", "write-existing"]) {
      check(cli(mode, join(directory, "missing.json")), "MANIFEST", 1);
      const expired = createManifest(new Date(Date.now() - TTL_MS - 1000));
      await writeFile(path, JSON.stringify(expired));
      check(cli(mode), "EXPIRED", 1, expired.ownerSessionHash);
      await writeFile(path, JSON.stringify({ ...m, ownerSessionHash: "private-malformed-owner-marker" }));
      check(cli(mode), "MANIFEST", 1, "private-malformed-owner-marker");
      await writeFile(path, "x".repeat(4097));
      check(cli(mode), "MANIFEST", 1);
      if (process.platform !== "win32") {
        await writeFile(path, before);
        await chmod(path, 0o644);
        check(cli(mode), "MANIFEST", 1, m.ownerSessionHash);
        await chmod(path, 0o600);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
