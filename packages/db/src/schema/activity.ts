import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { connection, identity } from "#db/schema/identity";

export const activity = sqliteTable(
  "activity",
  {
    id: text("id").primaryKey(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connection.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    kind: text("kind").notNull(),
    externalId: text("external_id").notNull(),
    occurredAt: text("occurred_at").notNull(),
    endsAt: text("ends_at"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    actor: text("actor"),
    detail: text("detail"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("activity_connection_external_uidx").on(table.connectionId, table.externalId),
    index("activity_identity_occurred_idx").on(table.identityId, table.occurredAt),
    index("activity_source_occurred_idx").on(table.source, table.occurredAt),
  ],
);
