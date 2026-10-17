import { describe, expect, test } from "bun:test";

import { buildSignUpIdentityRow } from "#api/shared/auth/auth.helpers";
import {
  GOOGLE_PROFILE,
  TEST_AVATAR_URL,
  TEST_USER_NAME,
} from "#api-tests/fixtures/fixtures.constants";

describe("buildSignUpIdentityRow", () => {
  test.each([
    [TEST_AVATAR_URL, TEST_AVATAR_URL],
    [null, null],
  ])("maps image %p to avatarUrl %p", (image, avatarUrl) => {
    const row = buildSignUpIdentityRow({
      id: "identity-1",
      userId: "user-1",
      googleSub: GOOGLE_PROFILE.sub,
      profile: { name: TEST_USER_NAME, email: GOOGLE_PROFILE.email, image },
    });

    expect(row).toMatchObject({
      id: "identity-1",
      userId: "user-1",
      googleSub: GOOGLE_PROFILE.sub,
      email: GOOGLE_PROFILE.email,
      displayName: TEST_USER_NAME,
      avatarUrl,
    });
    expect(row.createdAt).toBe(row.updatedAt);
  });
});
