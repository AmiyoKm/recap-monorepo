import { and, eq, inArray } from "drizzle-orm";

import { schema } from "@recap/db";

import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import type { IPullTarget } from "#api/modules/pull/pull.interfaces";
import { db } from "#api/shared/db/db.client";

export abstract class PullRepository {
  static async findPullTarget(connectionId: string): Promise<IPullTarget | undefined> {
    const rows = await db
      .select({ connection: schema.connection, identityEmail: schema.identity.email })
      .from(schema.connection)
      .innerJoin(schema.identity, eq(schema.connection.identityId, schema.identity.id))
      .where(eq(schema.connection.id, connectionId));
    return rows[0];
  }

  static async listActiveConnectionIds(providers: string[]): Promise<string[]> {
    const rows = await db
      .select({ id: schema.connection.id })
      .from(schema.connection)
      .where(
        and(
          eq(schema.connection.status, EConnectionStatus.ACTIVE),
          inArray(schema.connection.provider, providers),
        ),
      );
    return rows.map((row) => row.id);
  }

  static async saveProgress(connectionId: string, pullCursor: string): Promise<void> {
    await db
      .update(schema.connection)
      .set({ pullCursor, lastPullError: null })
      .where(eq(schema.connection.id, connectionId));
  }

  static async saveComplete(connectionId: string, now: string): Promise<void> {
    await db
      .update(schema.connection)
      .set({ lastPulledAt: now, lastPullError: null })
      .where(eq(schema.connection.id, connectionId));
  }

  static async saveError(connectionId: string, message: string): Promise<void> {
    await db
      .update(schema.connection)
      .set({ lastPullError: message })
      .where(eq(schema.connection.id, connectionId));
  }

  static async markNeedsReconnect(
    connectionId: string,
    now: string,
    message: string,
  ): Promise<void> {
    await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT, lastPullError: message, updatedAt: now })
      .where(eq(schema.connection.id, connectionId));
  }
}
