import { afterEach, describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { LinearService } from "#api/shared/providers/linear/linear.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  PROVIDER_EMAIL,
} from "#api-tests/unit/shared/providers/providers.constants";
import {
  recordedRequests,
  restoreFetch,
  stubFetch,
  stubFetchSequence,
} from "#api-tests/unit/shared/providers/providers.fixtures";

const REDIRECT_URI = "http://localhost:3107/api/connect/linear/callback";

afterEach(() => {
  restoreFetch();
});

describe("LinearService.createAuthorization", () => {
  test("builds a linear consent url with pkce", () => {
    const { authorizeUrl, codeVerifier } = LinearService.createAuthorization({
      state: "state-1",
      redirectUri: REDIRECT_URI,
    });
    const url = new URL(authorizeUrl);
    expect(`${url.origin}${url.pathname}`).toBe("https://linear.app/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe(ENV.linear?.clientId ?? null);
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(url.searchParams.get("scope")).toBe("read");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")?.length).toBeGreaterThan(0);
    expect(codeVerifier?.length).toBeGreaterThan(0);
  });
});

describe("LinearService.exchangeCode", () => {
  test("exchanges the code and reads the viewer with the access token", async () => {
    stubFetchSequence([
      {
        status: HTTP_OK,
        body: {
          access_token: "linear-access",
          refresh_token: "linear-refresh",
          expires_in: 86399,
          scope: "read",
          token_type: "Bearer",
        },
      },
      { status: HTTP_OK, body: { data: { viewer: { id: "lin-1", email: PROVIDER_EMAIL } } } },
    ]);
    const grant = await LinearService.exchangeCode({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: REDIRECT_URI,
    });
    expect(grant).toEqual({
      tokens: {
        accessToken: "linear-access",
        refreshToken: "linear-refresh",
        expiresInSeconds: 86399,
        scopes: ["read"],
      },
      account: { accountId: "lin-1", accountEmail: PROVIDER_EMAIL },
      site: null,
      resourceId: null,
    });
    expect(recordedRequests[0]?.url).toBe("https://api.linear.app/oauth/token");
    expect(recordedRequests[1]?.url).toBe("https://api.linear.app/graphql");
    expect(recordedRequests[1]?.headers.get("authorization")).toBe("Bearer linear-access");
  });

  test("throws when linear rejects the code", async () => {
    stubFetch(HTTP_BAD_REQUEST, { error: "invalid_grant" });
    const exchange = LinearService.exchangeCode({
      code: "bad-code",
      codeVerifier: "verifier-1",
      redirectUri: REDIRECT_URI,
    });
    await expect(exchange).rejects.toThrow();
  });
});
