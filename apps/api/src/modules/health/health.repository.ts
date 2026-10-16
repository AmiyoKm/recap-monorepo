import { sql } from "drizzle-orm";

import { db } from "#api/shared/db/db.client";

export abstract class HealthRepository {
  static async pingDatabase(): Promise<void> {
    await db.run(sql`select 1`);
  }
}
