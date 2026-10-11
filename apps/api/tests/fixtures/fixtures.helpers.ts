import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { schema } from "@recap/db";

import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";
import { redis } from "#api/shared/redis/redis.client";
import { ERedisCommand } from "#api/shared/redis/redis.enums";
import { TEST_DATABASE_SUFFIX, TEST_USER_NAME } from "#api-tests/fixtures/fixtures.constants";
import { ETestMessages } from "#api-tests/fixtures/fixtures.enums";

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

function requireTestDatabase(): void {
  if (!new URL(ENV.databaseUrl).pathname.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(ETestMessages.NOT_A_TEST_DATABASE, { cause: ENV.databaseUrl });
  }
}

export async function wipeDatabase(): Promise<void> {
  requireTestDatabase();
  await db.execute(
    sql`truncate table "identity", "connection", "session", "account", "user" cascade`,
  );
}

export async function wipeRedis(): Promise<void> {
  requireTestDatabase();
  const found: unknown = await redis.send(ERedisCommand.KEYS, [`${ENV.redisKeyPrefix}*`]);
  if (!Array.isArray(found)) {
    return;
  }
  const names = found.filter((entry): entry is string => typeof entry === "string");
  if (names.length === 0) {
    return;
  }
  await redis.del(...names);
}
