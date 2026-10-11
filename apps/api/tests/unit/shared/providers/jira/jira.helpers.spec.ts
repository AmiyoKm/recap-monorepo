import { describe, expect, test } from "bun:test";

import { AuthError, ForbiddenError, ServerError } from "jira.js";

import {
  isRejectedJiraCredential,
  normalizeJiraSite,
} from "#api/shared/providers/jira/jira.helpers";
import { HTTP_SERVER_ERROR } from "#api-tests/unit/shared/providers/providers.constants";

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

describe("isRejectedJiraCredential", () => {
  test("accepts auth and forbidden errors", () => {
    expect(isRejectedJiraCredential(new AuthError("rejected", "Unauthorized", null))).toBe(true);
    expect(isRejectedJiraCredential(new ForbiddenError("forbidden", "Forbidden", null))).toBe(true);
  });

  test("rejects other failures", () => {
    expect(
      isRejectedJiraCredential(new ServerError("down", HTTP_SERVER_ERROR, "Server Error", null)),
    ).toBe(false);
    expect(isRejectedJiraCredential(new Error("boom"))).toBe(false);
  });
});
