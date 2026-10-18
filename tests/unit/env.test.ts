import assert from "node:assert/strict";
import { test } from "node:test";
import { parseServerEnvironment, requireDatabaseUrl } from "../../src/server/env-schema.ts";

test("credential-free shell configuration is valid; database access fails closed", () => {
  const env = parseServerEnvironment({ DATABASE_URL: " ", OPENAI_API_KEY: "" });
  assert.deepEqual(env, {});
  assert.throws(() => requireDatabaseUrl(env), /DATABASE_URL is required/);
});

test("valid PostgreSQL connection configuration is retained", () => {
  for (const scheme of ["postgres", "postgresql"]) {
    const url = `${scheme}://localhost/document_test`;
    assert.equal(requireDatabaseUrl(parseServerEnvironment({ DATABASE_URL: url })), url);
  }
});

test("invalid URLs fail without exposing submitted values", () => {
  for (const url of ["https://user:private-value@example.test/db", "not-a-url", "postgres://localhost"]) {
    assert.throws(() => parseServerEnvironment({ DATABASE_URL: url }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /PostgreSQL URL/);
      assert.ok(!error.message.includes(url));
      assert.ok(!error.message.includes("private-value"));
      return true;
    });
  }
});

test("known credentials cannot be configured as public Next variables", () => {
  for (const name of ["DATABASE_URL", "OPENAI_API_KEY", "SUPADATA_API_KEY", "SCRAPECREATORS_API_KEY"]) {
    assert.throws(() => parseServerEnvironment({ [`NEXT_PUBLIC_${name}`]: "test-marker" }), /must remain server-side/);
  }
});
