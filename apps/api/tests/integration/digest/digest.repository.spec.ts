import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { DIGEST_WORKFLOW_BATCH_MAX } from "#api/modules/digest/digest.constants";
import { EDigestStatus } from "#api/modules/digest/digest.enums";
import { DigestRepository } from "#api/modules/digest/digest.repository";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { createUser, uniqueEmail, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";

const MANY_USERS = 150;
const DIGEST_DATE = "2026-10-19";
const FAILURE_MESSAGE = "launch failed";

async function seedPendingDigests(count: number): Promise<string[]> {
  const stamp = dayjs().toISOString();
  const userIds = await Promise.all(Array.from({ length: count }, () => createUser(uniqueEmail())));
  const started = await DigestRepository.startMany(
    userIds.map((userId) => ({
      userId,
      digestDate: DIGEST_DATE,
      windowStart: stamp,
      windowEnd: stamp,
    })),
  );
  return started.map((row) => row.id);
}

beforeEach(wipeDatabase);

afterAll(wipeDatabase);

describe("DigestRepository.saveFailedMany", () => {
  test("marks a full Workflow batch failed", async () => {
    const ids = await seedPendingDigests(DIGEST_WORKFLOW_BATCH_MAX);

    await DigestRepository.saveFailedMany(ids, FAILURE_MESSAGE);

    const rows = await db
      .select()
      .from(schema.digest)
      .where(eq(schema.digest.status, EDigestStatus.FAILED));
    expect(rows).toHaveLength(DIGEST_WORKFLOW_BATCH_MAX);
    expect(rows.every((row) => row.error === FAILURE_MESSAGE)).toBe(true);
  });
});

describe("DigestRepository.listPastDigests", () => {
  test("reads the past Digests of more users than one statement can bind", async () => {
    const ids = await seedPendingDigests(MANY_USERS);
    const rows = await db.select({ userId: schema.digest.userId }).from(schema.digest);
    expect(ids).toHaveLength(MANY_USERS);

    const past = await DigestRepository.listPastDigests(rows.map((row) => row.userId));

    expect(past).toHaveLength(MANY_USERS);
    expect(past.every((row) => row.digestDate === DIGEST_DATE)).toBe(true);
  });
});

describe("DigestRepository.start", () => {
  test("gives a replaced Digest a new id so an old run cannot write to it", async () => {
    const userId = await createUser(uniqueEmail());
    const stamp = dayjs().toISOString();
    const input = { userId, digestDate: DIGEST_DATE, windowStart: stamp, windowEnd: stamp };
    const firstId = await DigestRepository.start(input);
    if (!firstId) {
      throw new Error("first start did not return an id");
    }
    await DigestRepository.saveFailed(firstId, FAILURE_MESSAGE);

    const secondId = await DigestRepository.start(input);
    await DigestRepository.saveFailed(firstId, FAILURE_MESSAGE);

    expect(secondId).not.toBeNull();
    expect(secondId).not.toBe(firstId);
    const rows = await db.select().from(schema.digest).where(eq(schema.digest.userId, userId));
    expect(rows.map((row) => ({ id: row.id, status: row.status }))).toEqual([
      { id: secondId ?? "", status: EDigestStatus.PENDING },
    ]);
  });
});
