import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // path to the schema file
  schema: "./src/lib/db/schema.ts",
  // output directory for migration files
  out: "./drizzle",
  // use the SQLite dialect
  dialect: "sqlite",
  // database connection config
  dbCredentials: {
    url: "./data/sqlite.db",
  },
});
