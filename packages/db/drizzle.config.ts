import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: {
    accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
    databaseId: process.env["CLOUDFLARE_DATABASE_ID"] ?? "",
    token: process.env["CLOUDFLARE_D1_TOKEN"] ?? "",
  },
});
