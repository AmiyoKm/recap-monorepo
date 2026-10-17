import { describe, expect, test } from "bun:test";

import { OAuth2Tokens } from "arctic";

import { toLinearTokens } from "#api/shared/providers/linear/linear.helpers";

describe("toLinearTokens", () => {
  test("maps a full token response", () => {
    const tokens = new OAuth2Tokens({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 86399,
      scope: "read write",
      token_type: "Bearer",
    });
    expect(toLinearTokens(tokens)).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresInSeconds: 86399,
      scopes: ["read", "write"],
    });
  });

  test("leaves out a missing refresh token and scope", () => {
    const tokens = new OAuth2Tokens({
      access_token: "access",
      expires_in: 86399,
      token_type: "Bearer",
    });
    expect(toLinearTokens(tokens)).toMatchObject({ refreshToken: undefined, scopes: [] });
  });
});
