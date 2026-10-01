import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync("../../.env")) process.loadEnvFile("../../.env");

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Supabase owns these schemas; never let drizzle-kit try to drop them.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
