import { describe, expect, test } from "bun:test";

import { dayjs } from "#api/shared/date/date.helpers";
import { EGoogleMessages } from "#api/shared/providers/google/google.enums";
import { toGoogleProfile, toGoogleTokens } from "#api/shared/providers/google/google.helpers";

const ONE_HOUR_IN_SECONDS = 3600;
const CLOCK_SLACK_SECONDS = 5;

describe("toGoogleProfile", () => {
  test("maps the id token payload", () => {
    expect(
      toGoogleProfile({
        sub: "sub-1",
        email: "work@employer.example",
        name: "Work User",
        picture: "https://img.test/a.png",
        iss: "accounts.google.com",
        aud: "client",
        iat: 0,
        exp: 0,
      }),
    ).toEqual({
      sub: "sub-1",
      email: "work@employer.example",
      name: "Work User",
      picture: "https://img.test/a.png",
    });
  });

  test("throws without a subject or email", () => {
    expect(() => toGoogleProfile(undefined)).toThrow(EGoogleMessages.INVALID_PROFILE);
    expect(() =>
      toGoogleProfile({ sub: "sub-1", iss: "accounts.google.com", aud: "client", iat: 0, exp: 0 }),
    ).toThrow(EGoogleMessages.INVALID_PROFILE);
  });
});

describe("toGoogleTokens", () => {
  test("computes the seconds left until expiry", () => {
    const tokens = toGoogleTokens("access", {
      refresh_token: "refresh",
      expiry_date: dayjs().add(ONE_HOUR_IN_SECONDS, "second").valueOf(),
    });
    expect(tokens.accessToken).toBe("access");
    expect(tokens.refreshToken).toBe("refresh");
    expect(tokens.expiresInSeconds).toBeGreaterThan(ONE_HOUR_IN_SECONDS - CLOCK_SLACK_SECONDS);
  });

  test("leaves refresh token and expiry undefined when google omits them", () => {
    expect(toGoogleTokens("access", { refresh_token: null })).toEqual({
      accessToken: "access",
      refreshToken: undefined,
      expiresInSeconds: undefined,
      scopes: [],
    });
  });

  test("splits the granted scopes", () => {
    expect(toGoogleTokens("access", { scope: "openid email" }).scopes).toEqual(["openid", "email"]);
  });
});
