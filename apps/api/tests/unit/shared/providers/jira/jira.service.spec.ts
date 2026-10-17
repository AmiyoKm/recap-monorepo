import { afterEach, describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import { JiraService } from "#api/shared/providers/jira/jira.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
} from "#api-tests/fixtures/fixtures.constants";
import {
  HTTP_SERVER_ERROR,
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

describe("JiraService.refreshAccessToken", () => {
  test("refreshes with the refresh token and returns the rotated one", async () => {
    stubFetch(HTTP_OK, { ...TOKEN_BODY, refresh_token: "jira-refresh-2" });

    const tokens = await JiraService.refreshAccessToken("jira-refresh");

    expect(tokens?.refreshToken).toBe("jira-refresh-2");
    expect(tokens?.accessToken).toBe("jira-access");
    expect(JSON.parse(recordedRequests[0]?.body ?? "")).toEqual({
      grant_type: "refresh_token",
      client_id: ENV.jira.clientId,
      client_secret: ENV.jira.clientSecret,
      refresh_token: "jira-refresh",
    });
  });

  test("returns null when Atlassian rejects the refresh token", async () => {
    stubFetch(HTTP_BAD_REQUEST, {
      error: "invalid_grant",
      error_description: "Unknown or invalid refresh token.",
    });

    expect(await JiraService.refreshAccessToken("revoked")).toBeNull();
  });

  test("throws on other failures", async () => {
    stubFetch(HTTP_SERVER_ERROR, { error: "server_error" });

    await expect(JiraService.refreshAccessToken("jira-refresh")).rejects.toThrow();
  });
});

describe("JiraService.searchIssues", () => {
  const input = {
    accessToken: "jira-access",
    cloudId: "cloud-1",
    since: "2026-10-17T08:00:00.000Z",
  };

  test("searches the cloud site with the changelog and the page token", async () => {
    stubFetch(HTTP_OK, { issues: [{ id: "1", key: "ERP-1" }], nextPageToken: "next" });

    const page = await JiraService.searchIssues({ ...input, pageToken: "token-1" });

    expect(page?.nextPageToken).toBe("next");
    expect(page?.issues.length).toBe(1);
    const request = recordedRequests[0];
    expect(request?.url).toStartWith(
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/search/jql",
    );
    expect(request?.url).toContain("expand=changelog");
    const fields = new URL(request?.url ?? "").searchParams.getAll("fields").join(",");
    expect(fields).toBe("summary,created,reporter,comment");
    expect(request?.url).toContain("nextPageToken=token-1");
    expect(request?.headers.get("authorization")).toBe("Bearer jira-access");
  });

  test("returns null when Atlassian rejects the access token", async () => {
    stubFetch(HTTP_UNAUTHORIZED, { message: "Unauthorized" });

    expect(await JiraService.searchIssues({ ...input, pageToken: null })).toBeNull();
  });

  test("throws on other failures", async () => {
    stubFetch(HTTP_SERVER_ERROR, { message: "boom" });

    await expect(JiraService.searchIssues({ ...input, pageToken: null })).rejects.toThrow();
  });
});

describe("JiraService.readIssuePages", () => {
  const input = {
    accessToken: "jira-access",
    cloudId: "cloud-1",
    issueKey: "ERP-1",
    summary: "Sum",
    commentsStartAt: 20 as number | null,
    changelogStartAt: 100 as number | null,
  };

  test("reads the comment and changelog pages from their offsets", async () => {
    stubFetchSequence([
      { status: HTTP_OK, body: { startAt: 20, total: 90, comments: [{ id: "c-21" }] } },
      {
        status: HTTP_OK,
        body: { startAt: 100, maxResults: 50, isLast: true, total: 101, values: [{ id: "h-101" }] },
      },
    ]);

    const read = await JiraService.readIssuePages(input);

    expect(read?.pages?.comments).toEqual({ items: [{ id: "c-21" }], nextStartAt: 21 });
    expect(read?.pages?.histories).toEqual({ items: [{ id: "h-101" }], nextStartAt: null });
    const urls = recordedRequests.map((request) => new URL(request.url));
    const comments = urls.find((url) => url.pathname.endsWith("/issue/ERP-1/comment"));
    const changelog = urls.find((url) => url.pathname.endsWith("/issue/ERP-1/changelog"));
    expect(comments?.searchParams.get("startAt")).toBe("20");
    expect(comments?.searchParams.get("maxResults")).toBe("50");
    expect(changelog?.searchParams.get("startAt")).toBe("100");
    expect(changelog?.searchParams.get("maxResults")).toBe("50");
  });

  test("skips a part that has no offset", async () => {
    stubFetch(HTTP_OK, { startAt: 20, total: 20, comments: [] });

    const read = await JiraService.readIssuePages({ ...input, changelogStartAt: null });

    expect(read?.pages?.histories).toEqual({ items: [], nextStartAt: null });
    expect(recordedRequests.length).toBe(1);
  });

  test("returns no pages when the issue is gone", async () => {
    stubFetch(HTTP_NOT_FOUND, { errorMessages: ["Issue does not exist"] });

    expect(await JiraService.readIssuePages(input)).toEqual({ pages: null });
  });

  test("returns null when Atlassian rejects the access token", async () => {
    stubFetch(HTTP_UNAUTHORIZED, { message: "Unauthorized" });

    expect(await JiraService.readIssuePages(input)).toBeNull();
  });

  test("throws on other failures", async () => {
    stubFetch(HTTP_SERVER_ERROR, { message: "boom" });

    await expect(JiraService.readIssuePages(input)).rejects.toThrow();
  });
});
