import { and, eq, inArray } from "drizzle-orm";

import { schema } from "@recap/db";

import { isUniqueViolation } from "#api/modules/identity/identity.helpers";
import type { IConnectionOwnership } from "#api/modules/identity/identity.interfaces";
import type {
  TConnectionInsert,
  TConnectionRow,
  TIdentityInsert,
  TIdentityRow,
} from "#api/modules/identity/identity.types";
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
      await db.transaction(async (tx) => {
        if (staleConnectionId) {
          await tx.delete(schema.connection).where(eq(schema.connection.id, staleConnectionId));
        }
        await tx.insert(schema.connection).values(values);
      });
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      return false;
    }
  }

  static listConnections(identityIds: string[]): Promise<TConnectionRow[]> {
    return db
      .select()
      .from(schema.connection)
      .where(inArray(schema.connection.identityId, identityIds));
  }

  static async connectionIdsForIdentity(identityId: string): Promise<string[]> {
    const rows = await db
      .select({ id: schema.connection.id })
      .from(schema.connection)
      .where(eq(schema.connection.identityId, identityId));
    return rows.map((row) => row.id);
  }

  static async findConnectionOwner(
    connectionId: string,
  ): Promise<IConnectionOwnership | undefined> {
    const rows = await db
      .select({ connectionId: schema.connection.id, userId: schema.identity.userId })
      .from(schema.connection)
      .innerJoin(schema.identity, eq(schema.connection.identityId, schema.identity.id))
      .where(eq(schema.connection.id, connectionId));
    return rows[0];
  }

  static async deleteIdentityRow(identityId: string): Promise<void> {
    await db.delete(schema.identity).where(eq(schema.identity.id, identityId));
  }

  static async deleteConnectionRow(connectionId: string): Promise<void> {
    await db.delete(schema.connection).where(eq(schema.connection.id, connectionId));
  }
}
