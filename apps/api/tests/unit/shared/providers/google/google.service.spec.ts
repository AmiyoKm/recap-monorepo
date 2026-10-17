import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { gaxios, OAuth2Client } from "google-auth-library";

import { ENV } from "#api/shared/env/env.constants";
import { EGoogleMessages } from "#api/shared/providers/google/google.enums";
import { GoogleService } from "#api/shared/providers/google/google.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_SERVER_ERROR,
} from "#api-tests/unit/shared/providers/providers.constants";

const REVOKE_URL = new URL("https://oauth2.googleapis.com/revoke");

const REVOKE_CONFIG = { url: REVOKE_URL, headers: new Headers() };

async function revokeResponse<TData extends object>(status: number, data: TData) {
  const response = new Response(JSON.stringify(data), { status });
  await response.text();
  return Object.assign(response, { config: REVOKE_CONFIG, data });
}

async function revokeError(
  status?: number,
  oauthError = "invalid_token",
): Promise<InstanceType<typeof gaxios.GaxiosError>> {
  if (status === undefined) {
    return new gaxios.GaxiosError("network down", REVOKE_CONFIG);
  }
  const response = await revokeResponse(status, { error: oauthError });
  return new gaxios.GaxiosError("revoke failed", REVOKE_CONFIG, response);
}

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
    expect(url.searchParams.get("client_id")).toBe(ENV.auth.google.clientId);
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

describe("GoogleService.revokeToken", () => {
  test("revokes the refresh token at google", async () => {
    const revoke = spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(() =>
      revokeResponse(HTTP_OK, { success: true }),
    );
    await GoogleService.revokeToken("refresh-1");
    expect(revoke).toHaveBeenCalledWith("refresh-1");
  });

  test("resolves when google rejects the token as invalid or revoked", async () => {
    spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(async () => {
      throw await revokeError(HTTP_BAD_REQUEST);
    });
    await expect(GoogleService.revokeToken("refresh-1")).resolves.toBeUndefined();
  });

  test.each([
    { name: "a server failure", status: HTTP_SERVER_ERROR, oauthError: "server_error" },
    { name: "a bad request", status: HTTP_BAD_REQUEST, oauthError: "invalid_request" },
    { name: "a network failure", status: undefined, oauthError: undefined },
  ])("throws on $name", async ({ status, oauthError }) => {
    spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(async () => {
      throw await revokeError(status, oauthError);
    });
    await expect(GoogleService.revokeToken("refresh-1")).rejects.toThrow();
  });
});
