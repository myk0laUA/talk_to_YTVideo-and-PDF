// Pure validation shared with the Prisma CLI and Node tests.
// Runtime environment access belongs in env.ts, which enforces server-only imports.
const secretNames = [
  "DATABASE_URL", "OPENAI_API_KEY", "SUPADATA_API_KEY", "SCRAPECREATORS_API_KEY",
] as const;

type SecretName = (typeof secretNames)[number];
export type ServerEnvironment = Partial<Record<SecretName, string>>;

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  const result: ServerEnvironment = {};
  for (const name of secretNames) {
    if (input[`NEXT_PUBLIC_${name}`]?.trim()) {
      throw new Error(`Remove NEXT_PUBLIC_${name}; credentials must remain server-side.`);
    }
    const value = input[name]?.trim();
    if (value) result[name] = value;
  }

  if (result.DATABASE_URL) {
    let valid = false;
    try {
      const url = new URL(result.DATABASE_URL);
      valid = ["postgres:", "postgresql:"].includes(url.protocol)
        && Boolean(url.hostname) && url.pathname.length > 1;
    } catch {
      // Never include the submitted connection string in errors.
    }
    if (!valid) throw new Error("DATABASE_URL must be a PostgreSQL URL with a host and database name.");
  }
  return result;
}

export function requireDatabaseUrl(environment: ServerEnvironment): string {
  if (!environment.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database operations. Configure it in .env or the server environment.");
  }
  return environment.DATABASE_URL;
}
