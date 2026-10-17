import { randomUUID } from "node:crypto";

import { schema } from "@recap/db";

import { buildOAuthConnectionRow } from "#api/modules/identity/identity.helpers";
import { auth } from "#api/shared/auth/auth.client";
import { cache } from "#api/shared/cache/cache.client";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { EProvider } from "#api/shared/providers/providers.enums";
import {
  ALL_SOURCES_GRANTED_SCOPES,
  CALENDAR_EMAIL,
  DEFAULT_TOKEN_EXPIRY_SECONDS,
  TEST_PASSWORD,
  TEST_USER_NAME,
} from "#api-tests/fixtures/fixtures.constants";
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

export async function wipeDatabase(): Promise<void> {
  await db.batch([
    db.delete(schema.activity),
    db.delete(schema.digestSetting),
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

export async function seedGoogleConnection(
  userId: string,
  scopes: string[] = ALL_SOURCES_GRANTED_SCOPES,
): Promise<{ identityId: string; connectionId: string }> {
  const identityId = randomUUID();
  const connectionId = randomUUID();
  const now = dayjs().toISOString();
  await db.insert(schema.identity).values({
    id: identityId,
    userId,
    googleSub: `sub-${identityId}`,
    email: CALENDAR_EMAIL,
    displayName: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.connection).values(
    buildOAuthConnectionRow({
      id: connectionId,
      identityId,
      provider: EProvider.GOOGLE,
      refreshToken: "refresh-token-1",
      tokens: {
        accessToken: "access-token-1",
        refreshToken: "refresh-token-1",
        expiresInSeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
        scopes,
      },
      account: { accountId: `sub-${identityId}`, accountEmail: CALENDAR_EMAIL },
      site: null,
      resourceId: null,
    }),
  );
  return { identityId, connectionId };
}

export async function signUpTestUser(email: string): Promise<{ cookie: string; userId: string }> {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: TEST_USER_NAME, email, password: TEST_PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  if (cookie.length === 0) {
    throw new Error(ETestMessages.SIGN_UP_SET_NO_SESSION_COOKIE);
  }
  return { cookie, userId: response.user.id };
}
