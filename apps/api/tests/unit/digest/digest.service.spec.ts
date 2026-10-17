import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { ESource } from "#api/modules/activity/activity.enums";
import {
  DIGEST_ACTIVITY_LIMIT,
  DIGEST_FINAL_PULL_MAX_PAGES,
  DIGEST_MODEL,
} from "#api/modules/digest/digest.constants";
import { EDigestStatus } from "#api/modules/digest/digest.enums";
import { parseDigestContent, parseMissingSources } from "#api/modules/digest/digest.helpers";
import { DigestService } from "#api/modules/digest/digest.service";
import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { EPullOutcome } from "#api/modules/pull/pull.enums";
import { PullService } from "#api/modules/pull/pull.service";
import { AiService } from "#api/shared/ai/ai.service";
import { bindings } from "#api/shared/bindings/bindings.client";
import type { IDigestWorkflowParams } from "#api/shared/bindings/bindings.interfaces";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import {
  createUser,
  installFakeDigestWorkflow,
  seedActivity,
  seedGoogleConnection,
  uniqueEmail,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const WEDNESDAY_8_DHAKA = "2026-10-14T02:00:00.000Z";
const WINDOW_START = "2026-10-13T02:00:00.000Z";
const IN_WINDOW = "2026-10-13T10:00:00.000Z";
const MEETING_TODAY = "2026-10-14T05:30:00.000Z";
const MANY_USERS = 3;
const MEETING_TOMORROW = "2026-10-14T19:00:00.000Z";

let userId: string;
let first: Awaited<ReturnType<typeof seedGoogleConnection>>;
let created: IDigestWorkflowParams[];
let restoreWorkflow: () => void;

async function digestRow(id: string) {
  const rows = await db.select().from(schema.digest).where(eq(schema.digest.id, id));
  const [row] = rows;
  if (!row) {
    throw new Error("Digest row is missing");
  }
  return row;
}

async function startedDigest(): Promise<string> {
  const id = await DigestService.startDigest(userId, WEDNESDAY_8_DHAKA);
  if (!id) {
    throw new Error("Digest did not start");
  }
  return id;
}

beforeEach(async () => {
  await wipeDatabase();
  userId = await createUser(uniqueEmail());
  first = await seedGoogleConnection(userId);
  ({ created, restore: restoreWorkflow } = installFakeDigestWorkflow());
});

afterEach(() => {
  mock.restore();
  restoreWorkflow();
});

describe("DigestService.startDigest", () => {
  test("creates a pending row for the local date with a 24 hour window", async () => {
    const id = await startedDigest();

    const row = await digestRow(id);
    expect(row).toMatchObject({
      status: EDigestStatus.PENDING,
      digestDate: "2026-10-14",
      windowStart: WINDOW_START,
      windowEnd: WEDNESDAY_8_DHAKA,
      content: null,
      missingSources: "[]",
    });
  });

  test("starts the window at the previous Digest's window end", async () => {
    await startedDigest();
    const nextDay = "2026-10-15T02:00:00.000Z";

    const id = await DigestService.startDigest(userId, nextDay);

    expect((await digestRow(id ?? "")).windowStart).toBe(WEDNESDAY_8_DHAKA);
  });

  test("returns null while a run is pending or running", async () => {
    const id = await startedDigest();
    expect(await DigestService.startDigest(userId, WEDNESDAY_8_DHAKA)).toBeNull();

    await db
      .update(schema.digest)
      .set({ status: EDigestStatus.RUNNING })
      .where(eq(schema.digest.id, id));
    expect(await DigestService.startDigest(userId, WEDNESDAY_8_DHAKA)).toBeNull();
  });

  test("resets a failed Digest under a new id", async () => {
    const id = await startedDigest();
    await DigestService.failDigest(id, new Error("boom"));

    const restarted = await DigestService.startDigest(userId, WEDNESDAY_8_DHAKA);

    expect(restarted).not.toBe(id);
    expect(await digestRow(restarted ?? "")).toMatchObject({
      status: EDigestStatus.PENDING,
      error: null,
    });
  });
});

describe("DigestService.preparePull", () => {
  test("marks the Digest running and lists the Connection ids", async () => {
    const second = await seedGoogleConnection(userId);
    const id = await startedDigest();

    const connectionIds = await DigestService.preparePull(userId, id);

    expect((await digestRow(id)).status).toBe(EDigestStatus.RUNNING);
    expect([...connectionIds].sort()).toEqual([first.connectionId, second.connectionId].sort());
  });
});

describe("DigestService.pullForDigest", () => {
  test("pulls the Connection up to the page cap and records nothing when it completes", async () => {
    const pull = spyOn(PullService, "pullConnectionUpTo").mockResolvedValue(EPullOutcome.COMPLETE);

    const missing = await DigestService.pullForDigest(first.connectionId);

    expect(missing).toBeNull();
    expect(pull).toHaveBeenCalledWith(first.connectionId, DIGEST_FINAL_PULL_MAX_PAGES);
  });

  test("records a Connection that still has pages at the cap", async () => {
    spyOn(PullService, "pullConnectionUpTo").mockResolvedValue(EPullOutcome.MORE_PAGES);

    const missing = await DigestService.pullForDigest(first.connectionId);

    expect(missing).toMatchObject({ connectionId: first.connectionId, provider: "google" });
    expect(missing?.sources).toContain("calendar");
  });

  test("records a Connection that the provider rejects", async () => {
    spyOn(PullService, "pullConnectionUpTo").mockResolvedValue(EPullOutcome.REJECTED);

    const missing = await DigestService.pullForDigest(first.connectionId);

    expect(missing?.connectionId).toBe(first.connectionId);
  });

  test("records a Connection whose pull throws", async () => {
    spyOn(PullService, "pullConnectionUpTo").mockRejectedValue(new Error("provider down"));
    spyOn(console, "error").mockImplementation(() => undefined);

    const missing = await DigestService.pullForDigest(first.connectionId);

    expect(missing?.connectionId).toBe(first.connectionId);
  });

  test("records a Connection that needs to reconnect without pulling", async () => {
    await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT })
      .where(eq(schema.connection.id, first.connectionId));
    const pull = spyOn(PullService, "pullConnectionUpTo");

    const missing = await DigestService.pullForDigest(first.connectionId);

    expect(missing?.connectionId).toBe(first.connectionId);
    expect(pull).not.toHaveBeenCalled();
  });
});

describe("DigestService.saveMissingSources", () => {
  test("saves the list on the Digest", async () => {
    const id = await startedDigest();
    const entry = {
      connectionId: first.connectionId,
      identityEmail: "a@example.test",
      provider: "google",
      sources: [ESource.CALENDAR],
    };

    await DigestService.saveMissingSources(id, [entry]);

    expect(parseMissingSources((await digestRow(id)).missingSources)).toEqual([entry]);
  });
});

describe("DigestService.writeDigest", () => {
  test("skips the AI on an empty window and saves Nothing new with the meetings ahead", async () => {
    const ai = spyOn(AiService, "generateObject");
    await seedActivity({ ...first, title: "Standup", occurredAt: MEETING_TODAY });
    await seedActivity({ ...first, title: "Tomorrow", occurredAt: MEETING_TOMORROW });
    const id = await startedDigest();

    await DigestService.writeDigest(id);

    expect(ai).not.toHaveBeenCalled();
    const row = await digestRow(id);
    expect(row.status).toBe(EDigestStatus.READY);
    const content = parseDigestContent(row.content);
    expect(content?.nothingNew).toBe(true);
    expect(content?.sections).toHaveLength(1);
    expect(content?.sections[0]?.meetingsAhead.map((item) => item.text)).toEqual(["11:30 Standup"]);
  });

  test("sends the window to the AI and saves its items linked to Activity ids", async () => {
    const mailId = await seedActivity({
      ...first,
      title: "Budget thread",
      occurredAt: IN_WINDOW,
      source: "gmail",
      kind: "email_received",
    });
    const meetingId = await seedActivity({ ...first, title: "Standup", occurredAt: MEETING_TODAY });
    const ai = spyOn(AiService, "generateObject").mockResolvedValue({
      sections: [
        {
          identityId: first.identityId,
          highlights: [{ text: "Budget thread opened", activityIds: [mailId, "ghost"] }],
          meetingsAhead: [{ text: "Standup at 11:30", activityIds: [meetingId] }],
          needsYou: [],
        },
      ],
    });
    const id = await startedDigest();

    await DigestService.writeDigest(id);

    const [input] = ai.mock.calls[0] ?? [];
    expect(input?.model).toBe(DIGEST_MODEL);
    expect(input?.prompt).toContain(mailId);
    expect(input?.prompt).toContain(meetingId);
    const row = await digestRow(id);
    expect(row).toMatchObject({ status: EDigestStatus.READY, model: DIGEST_MODEL });
    expect(parseDigestContent(row.content)?.sections[0]).toMatchObject({
      highlights: [{ text: "Budget thread opened", activityIds: [mailId] }],
      meetingsAhead: [{ text: "Standup at 11:30", activityIds: [meetingId] }],
    });
  });

  test("reads the newest Activities and flags a cut when the window holds more than the limit", async () => {
    const total = DIGEST_ACTIVITY_LIMIT + 1;
    for (let index = 0; index < total; index += 1) {
      await seedActivity({
        ...first,
        title: `Item ${index}`,
        occurredAt: dayjs(WINDOW_START).add(index, "minute").toISOString(),
      });
    }
    const ai = spyOn(AiService, "generateObject").mockResolvedValue({ sections: [] });
    const id = await startedDigest();

    await DigestService.writeDigest(id);

    const [input] = ai.mock.calls[0] ?? [];
    expect(input?.prompt).not.toContain("| Item 0 |");
    expect(input?.prompt).toContain(`| Item ${total - 1} |`);
    expect(parseDigestContent((await digestRow(id)).content)?.truncated).toBe(true);
  });

  test("does not flag a cut when the window fits", async () => {
    await seedActivity({ ...first, title: "Budget thread", occurredAt: IN_WINDOW });
    spyOn(AiService, "generateObject").mockResolvedValue({ sections: [] });
    const id = await startedDigest();

    await DigestService.writeDigest(id);

    expect(parseDigestContent((await digestRow(id)).content)?.truncated).toBe(false);
  });

  test("throws on an AI failure and keeps the Activities, then failDigest saves the error", async () => {
    await seedActivity({ ...first, title: "Budget thread", occurredAt: IN_WINDOW });
    const failure = new Error("model overloaded");
    spyOn(AiService, "generateObject").mockRejectedValue(failure);
    const id = await startedDigest();

    await expect(DigestService.writeDigest(id)).rejects.toThrow("model overloaded");
    await DigestService.failDigest(id, failure);

    expect(await digestRow(id)).toMatchObject({
      status: EDigestStatus.FAILED,
      content: null,
      error: "Error: model overloaded",
    });
    expect(await db.select().from(schema.activity)).toHaveLength(1);
  });
});

describe("DigestService.startDueDigests", () => {
  test("starts one Workflow for a due user and none for a user who has a Digest", async () => {
    const other = await createUser(uniqueEmail());
    await seedGoogleConnection(other);
    await DigestService.startDigest(other, WEDNESDAY_8_DHAKA);

    await DigestService.startDueDigests(WEDNESDAY_8_DHAKA);

    expect(created).toHaveLength(1);
    expect(created[0]?.userId).toBe(userId);
    const row = await digestRow(created[0]?.digestId ?? "");
    expect(row.status).toBe(EDigestStatus.PENDING);
  });

  test.each([
    { name: "before 8:00", now: "2026-10-14T01:00:00.000Z" },
    { name: "after 8:00", now: "2026-10-14T04:00:00.000Z" },
    { name: "on a Saturday", now: "2026-10-17T02:00:00.000Z" },
  ])("starts nothing $name", async ({ now }) => {
    await DigestService.startDueDigests(now);

    expect(created).toEqual([]);
    expect(await db.select().from(schema.digest)).toEqual([]);
  });

  test("starts nothing for a user with no active Connection", async () => {
    await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT })
      .where(eq(schema.connection.id, first.connectionId));

    await DigestService.startDueDigests(WEDNESDAY_8_DHAKA);

    expect(created).toEqual([]);
  });
});

async function countD1Calls(run: () => Promise<void>): Promise<number> {
  const spies = [
    spyOn(db, "select"),
    spyOn(db, "insert"),
    spyOn(db, "update"),
    spyOn(db, "delete"),
    spyOn(db, "batch"),
  ];
  await run();
  const total = spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
  for (const spy of spies) {
    spy.mockRestore();
  }
  return total;
}

describe("DigestService.startDueDigests D1 budget", () => {
  test("uses the same number of D1 calls for one due user and for many", async () => {
    const one = await countD1Calls(() => DigestService.startDueDigests(WEDNESDAY_8_DHAKA));
    await db.delete(schema.digest);
    created.length = 0;
    for (let index = 0; index < MANY_USERS; index += 1) {
      const other = await createUser(uniqueEmail());
      await seedGoogleConnection(other);
    }

    const many = await countD1Calls(() => DigestService.startDueDigests(WEDNESDAY_8_DHAKA));

    expect(created).toHaveLength(MANY_USERS + 1);
    expect(many).toBe(one);
  });

  test("reads past Digests in one batch and writes the pending rows in one batch", async () => {
    const batch = spyOn(db, "batch");

    await DigestService.startDueDigests(WEDNESDAY_8_DHAKA);

    expect(batch).toHaveBeenCalledTimes(2);
  });

  test("starts the window at each user's previous window end", async () => {
    const other = await createUser(uniqueEmail());
    await seedGoogleConnection(other);
    const previousEnd = "2026-10-13T02:00:00.000Z";
    await db.insert(schema.digest).values({
      id: "old-digest",
      userId: other,
      digestDate: "2026-10-13",
      windowStart: "2026-10-12T02:00:00.000Z",
      windowEnd: previousEnd,
      status: EDigestStatus.READY,
      missingSources: "[]",
      createdAt: previousEnd,
      updatedAt: previousEnd,
    });

    await DigestService.startDueDigests(WEDNESDAY_8_DHAKA);

    const otherRun = created.find((entry) => entry.userId === other);
    expect((await digestRow(otherRun?.digestId ?? "")).windowStart).toBe(previousEnd);
  });
});

describe("DigestService.startDueDigests launch failure", () => {
  test("marks every row without a launched Workflow failed with the error", async () => {
    const other = await createUser(uniqueEmail());
    await seedGoogleConnection(other);
    spyOn(bindings.DIGEST_WORKFLOW, "createBatch").mockRejectedValue(new Error("workflow down"));

    await expect(DigestService.startDueDigests(WEDNESDAY_8_DHAKA)).rejects.toThrow("workflow down");

    const rows = await db.select().from(schema.digest);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({ status: EDigestStatus.FAILED, error: "Error: workflow down" });
    }
  });

  test("lets Regenerate retry a row that failed to launch", async () => {
    spyOn(bindings.DIGEST_WORKFLOW, "createBatch").mockRejectedValue(new Error("workflow down"));
    await expect(DigestService.startDueDigests(WEDNESDAY_8_DHAKA)).rejects.toThrow();

    const restarted = await DigestService.startDigest(userId, WEDNESDAY_8_DHAKA);

    expect(restarted).not.toBeNull();
  });
});
