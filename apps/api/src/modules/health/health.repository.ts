import { sql } from "drizzle-orm";

import { db } from "#api/shared/db/db.client";

export abstract class HealthRepository {
  static async pingDatabase(): Promise<void> {
    await db.execute(sql`select 1`);
  }
}
