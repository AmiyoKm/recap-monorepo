import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { OAuth2Client } from "google-auth-library";

import { ENV } from "#api/shared/env/env.constants";
import { EGoogleMessages } from "#api/shared/providers/google/google.enums";
import { GoogleService } from "#api/shared/providers/google/google.service";

afterEach(() => {
  mock.restore();
});

describe("GoogleService.createAuthorization", () => {
  test("builds a consent url with pkce and offline access", async () => {
    const { authorizeUrl, codeVerifier } = await GoogleService.createAuthorization({
      state: "state-1",
      redirectUri: "http://localhost:3107/callback",
      scopes: ["openid", "email"],
    });
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("client_id")).toBe(ENV.auth.google.clientId ?? null);
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")?.length).toBeGreaterThan(0);
    expect(codeVerifier.length).toBeGreaterThan(0);
  });
});

describe("GoogleService.exchangeCode", () => {
  test("rejects a token response without an id token", async () => {
    spyOn(OAuth2Client.prototype, "getToken").mockImplementation(() =>
      Promise.resolve({ tokens: { access_token: "access" }, res: null }),
    );
    const exchange = GoogleService.exchangeCode({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: "http://localhost:3107/callback",
    });
    await expect(exchange).rejects.toThrow(EGoogleMessages.ID_TOKEN_MISSING);
  });
});
