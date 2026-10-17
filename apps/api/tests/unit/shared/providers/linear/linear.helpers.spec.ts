import { describe, expect, test } from "bun:test";

import { OAuth2Tokens } from "arctic";

import {
  buildIssuesVariables,
  nextPageCursor,
  parseIssuesData,
  toLinearTokens,
} from "#api/shared/providers/linear/linear.helpers";
import { LINEAR_LAST_PAGE } from "#api-tests/fixtures/fixtures.constants";

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

describe("buildIssuesVariables", () => {
  test("filters on assignee, creator and commenter since the cursor", () => {
    const since = "2026-10-10T00:00:00.000Z";

    expect(buildIssuesVariables({ accessToken: "a", since, after: "c1" })).toEqual({
      first: 4,
      after: "c1",
      since,
      historyFirst: 15,
      commentsFirst: 15,
      historyAfter: null,
      commentsAfter: null,
      withHistory: true,
      withComments: true,
      filter: {
        updatedAt: { gte: since },
        or: [
          { assignee: { isMe: { eq: true } } },
          { creator: { isMe: { eq: true } } },
          { comments: { some: { user: { isMe: { eq: true } } } } },
        ],
      },
    });
  });
});

describe("parseIssuesData", () => {
  const validData = {
    issues: {
      nodes: [
        {
          id: "i1",
          identifier: "ENG-1",
          title: "Title",
          url: "https://linear.app/x/issue/ENG-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          creator: { name: "Ann", email: null },
          history: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
          comments: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  };

  test("returns typed issues for a valid response", () => {
    const parsed = parseIssuesData(validData);
    expect(parsed.issues.nodes[0]?.creator).toEqual({ name: "Ann", email: null });
    expect(parsed.issues.pageInfo.hasNextPage).toBe(false);
  });

  test.each([null, {}, { issues: { nodes: [{ id: 1 }], pageInfo: { hasNextPage: false } } }])(
    "throws for a malformed response %#",
    (data) => {
      expect(() => parseIssuesData(data)).toThrow();
    },
  );
});

describe("nextPageCursor", () => {
  test("returns null on the last page", () => {
    expect(nextPageCursor({ hasNextPage: false, endCursor: null }, "cursor-1")).toBeNull();
  });

  test("returns the end cursor when another page exists", () => {
    expect(nextPageCursor({ hasNextPage: true, endCursor: "cursor-2" }, "cursor-1")).toBe(
      "cursor-2",
    );
  });

  test.each([
    { endCursor: null, after: "cursor-1" },
    { endCursor: "cursor-1", after: "cursor-1" },
  ])("throws when another page has no new cursor ($endCursor)", ({ endCursor, after }) => {
    expect(() => nextPageCursor({ hasNextPage: true, endCursor }, after)).toThrow(
      "Linear reported another page without a new cursor",
    );
  });
});
