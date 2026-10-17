import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import type { TAuthIdentityInsert, TAuthUserProfile } from "#api/shared/auth/auth.types";
import { db } from "#api/shared/db/db.client";

export abstract class AuthRepository {
  static async findUserProfile(userId: string): Promise<TAuthUserProfile | undefined> {
    const [row] = await db
      .select({ name: schema.user.name, email: schema.user.email, image: schema.user.image })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    return row;
  }

  static async hasIdentity(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: schema.identity.id })
      .from(schema.identity)
      .where(eq(schema.identity.userId, userId))
      .limit(1);
    return row !== undefined;
  }

  static async insertIdentity(values: TAuthIdentityInsert): Promise<void> {
    await db.insert(schema.identity).values(values).onConflictDoNothing();
  }
}
