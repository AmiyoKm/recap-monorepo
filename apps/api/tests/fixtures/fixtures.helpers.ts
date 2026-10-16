import { randomUUID } from "node:crypto";

import { schema } from "@recap/db";

import { cache } from "#api/shared/cache/cache.client";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
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
  await db.batch([
    db.delete(schema.pendingGrant),
    db.delete(schema.rateLimit),
    db.delete(schema.verification),
    db.delete(schema.connection),
    db.delete(schema.identity),
    db.delete(schema.session),
    db.delete(schema.account),
    db.delete(schema.user),
  ]);
}

export async function wipeCache(): Promise<void> {
  const { keys } = await cache.list();
  await Promise.all(keys.map((key) => cache.delete(key.name)));
}
