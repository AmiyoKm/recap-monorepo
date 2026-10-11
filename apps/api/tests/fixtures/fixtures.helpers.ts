import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { schema } from "@recap/db";

import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";
import { redis } from "#api/shared/redis/redis.client";
import { TEST_USER_NAME } from "#api-tests/fixtures/fixtures.constants";

export function uniqueEmail(): string {
  return `user-${randomUUID()}@test.example`;
}

export async function createUser(email: string): Promise<string> {
  const id = randomUUID();
  const now = dayjs().toDate();
  await db.insert(schema.user).values({
    id,
    name: TEST_USER_NAME,
    email,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function wipeDatabase(): Promise<void> {
  await db.execute(
    sql`truncate table "identity", "connection", "session", "account", "user" cascade`,
  );
}

export async function wipeRedis(): Promise<void> {
  const found: unknown = await redis.send("KEYS", [`${ENV.redisKeyPrefix}*`]);
  if (!Array.isArray(found)) {
    return;
  }
  const names = found.filter((entry): entry is string => typeof entry === "string");
  if (names.length === 0) {
    return;
  }
  await redis.del(...names);
}
