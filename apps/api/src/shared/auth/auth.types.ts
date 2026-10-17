import type { BetterAuthOptions } from "better-auth";

import type { schema } from "@recap/db";

export type TCrossSubDomainCookies = NonNullable<
  BetterAuthOptions["advanced"]
>["crossSubDomainCookies"];
export type TAuthIdentityInsert = typeof schema.identity.$inferInsert;
export type TAuthUserProfile = Pick<typeof schema.user.$inferSelect, "name" | "email" | "image">;
