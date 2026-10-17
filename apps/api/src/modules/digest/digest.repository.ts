import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import type { TDigestSettingRow } from "#api/modules/digest/digest.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";

export abstract class DigestRepository {
  static async findSetting(userId: string): Promise<TDigestSettingRow | undefined> {
    const rows = await db
      .select()
      .from(schema.digestSetting)
      .where(eq(schema.digestSetting.userId, userId));
    return rows[0];
  }

  static async upsertSetting(userId: string, timeZone: string): Promise<void> {
    const now = dayjs().toISOString();
    await db
      .insert(schema.digestSetting)
      .values({ userId, timeZone, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.digestSetting.userId,
        set: { timeZone, updatedAt: now },
      });
  }
}
