import { afterEach, describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import { JiraService } from "#api/shared/providers/jira/jira.service";
import {
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  PROVIDER_EMAIL,
} from "#api-tests/unit/shared/providers/providers.constants";
import {
  recordedRequests,
  restoreFetch,
  stubFetch,
  stubFetchSequence,
} from "#api-tests/unit/shared/providers/providers.fixtures";

const REDIRECT_URI = "http://localhost:3107/api/connect/jira/callback";
const TOKEN_BODY = {
  access_token: "jira-access",
  refresh_token: "jira-refresh",
  expires_in: 3600,
  scope: "read:jira-user read:jira-work offline_access",
  token_type: "bearer",
};
const SITE = {
  id: "cloud-1",
  name: "Acme",
  url: "https://acme.atlassian.net",
  scopes: ["read:jira-user", "read:jira-work"],
  avatarUrl: "https://img.test/acme.png",
};

afterEach(() => {
  restoreFetch();
});

describe("JiraService.createAuthorization", () => {
  test("builds an atlassian consent url with offline access and no pkce", () => {
    const { authorizeUrl, codeVerifier } = JiraService.createAuthorization({
      state: "state-1",
      redirectUri: REDIRECT_URI,
    });
    const url = new URL(authorizeUrl);
    expect(url.origin).toBe("https://auth.atlassian.com");
    expect(url.searchParams.get("client_id")).toBe(ENV.jira.clientId);
    expect(url.searchParams.get("audience")).toBe("api.atlassian.com");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(url.searchParams.get("scope")?.split(" ")).toContain("offline_access");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(codeVerifier).toBeNull();
  });
});

describe("JiraService.exchangeCode", () => {
  test("exchanges the code, picks the site and reads the account", async () => {
    stubFetchSequence([
      { status: HTTP_OK, body: TOKEN_BODY },
      { status: HTTP_OK, body: [SITE] },
      { status: HTTP_OK, body: { accountId: "acc-1", emailAddress: PROVIDER_EMAIL } },
    ]);
    const grant = await JiraService.exchangeCode({ code: "code-1", redirectUri: REDIRECT_URI });
    expect(grant).toEqual({
      tokens: {
        accessToken: "jira-access",
        refreshToken: "jira-refresh",
        expiresInSeconds: 3600,
        scopes: ["read:jira-user", "read:jira-work", "offline_access"],
      },
      account: { accountId: "acc-1", accountEmail: PROVIDER_EMAIL },
      site: "acme.atlassian.net",
      resourceId: "cloud-1",
    });
    expect(recordedRequests.map((request) => request.url)).toEqual([
      "https://auth.atlassian.com/oauth/token",
      "https://api.atlassian.com/oauth/token/accessible-resources",
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/myself",
    ]);
    expect(JSON.parse(recordedRequests[0]?.body ?? "")).toEqual({
      grant_type: "authorization_code",
      client_id: ENV.jira.clientId,
      client_secret: ENV.jira.clientSecret,
      code: "code-1",
      redirect_uri: REDIRECT_URI,
    });
    expect(recordedRequests[2]?.headers.get("authorization")).toBe("Bearer jira-access");
  });

  test("throws when the grant reaches no jira site", async () => {
    stubFetchSequence([
      { status: HTTP_OK, body: TOKEN_BODY },
      { status: HTTP_OK, body: [] },
    ]);
    const exchange = JiraService.exchangeCode({ code: "code-1", redirectUri: REDIRECT_URI });
    await expect(exchange).rejects.toThrow(EJiraMessages.NO_ACCESSIBLE_SITE);
  });

  test("throws when atlassian rejects the code", async () => {
    stubFetch(HTTP_UNAUTHORIZED, { error: "invalid_grant" });
    const exchange = JiraService.exchangeCode({ code: "bad-code", redirectUri: REDIRECT_URI });
    await expect(exchange).rejects.toThrow();
  });
});
