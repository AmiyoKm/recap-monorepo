import { and, eq, gt, inArray, lte, ne } from "drizzle-orm";

import { schema } from "@recap/db";

import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { isUniqueViolation } from "#api/modules/identity/identity.helpers";
import type {
  ISharedAccountInput,
  ITakePendingGrantInput,
} from "#api/modules/identity/identity.interfaces";
import type {
  TConnectionInsert,
  TConnectionRow,
  TIdentityInsert,
  TIdentityRow,
  TPendingGrantInsert,
} from "#api/modules/identity/identity.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";

export abstract class IdentityRepository {
  static async findOwnedIdentity(
    userId: string,
    identityId: string,
  ): Promise<TIdentityRow | undefined> {
    const rows = await db
      .select()
      .from(schema.identity)
      .where(and(eq(schema.identity.id, identityId), eq(schema.identity.userId, userId)));
    return rows[0];
  }

  static async findIdentityBySub(
    userId: string,
    googleSub: string,
  ): Promise<TIdentityRow | undefined> {
    const rows = await db
      .select()
      .from(schema.identity)
      .where(and(eq(schema.identity.googleSub, googleSub), eq(schema.identity.userId, userId)));
    return rows[0];
  }

  static async insertIdentity(values: TIdentityInsert): Promise<boolean> {
    try {
      await db.insert(schema.identity).values(values);
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      return false;
    }
  }

  static listIdentities(userId: string): Promise<TIdentityRow[]> {
    return db.select().from(schema.identity).where(eq(schema.identity.userId, userId));
  }

  static async findConnection(
    identityId: string,
    provider: string,
  ): Promise<TConnectionRow | undefined> {
    const rows = await db
      .select()
      .from(schema.connection)
      .where(
        and(eq(schema.connection.identityId, identityId), eq(schema.connection.provider, provider)),
      );
    return rows[0];
  }

  static async replaceConnection(
    values: TConnectionInsert,
    staleConnectionId?: string,
  ): Promise<boolean> {
    try {
      await IdentityRepository.writeConnection(values, staleConnectionId);
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      return false;
    }
  }

  private static async writeConnection(
    values: TConnectionInsert,
    staleConnectionId?: string,
  ): Promise<void> {
    const insert = db.insert(schema.connection).values(values);
    if (!staleConnectionId) {
      await insert;
      return;
    }
    await db.batch([
      db.delete(schema.connection).where(eq(schema.connection.id, staleConnectionId)),
      insert,
    ]);
  }

  static listConnections(identityIds: string[]): Promise<TConnectionRow[]> {
    return db
      .select()
      .from(schema.connection)
      .where(inArray(schema.connection.identityId, identityIds));
  }

  static async findOwnedConnection(
    userId: string,
    connectionId: string,
  ): Promise<TConnectionRow | undefined> {
    const rows = await db
      .select({ connection: schema.connection })
      .from(schema.connection)
      .innerJoin(schema.identity, eq(schema.connection.identityId, schema.identity.id))
      .where(and(eq(schema.connection.id, connectionId), eq(schema.identity.userId, userId)));
    return rows[0]?.connection;
  }

  static async markSharedAccountNeedsReconnect({
    provider,
    providerAccountId,
    revokedConnectionId,
  }: ISharedAccountInput): Promise<string[]> {
    const rows = await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT, updatedAt: dayjs().toISOString() })
      .where(
        and(
          eq(schema.connection.provider, provider),
          eq(schema.connection.providerAccountId, providerAccountId),
          ne(schema.connection.id, revokedConnectionId),
        ),
      )
      .returning({ id: schema.connection.id });
    return rows.map((row) => row.id);
  }

  static async deleteIdentityRow(identityId: string): Promise<void> {
    await db.delete(schema.identity).where(eq(schema.identity.id, identityId));
  }

  static async storePendingGrant(values: TPendingGrantInsert): Promise<void> {
    await db.insert(schema.pendingGrant).values(values);
  }

  static async takePendingGrant({
    state,
    now,
  }: ITakePendingGrantInput): Promise<string | undefined> {
    const rows = await db
      .delete(schema.pendingGrant)
      .where(and(eq(schema.pendingGrant.state, state), gt(schema.pendingGrant.expiresAt, now)))
      .returning({ payload: schema.pendingGrant.payload });
    return rows[0]?.payload;
  }

  static async deleteExpiredPendingGrants(now: string): Promise<void> {
    await db.delete(schema.pendingGrant).where(lte(schema.pendingGrant.expiresAt, now));
  }

  static async deleteConnectionRow(connectionId: string): Promise<void> {
    await db.delete(schema.connection).where(eq(schema.connection.id, connectionId));
  }
}
