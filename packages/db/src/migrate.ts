import { migrate } from "drizzle-orm/bun-sql/migrator";

import { EDbMessages } from "#db/db.enums";
import { createDb } from "#db/db.helpers";

const url = process.env["DATABASE_URL"];
if (!url) {
  throw new Error(EDbMessages.MISSING_DATABASE_URL);
}

const db = createDb(url);
await migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
await db.$client.close();
console.info(EDbMessages.MIGRATIONS_APPLIED);
