import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "#db/schema/auth";

export const digestSetting = sqliteTable("digest_setting", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  timeZone: text("time_zone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const digest = sqliteTable(
  "digest",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    digestDate: text("digest_date").notNull(),
    windowStart: text("window_start").notNull(),
    windowEnd: text("window_end").notNull(),
    status: text("status").notNull(),
    content: text("content"),
    missingSources: text("missing_sources").notNull(),
    model: text("model"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("digest_user_date_uidx").on(table.userId, table.digestDate)],
);
