import { beforeEach, describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";
import type { IActivityDraft } from "#api/modules/activity/activity.interfaces";
import { ActivityRepository } from "#api/modules/activity/activity.repository";
import { db } from "#api/shared/db/db.client";
import {
  createUser,
  seedGoogleConnection,
  uniqueEmail,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const MANY_DRAFTS = 20;
const MANY_REMOVALS = 150;

function draft(index: number, title = `Event ${index}`): IActivityDraft {
  return {
    source: ESource.CALENDAR,
    kind: EActivityKind.CALENDAR_EVENT,
    externalId: `event-${index}`,
    occurredAt: "2026-10-16T09:00:00.000Z",
    endsAt: null,
    title,
    url: "https://www.google.com/calendar/event?eid=1",
    actor: null,
    detail: null,
  };
}

let seeded: Awaited<ReturnType<typeof seedGoogleConnection>>;

async function titles(): Promise<string[]> {
  const rows = await db
    .select({ title: schema.activity.title })
    .from(schema.activity)
    .where(eq(schema.activity.connectionId, seeded.connectionId));
  return rows.map((row) => row.title).sort();
}

beforeEach(async () => {
  await wipeDatabase();
  seeded = await seedGoogleConnection(await createUser(uniqueEmail()));
});

describe("ActivityRepository.upsertAndRemove", () => {
  test("writes more rows than one statement can bind and updates them on a second write", async () => {
    const drafts = Array.from({ length: MANY_DRAFTS }, (_, index) => draft(index));
    await ActivityRepository.upsertAndRemove({ ...seeded, drafts, removedExternalIds: [] });
    await ActivityRepository.upsertAndRemove({
      ...seeded,
      drafts: [draft(0, "Renamed")],
      removedExternalIds: [],
    });

    const saved = await titles();
    expect(saved.length).toBe(MANY_DRAFTS);
    expect(saved).toContain("Renamed");
    expect(saved).not.toContain("Event 0");
  });

  test("removes rows by external id, also for long lists", async () => {
    const ids = Array.from({ length: MANY_REMOVALS }, (_, index) => `event-${index}`);
    await ActivityRepository.upsertAndRemove({
      ...seeded,
      drafts: [draft(0), draft(1)],
      removedExternalIds: [],
    });

    await ActivityRepository.upsertAndRemove({ ...seeded, drafts: [], removedExternalIds: ids });

    expect(await titles()).toEqual([]);
  });

  test("does nothing for an empty batch", async () => {
    await ActivityRepository.upsertAndRemove({ ...seeded, drafts: [], removedExternalIds: [] });

    expect(await titles()).toEqual([]);
  });
});

function driveComment(externalId: string, actor: string | null): IActivityDraft {
  return {
    ...draft(0),
    source: ESource.DRIVE,
    kind: EActivityKind.DRIVE_COMMENT,
    externalId,
    actor,
  };
}

describe("ActivityRepository.listCommentedDriveFileIds", () => {
  test("returns the files where the user commented, not files where only others did", async () => {
    await ActivityRepository.upsertAndRemove({
      ...seeded,
      drafts: [
        driveComment("comment:file-1:2026-10-16T05:00:00.000Z:people/me", "me@example.com"),
        driveComment("comment:file-1:2026-10-16T06:00:00.000Z:people/me", "me@example.com"),
        driveComment("comment:file-2:2026-10-16T05:00:00.000Z:people/other", null),
        { ...draft(0), externalId: "event-5", actor: "me@example.com" },
      ],
      removedExternalIds: [],
    });

    const ids = await ActivityRepository.listCommentedDriveFileIds(seeded.connectionId);

    expect(ids).toEqual(["file-1"]);
  });
});
