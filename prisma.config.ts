import "dotenv/config";
import { defineConfig } from "prisma/config";
import { parseServerEnvironment } from "./src/server/env-schema.ts";

const environment = parseServerEnvironment(process.env);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Generation/validation work without credentials. Migrations require a real URL.
  datasource: { url: environment.DATABASE_URL ?? "" },
});
