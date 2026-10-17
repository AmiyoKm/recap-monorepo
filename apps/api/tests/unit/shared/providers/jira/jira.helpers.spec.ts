import { describe, expect, test } from "bun:test";

import type { AccessibleResource } from "jira.js";

import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import {
  adfToText,
  buildJiraJql,
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
