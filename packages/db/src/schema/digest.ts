import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "#db/schema/auth";

export const digestSetting = sqliteTable("digest_setting", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  timeZone: text("time_zone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
