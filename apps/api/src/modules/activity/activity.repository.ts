import {
  type AnyColumn,
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { schema } from "@recap/db";

import {
  ACTIVITY_DELETE_CHUNK,
  ACTIVITY_INSERT_ROWS,
  LIKE_ESCAPE_CHARACTER,
} from "#api/modules/activity/activity.constants";
import { EActivityKind } from "#api/modules/activity/activity.enums";
import {
  driveFileIdFromExternalId,
  escapeLike,
  toInsert,
} from "#api/modules/activity/activity.helpers";
import type {
  IActivityListFilters,
  IActivityWriteInput,
} from "#api/modules/activity/activity.interfaces";
import type { TActivityListRow } from "#api/modules/activity/activity.types";
import { chunk } from "#api/shared/array/array.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";

function likeContains(column: AnyColumn, text: string): SQL {
  return sql`${column} LIKE ${`%${escapeLike(text)}%`} ESCAPE ${LIKE_ESCAPE_CHARACTER}`;
}

function textCondition(text: string): SQL | undefined {
  return or(
    likeContains(schema.activity.title, text),
    likeContains(schema.activity.actor, text),
    likeContains(schema.activity.detail, text),
  );
}

function buildConditions(filters: IActivityListFilters): SQL[] {
  const conditions: (SQL | undefined)[] = [eq(schema.identity.userId, filters.userId)];
  if (filters.from) {
    conditions.push(gte(schema.activity.occurredAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(schema.activity.occurredAt, filters.to));
  }
  if (filters.sources) {
    conditions.push(inArray(schema.activity.source, filters.sources));
  }
  if (filters.identityIds) {
    conditions.push(inArray(schema.activity.identityId, filters.identityIds));
  }
  if (filters.kinds) {
    conditions.push(inArray(schema.activity.kind, filters.kinds));
  }
  if (filters.text) {
    conditions.push(textCondition(filters.text));
  }
  return conditions.filter((condition) => condition !== undefined);
}

export abstract class ActivityRepository {
  static async upsertAndRemove(input: IActivityWriteInput): Promise<void> {
    const now = dayjs().toISOString();
    const upserts = chunk(input.drafts, ACTIVITY_INSERT_ROWS).map((drafts) =>
      db
        .insert(schema.activity)
        .values(drafts.map((draft) => toInsert(draft, input, now)))
        .onConflictDoUpdate({
          target: [schema.activity.connectionId, schema.activity.externalId],
          set: {
            kind: sql`excluded.kind`,
            occurredAt: sql`excluded.occurred_at`,
            endsAt: sql`excluded.ends_at`,
            title: sql`excluded.title`,
            url: sql`excluded.url`,
            actor: sql`excluded.actor`,
            detail: sql`excluded.detail`,
            updatedAt: sql`excluded.updated_at`,
          },
        }),
    );
    const removals = chunk(input.removedExternalIds, ACTIVITY_DELETE_CHUNK).map((externalIds) =>
      db
        .delete(schema.activity)
        .where(
          and(
            eq(schema.activity.connectionId, input.connectionId),
            inArray(schema.activity.externalId, externalIds),
          ),
        ),
    );
    const [first, ...rest] = [...upserts, ...removals];
    if (!first) {
      return;
    }
    await db.batch([first, ...rest]);
  }

  static async listCommentedDriveFileIds(connectionId: string): Promise<string[]> {
    const rows = await db
      .select({ externalId: schema.activity.externalId })
      .from(schema.activity)
      .where(
        and(
          eq(schema.activity.connectionId, connectionId),
          eq(schema.activity.kind, EActivityKind.DRIVE_COMMENT),
          isNotNull(schema.activity.actor),
        ),
      );
    const fileIds = rows.flatMap((row) => driveFileIdFromExternalId(row.externalId) ?? []);
    return [...new Set(fileIds)];
  }

  static async list(filters: IActivityListFilters): Promise<TActivityListRow[]> {
    return await db
      .select({
        id: schema.activity.id,
        identityId: schema.activity.identityId,
        identityEmail: schema.identity.email,
        source: schema.activity.source,
        kind: schema.activity.kind,
        occurredAt: schema.activity.occurredAt,
        endsAt: schema.activity.endsAt,
        title: schema.activity.title,
        url: schema.activity.url,
        actor: schema.activity.actor,
        detail: schema.activity.detail,
      })
      .from(schema.activity)
      .innerJoin(schema.identity, eq(schema.activity.identityId, schema.identity.id))
      .where(and(...buildConditions(filters)))
      .orderBy(desc(schema.activity.occurredAt), desc(schema.activity.id))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize);
  }

  static async count(filters: IActivityListFilters): Promise<number> {
    const rows = await db
      .select({ total: count() })
      .from(schema.activity)
      .innerJoin(schema.identity, eq(schema.activity.identityId, schema.identity.id))
      .where(and(...buildConditions(filters)));
    return rows[0]?.total ?? 0;
  }
}
