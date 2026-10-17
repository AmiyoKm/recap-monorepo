import { and, desc, eq, inArray, lt, notInArray, or, sql } from "drizzle-orm";

import { schema } from "@recap/db";

import {
  DEFAULT_DIGEST_TIME_ZONE,
  DIGEST_EMPTY_LIST,
  DIGEST_IDS_PER_STATEMENT,
  DIGEST_IN_PROGRESS_STATUSES,
  DIGEST_STALE_MINUTES,
  DIGEST_START_ROWS_PER_STATEMENT,
} from "#api/modules/digest/digest.constants";
import { EDigestStatus } from "#api/modules/digest/digest.enums";
import { newDigestId } from "#api/modules/digest/digest.helpers";
import type {
  IDigestCandidate,
  IDigestIdentity,
  IDigestPastRow,
  IDigestSaveReadyInput,
  IDigestStarted,
  IDigestStartInput,
} from "#api/modules/digest/digest.interfaces";
import type { TDigestRow, TDigestSettingRow } from "#api/modules/digest/digest.types";
import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { chunk } from "#api/shared/array/array.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";

export abstract class DigestRepository {
  static async findSetting(userId: string): Promise<TDigestSettingRow | undefined> {
    const rows = await db
      .select()
      .from(schema.digestSetting)
      .where(eq(schema.digestSetting.userId, userId));
    return rows[0];
  }

  static async upsertSetting(userId: string, timeZone: string): Promise<void> {
    const now = dayjs().toISOString();
    await db
      .insert(schema.digestSetting)
      .values({ userId, timeZone, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.digestSetting.userId,
        set: { timeZone, updatedAt: now },
      });
  }

  static async findById(digestId: string): Promise<TDigestRow | undefined> {
    const rows = await db.select().from(schema.digest).where(eq(schema.digest.id, digestId));
    return rows[0];
  }

  static async findByDate(userId: string, digestDate: string): Promise<TDigestRow | undefined> {
    const rows = await db
      .select()
      .from(schema.digest)
      .where(and(eq(schema.digest.userId, userId), eq(schema.digest.digestDate, digestDate)));
    return rows[0];
  }

  static async listDates(userId: string, limit: number): Promise<string[]> {
    const rows = await db
      .select({ digestDate: schema.digest.digestDate })
      .from(schema.digest)
      .where(eq(schema.digest.userId, userId))
      .orderBy(desc(schema.digest.digestDate))
      .limit(limit);
    return rows.map((row) => row.digestDate);
  }

  static async findPreviousWindowEnd(userId: string, digestDate: string): Promise<string | null> {
    const rows = await db
      .select({ windowEnd: schema.digest.windowEnd })
      .from(schema.digest)
      .where(and(eq(schema.digest.userId, userId), lt(schema.digest.digestDate, digestDate)))
      .orderBy(desc(schema.digest.digestDate))
      .limit(1);
    return rows[0]?.windowEnd ?? null;
  }

  static async start(input: IDigestStartInput): Promise<string | null> {
    const rows = await DigestRepository.pendingStatement([input]);
    return rows[0]?.id ?? null;
  }

  static async startMany(inputs: IDigestStartInput[]): Promise<IDigestStarted[]> {
    const statements = chunk(inputs, DIGEST_START_ROWS_PER_STATEMENT).map((rows) =>
      DigestRepository.pendingStatement(rows),
    );
    const [first, ...rest] = statements;
    if (!first) {
      return [];
    }
    const results = await db.batch([first, ...rest]);
    return results.flat();
  }

  private static pendingStatement(inputs: IDigestStartInput[]) {
    const now = dayjs();
    const stamp = now.toISOString();
    const staleBefore = now.subtract(DIGEST_STALE_MINUTES, "minute").toISOString();
    return db
      .insert(schema.digest)
      .values(
        inputs.map((input) => ({
          id: newDigestId(),
          userId: input.userId,
          digestDate: input.digestDate,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          status: EDigestStatus.PENDING,
          missingSources: DIGEST_EMPTY_LIST,
          createdAt: stamp,
          updatedAt: stamp,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.digest.userId, schema.digest.digestDate],
        set: {
          id: sql`excluded.id`,
          windowStart: sql`excluded.window_start`,
          windowEnd: sql`excluded.window_end`,
          status: EDigestStatus.PENDING,
          content: null,
          missingSources: DIGEST_EMPTY_LIST,
          model: null,
          error: null,
          updatedAt: stamp,
        },
        setWhere: or(
          notInArray(schema.digest.status, DIGEST_IN_PROGRESS_STATUSES),
          lt(schema.digest.updatedAt, staleBefore),
        ),
      })
      .returning({ id: schema.digest.id, userId: schema.digest.userId });
  }

  static async markRunning(digestId: string): Promise<void> {
    await db
      .update(schema.digest)
      .set({ status: EDigestStatus.RUNNING, updatedAt: dayjs().toISOString() })
      .where(eq(schema.digest.id, digestId));
  }

  static async saveMissingSources(digestId: string, missingSources: string): Promise<void> {
    await db
      .update(schema.digest)
      .set({ missingSources, updatedAt: dayjs().toISOString() })
      .where(eq(schema.digest.id, digestId));
  }

  static async saveReady(input: IDigestSaveReadyInput): Promise<void> {
    await db
      .update(schema.digest)
      .set({
        status: EDigestStatus.READY,
        content: input.content,
        model: input.model,
        error: null,
        updatedAt: dayjs().toISOString(),
      })
      .where(eq(schema.digest.id, input.digestId));
  }

  static async saveFailed(digestId: string, error: string): Promise<void> {
    await db
      .update(schema.digest)
      .set({ status: EDigestStatus.FAILED, error, updatedAt: dayjs().toISOString() })
      .where(eq(schema.digest.id, digestId));
  }

  static async saveFailedMany(digestIds: string[], error: string): Promise<void> {
    const updatedAt = dayjs().toISOString();
    const statements = chunk(digestIds, DIGEST_IDS_PER_STATEMENT).map((ids) =>
      db
        .update(schema.digest)
        .set({ status: EDigestStatus.FAILED, error, updatedAt })
        .where(inArray(schema.digest.id, ids)),
    );
    const [first, ...rest] = statements;
    if (!first) {
      return;
    }
    await db.batch([first, ...rest]);
  }

  static async listCandidates(): Promise<IDigestCandidate[]> {
    const rows = await db
      .selectDistinct({ userId: schema.identity.userId, timeZone: schema.digestSetting.timeZone })
      .from(schema.connection)
      .innerJoin(schema.identity, eq(schema.connection.identityId, schema.identity.id))
      .leftJoin(schema.digestSetting, eq(schema.digestSetting.userId, schema.identity.userId))
      .where(eq(schema.connection.status, EConnectionStatus.ACTIVE));
    return rows.map((row) => ({
      userId: row.userId,
      timeZone: row.timeZone ?? DEFAULT_DIGEST_TIME_ZONE,
    }));
  }

  static async listPastDigests(userIds: string[]): Promise<IDigestPastRow[]> {
    const statements = chunk(userIds, DIGEST_IDS_PER_STATEMENT).map((ids) =>
      db
        .select({
          userId: schema.digest.userId,
          digestDate: schema.digest.digestDate,
          windowEnd: schema.digest.windowEnd,
        })
        .from(schema.digest)
        .where(inArray(schema.digest.userId, ids)),
    );
    const [first, ...rest] = statements;
    if (!first) {
      return [];
    }
    const results = await db.batch([first, ...rest]);
    return results.flat();
  }

  static async listIdentities(userId: string): Promise<IDigestIdentity[]> {
    return await db
      .select({ id: schema.identity.id, email: schema.identity.email })
      .from(schema.identity)
      .where(eq(schema.identity.userId, userId))
      .orderBy(schema.identity.createdAt, schema.identity.id);
  }
}
