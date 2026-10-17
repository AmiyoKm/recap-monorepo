import { describe, expect, test } from "bun:test";

import type { AccessibleResource } from "jira.js";

import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import {
  adfToText,
  buildJiraJql,
  jiraPendingCursor,
  nextJiraStartAt,
  normalizeJiraSite,
  toJiraAccount,
  toJiraSite,
  toJiraTokens,
} from "#api/shared/providers/jira/jira.helpers";

describe("normalizeJiraSite", () => {
  test.each([
    { site: "acme.atlassian.net", host: "acme.atlassian.net" },
    { site: "https://Acme.atlassian.net/jira/your-work", host: "acme.atlassian.net" },
    { site: "http://team-1.atlassian.net", host: "team-1.atlassian.net" },
  ])("keeps the atlassian host of $site", ({ site, host }) => {
    expect(normalizeJiraSite(site)).toBe(host);
  });

  test.each(["", "not a site", "evil.example.com", "atlassian.net", "-acme.atlassian.net"])(
    "rejects %p",
    (site) => {
      expect(normalizeJiraSite(site)).toBeNull();
    },
  );
});

describe("toJiraAccount", () => {
  test("maps a complete Jira user", () => {
    expect(toJiraAccount("acc-1", "dev@employer.example")).toEqual({
      accountId: "acc-1",
      accountEmail: "dev@employer.example",
    });
  });

  test.each([
    [undefined, "dev@employer.example"],
    ["acc-1", null],
  ])("throws when Jira leaves out a field", (accountId, accountEmail) => {
    expect(() => toJiraAccount(accountId, accountEmail)).toThrow(EJiraMessages.ACCOUNT_INCOMPLETE);
  });
});

describe("toJiraSite", () => {
  const resource = {
    id: "cloud-1",
    name: "Acme",
    url: "https://acme.atlassian.net",
    scopes: ["read:jira-work", "read:jira-user"],
    avatarUrl: "https://img.test/acme.png",
  };

  test("picks the first site with work access", () => {
    const other = { ...resource, id: "cloud-0", scopes: ["read:confluence-content.all"] };
    expect(toJiraSite([other, resource])).toEqual({
      cloudId: "cloud-1",
      host: "acme.atlassian.net",
    });
  });

  test.each<{ case: string; resources: AccessibleResource[] }>([
    { case: "no sites", resources: [] },
    {
      case: "a site outside atlassian.net",
      resources: [{ ...resource, url: "https://evil.example" }],
    },
  ])("throws for $case", ({ resources }) => {
    expect(() => toJiraSite(resources)).toThrow(EJiraMessages.NO_ACCESSIBLE_SITE);
  });
});

describe("toJiraTokens", () => {
  test("splits the granted scopes", () => {
    expect(
      toJiraTokens({
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 3600,
        scope: "read:jira-work offline_access",
        tokenType: "bearer",
      }),
    ).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresInSeconds: 3600,
      scopes: ["read:jira-work", "offline_access"],
    });
  });
});

describe("buildJiraJql", () => {
  test("filters on the user roles and a bound one day before the time", () => {
    const jql = buildJiraJql("2026-10-17T08:30:00.000Z");

    expect(jql).toContain("assignee = currentUser()");
    expect(jql).toContain("reporter = currentUser()");
    expect(jql).toContain('updated >= "2026-10-16 08:30"');
    expect(jql).toEndWith("ORDER BY updated ASC");
  });
});

describe("adfToText", () => {
  test("flattens paragraphs, marks, mentions and breaks to one line", () => {
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { text: "@Sam" } },
            { type: "text", text: " please", marks: [{ type: "strong" }] },
            { type: "hardBreak" },
            { type: "text", text: "review" },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "thanks" }] },
      ],
    };

    expect(adfToText(body)).toBe("@Sam please review thanks");
  });

  test.each([null, undefined, "text", {}])("returns an empty string for %p", (body) => {
    expect(adfToText(body)).toBe("");
  });
});

describe("nextJiraStartAt", () => {
  test.each([
    { startAt: 0, returned: 20, total: 45, expected: 20 },
    { startAt: 20, returned: 20, total: 45, expected: 40 },
    { startAt: 40, returned: 5, total: 45, expected: null },
    { startAt: 0, returned: 20, total: 20, expected: null },
    { startAt: 0, returned: 20, total: undefined, expected: null },
    { startAt: 20, returned: 0, total: 45, expected: null },
  ])("starts at $expected after $returned of $total from $startAt", ({ expected, ...page }) => {
    expect(nextJiraStartAt(page)).toBe(expected);
  });
});

describe("jiraPendingCursor", () => {
  test("queues the unread comments and changelog pages of an issue", () => {
    const issue = {
      id: "1",
      key: "ERP-1",
      fields: { summary: "Sum", comment: { comments: [{ id: "c" }], total: 30 } },
      changelog: { histories: [{ id: "h" }, { id: "i" }], total: 150 },
    };

    expect(jiraPendingCursor(issue)).toEqual({
      issueKey: "ERP-1",
      summary: "Sum",
      commentsStartAt: 1,
      changelogStartAt: 2,
    });
  });

  test("returns null when the search result holds every comment and history", () => {
    const issue = {
      id: "1",
      key: "ERP-1",
      fields: { comment: { comments: [{ id: "c" }], total: 1 } },
      changelog: { histories: [{ id: "h" }], total: 1 },
    };

    expect(jiraPendingCursor(issue)).toBeNull();
    expect(jiraPendingCursor({ id: "2" })).toBeNull();
  });
});
