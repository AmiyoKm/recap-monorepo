import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "#db/schema/auth";

export const identity = pgTable(
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
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
  },
  (table) => [
    index("identity_user_id_idx").on(table.userId),
    uniqueIndex("identity_user_google_sub_uidx").on(table.userId, table.googleSub),
  ],
);

export const connection = pgTable(
  "connection",
  {
    id: text("id").primaryKey(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    authKind: text("auth_kind").notNull(),
    status: text("status").notNull(),
    scopes: text("scopes"),
    refreshTokenEnc: text("refresh_token_enc"),
    apiKeyEnc: text("api_key_enc"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "string" }),
    providerAccountId: text("provider_account_id"),
    providerAccountEmail: text("provider_account_email"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
  },
  (table) => [
    index("connection_identity_id_idx").on(table.identityId),
    uniqueIndex("connection_identity_provider_uidx").on(table.identityId, table.provider),
  ],
);
