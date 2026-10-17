import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "#db/schema/auth";

export const identity = sqliteTable(
  "identity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googleSub: text("google_sub").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("identity_user_id_idx").on(table.userId),
    uniqueIndex("identity_user_google_sub_uidx").on(table.userId, table.googleSub),
  ],
);

export const connection = sqliteTable(
  "connection",
  {
    id: text("id").primaryKey(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    scopes: text("scopes"),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    accessTokenExpiresAt: text("access_token_expires_at"),
    providerAccountId: text("provider_account_id"),
    providerAccountEmail: text("provider_account_email"),
    providerSite: text("provider_site"),
    providerResourceId: text("provider_resource_id"),
    pullCursor: text("pull_cursor"),
    lastPulledAt: text("last_pulled_at"),
    lastPullError: text("last_pull_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("connection_identity_id_idx").on(table.identityId),
    uniqueIndex("connection_identity_provider_uidx").on(table.identityId, table.provider),
  ],
);

export const pendingGrant = sqliteTable(
  "pending_grant",
  {
    state: text("state").primaryKey(),
    payload: text("payload").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [index("pending_grant_expires_at_idx").on(table.expiresAt)],
);
