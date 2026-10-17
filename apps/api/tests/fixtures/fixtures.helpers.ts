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
  JIRA_CLOUD_ID,
  JIRA_REFRESH_TOKEN,
  JIRA_SITE,
  LINEAR_GRANT,
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

interface ISeedConnectionInput {
  provider: EProvider;
  refreshToken: string;
  tokens: Parameters<typeof buildOAuthConnectionRow>[0]["tokens"];
  account: Parameters<typeof buildOAuthConnectionRow>[0]["account"];
  site: string | null;
  resourceId: string | null;
}

async function seedIdentity(userId: string, email: string): Promise<string> {
  const identityId = randomUUID();
  const now = dayjs().toISOString();
  await db.insert(schema.identity).values({
    id: identityId,
    userId,
    googleSub: `sub-${identityId}`,
    email,
    displayName: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  return identityId;
}

async function seedConnection(
  userId: string,
  email: string,
  input: ISeedConnectionInput,
): Promise<{ identityId: string; connectionId: string }> {
  const identityId = await seedIdentity(userId, email);
  const connectionId = randomUUID();
  await db
    .insert(schema.connection)
    .values(buildOAuthConnectionRow({ id: connectionId, identityId, ...input }));
  return { identityId, connectionId };
}

export function seedGoogleConnection(
  userId: string,
  scopes: string[] = ALL_SOURCES_GRANTED_SCOPES,
): Promise<{ identityId: string; connectionId: string }> {
  return seedConnection(userId, CALENDAR_EMAIL, {
    provider: EProvider.GOOGLE,
    refreshToken: "refresh-token-1",
    tokens: {
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1",
      expiresInSeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
      scopes,
    },
    account: { accountId: `sub-${userId}`, accountEmail: CALENDAR_EMAIL },
    site: null,
    resourceId: null,
  });
}

export function seedJiraConnection(
  userId: string,
  email: string,
): Promise<{ identityId: string; connectionId: string }> {
  return seedConnection(userId, email, {
    provider: EProvider.JIRA,
    refreshToken: JIRA_REFRESH_TOKEN,
    tokens: {
      accessToken: "jira-access-1",
      refreshToken: JIRA_REFRESH_TOKEN,
      expiresInSeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
      scopes: ["read:jira-user", "read:jira-work", "offline_access"],
    },
    account: { accountId: `jira-${userId}`, accountEmail: email },
    site: JIRA_SITE,
    resourceId: JIRA_CLOUD_ID,
  });
}

export function seedLinearConnection(
  userId: string,
): Promise<{ identityId: string; connectionId: string }> {
  return seedConnection(userId, CALENDAR_EMAIL, {
    provider: EProvider.LINEAR,
    refreshToken: "linear-refresh-1",
    tokens: LINEAR_GRANT.tokens,
    account: LINEAR_GRANT.account,
    site: null,
    resourceId: null,
  });
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
