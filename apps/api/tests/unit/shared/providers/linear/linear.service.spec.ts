import { afterEach, describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { LinearService } from "#api/shared/providers/linear/linear.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  LINEAR_LAST_PAGE,
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
    expect(url.searchParams.get("client_id")).toBe(ENV.linear.clientId);
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
    const tokenRequest = recordedRequests[0];
    expect(tokenRequest?.url).toBe("https://api.linear.app/oauth/token");
    expect(tokenRequest?.method).toBe("POST");
    expect(Object.fromEntries(new URLSearchParams(tokenRequest?.body))).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      code_verifier: "verifier-1",
      redirect_uri: REDIRECT_URI,
    });
    const credentials = Buffer.from(`${ENV.linear.clientId}:${ENV.linear.clientSecret}`).toString(
      "base64",
    );
    expect(tokenRequest?.headers.get("authorization")).toBe(`Basic ${credentials}`);
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

const ISSUES_BODY = {
  data: {
    issues: {
      nodes: [
        {
          id: "issue-1",
          identifier: "ENG-1",
          title: "Fix login",
          url: "https://linear.app/acme/issue/ENG-1/fix-login",
          createdAt: "2026-10-12T00:00:00.000Z",
          creator: null,
          history: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
          comments: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: "cursor-2" },
    },
  },
};

describe("LinearService.refreshAccessToken", () => {
  test("returns the rotated refresh token", async () => {
    stubFetch(HTTP_OK, {
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 86399,
      token_type: "Bearer",
    });

    const tokens = await LinearService.refreshAccessToken("old-refresh");

    expect(tokens).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresInSeconds: 86399,
      scopes: [],
    });
    const request = recordedRequests[0];
    expect(request?.url).toBe("https://api.linear.app/oauth/token");
    expect(Object.fromEntries(new URLSearchParams(request?.body))).toEqual({
      grant_type: "refresh_token",
      refresh_token: "old-refresh",
    });
  });

  test("returns null when linear rejects the refresh token", async () => {
    stubFetch(HTTP_BAD_REQUEST, { error: "invalid_grant" });

    expect(await LinearService.refreshAccessToken("revoked")).toBeNull();
  });

  test("throws on other failures", async () => {
    stubFetch(HTTP_BAD_REQUEST, { error: "server_error" });

    await expect(LinearService.refreshAccessToken("any")).rejects.toThrow();
  });
});

describe("LinearService.listIssues", () => {
  test("reads one page of issues with history and comments in one request", async () => {
    stubFetch(HTTP_OK, ISSUES_BODY);

    const page = await LinearService.listIssues({
      accessToken: "linear-access",
      since: "2026-10-10T00:00:00.000Z",
      after: "cursor-1",
    });

    expect(page?.issues.map((issue) => issue.id)).toEqual(["issue-1"]);
    expect(page?.nextPageCursor).toBe("cursor-2");
    expect(recordedRequests.length).toBe(1);
    expect(recordedRequests[0]?.headers.get("authorization")).toBe("Bearer linear-access");
    const sent: unknown = JSON.parse(recordedRequests[0]?.body ?? "{}");
    expect(sent).toMatchObject({
      variables: {
        after: "cursor-1",
        since: "2026-10-10T00:00:00.000Z",
        filter: { updatedAt: { gte: "2026-10-10T00:00:00.000Z" } },
      },
    });
  });

  test("returns null when linear rejects the access token", async () => {
    stubFetch(HTTP_OK, {
      errors: [
        {
          message: "Authentication required",
          extensions: { type: "authentication error", code: "AUTHENTICATION_ERROR" },
        },
      ],
    });

    const page = await LinearService.listIssues({ accessToken: "bad", since: "x", after: null });

    expect(page).toBeNull();
  });

  test("throws on other failures", async () => {
    stubFetch(HTTP_SERVER_ERROR, { errors: [{ message: "boom" }] });

    await expect(
      LinearService.listIssues({ accessToken: "a", since: "x", after: null }),
    ).rejects.toThrow();
  });
});

describe("LinearService.readIssue", () => {
  test("reads only the nested pages that still have events, after their cursors", async () => {
    const [issue] = ISSUES_BODY.data.issues.nodes;
    stubFetch(HTTP_OK, {
      data: {
        issue: {
          ...issue,
          comments: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
        },
      },
    });

    const result = await LinearService.readIssue({
      accessToken: "linear-access",
      since: "2026-10-10T00:00:00.000Z",
      issueId: "issue-1",
      historyAfter: null,
      commentsAfter: "c-2",
    });

    expect(result?.issue?.id).toBe("issue-1");
    const sent: unknown = JSON.parse(recordedRequests[0]?.body ?? "{}");
    expect(sent).toMatchObject({
      variables: {
        id: "issue-1",
        commentsAfter: "c-2",
        historyAfter: null,
        withHistory: false,
        withComments: true,
      },
    });
  });

  test("reports a deleted issue as gone instead of throwing", async () => {
    stubFetch(HTTP_OK, {
      errors: [
        {
          message: "Entity not found: Issue",
          extensions: { type: "invalid input", code: "INVALID_INPUT", userError: true },
        },
      ],
    });

    const result = await LinearService.readIssue({
      accessToken: "linear-access",
      since: "x",
      issueId: "gone",
      historyAfter: "h",
      commentsAfter: null,
    });

    expect(result).toEqual({ issue: null });
  });

  test("reports a null issue as gone", async () => {
    stubFetch(HTTP_OK, { data: { issue: null } });

    const result = await LinearService.readIssue({
      accessToken: "linear-access",
      since: "x",
      issueId: "gone",
      historyAfter: "h",
      commentsAfter: null,
    });

    expect(result).toEqual({ issue: null });
  });

  test("returns null when linear rejects the access token", async () => {
    stubFetch(HTTP_OK, {
      errors: [
        {
          message: "Authentication required",
          extensions: { type: "authentication error", code: "AUTHENTICATION_ERROR" },
        },
      ],
    });

    const result = await LinearService.readIssue({
      accessToken: "bad",
      since: "x",
      issueId: "issue-1",
      historyAfter: "h",
      commentsAfter: null,
    });

    expect(result).toBeNull();
  });
});
