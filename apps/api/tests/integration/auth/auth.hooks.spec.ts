import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import type { TIdentityRow } from "#api/modules/identity/identity.types";
import { auth } from "#api/shared/auth/auth.client";
import { EAuthSocialProvider } from "#api/shared/auth/auth.enums";
import { AuthRepository } from "#api/shared/auth/auth.repository";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import {
  EXISTING_GOOGLE_SUB,
  GOOGLE_PROFILE,
  TEST_PASSWORD,
  TEST_USER_NAME,
} from "#api-tests/fixtures/fixtures.constants";
import { ETestMessages } from "#api-tests/fixtures/fixtures.enums";
import { createUser, uniqueEmail, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";

async function signUpWithGoogle(): Promise<string> {
  const context = await auth.$context;
  const { user } = await context.internalAdapter.createOAuthUser(
    {
      name: GOOGLE_PROFILE.name ?? TEST_USER_NAME,
      email: GOOGLE_PROFILE.email,
      emailVerified: true,
      image: GOOGLE_PROFILE.picture,
    },
    { providerId: EAuthSocialProvider.GOOGLE, accountId: GOOGLE_PROFILE.sub },
  );
  return user.id;
}

function listIdentities(userId: string): Promise<TIdentityRow[]> {
  return db.select().from(schema.identity).where(eq(schema.identity.userId, userId));
}

beforeEach(async () => {
  await wipeDatabase();
});

afterEach(() => {
  mock.restore();
});

describe("sign-up work account", () => {
  test("Google sign-up makes the first work account", async () => {
    const userId = await signUpWithGoogle();

    const identities = await listIdentities(userId);
    expect(identities).toHaveLength(1);
    expect(identities[0]).toMatchObject({
      googleSub: GOOGLE_PROFILE.sub,
      email: GOOGLE_PROFILE.email,
      displayName: GOOGLE_PROFILE.name,
      avatarUrl: GOOGLE_PROFILE.picture,
    });
  });

  test("email sign-up makes no work account", async () => {
    const { user } = await auth.api.signUpEmail({
      body: { name: TEST_USER_NAME, email: uniqueEmail(), password: TEST_PASSWORD },
    });

    expect(await listIdentities(user.id)).toHaveLength(0);
  });

  test("Google link on an email user with no work account makes one from the user row", async () => {
    const email = uniqueEmail();
    const userId = await createUser(email);
    const context = await auth.$context;

    await context.internalAdapter.linkAccount({
      userId,
      providerId: EAuthSocialProvider.GOOGLE,
      accountId: GOOGLE_PROFILE.sub,
    });

    const identities = await listIdentities(userId);
    expect(identities).toHaveLength(1);
    expect(identities[0]).toMatchObject({
      googleSub: GOOGLE_PROFILE.sub,
      email,
      displayName: TEST_USER_NAME,
      avatarUrl: null,
    });
  });

  test("Google link on a user with a work account adds no second one", async () => {
    const userId = await createUser(GOOGLE_PROFILE.email);
    const now = dayjs().toISOString();
    await db.insert(schema.identity).values({
      id: randomUUID(),
      userId,
      googleSub: EXISTING_GOOGLE_SUB,
      email: GOOGLE_PROFILE.email,
      createdAt: now,
      updatedAt: now,
    });
    const context = await auth.$context;

    await context.internalAdapter.linkAccount({
      userId,
      providerId: EAuthSocialProvider.GOOGLE,
      accountId: GOOGLE_PROFILE.sub,
    });

    const identities = await listIdentities(userId);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.googleSub).toBe(EXISTING_GOOGLE_SUB);
  });

  test("Google sign-up still works when the work account insert fails", async () => {
    spyOn(AuthRepository, "insertIdentity").mockRejectedValue(
      new Error(ETestMessages.UNKNOWN_TEST_CODE),
    );

    const userId = await signUpWithGoogle();

    expect(await listIdentities(userId)).toHaveLength(0);
  });
});
