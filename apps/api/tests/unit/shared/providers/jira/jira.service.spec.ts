import { afterEach, describe, expect, test } from "bun:test";

import { JiraService } from "#api/shared/providers/jira/jira.service";
import {
  HTTP_FORBIDDEN,
  HTTP_OK,
  HTTP_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
  PROVIDER_EMAIL,
} from "#api-tests/unit/shared/providers/providers.constants";
import {
  recordedRequests,
  restoreFetch,
  stubFetch,
} from "#api-tests/unit/shared/providers/providers.fixtures";

afterEach(() => {
  restoreFetch();
});

describe("JiraService.verifyApiKey", () => {
  test("verifies the key with basic auth against the site", async () => {
    stubFetch(HTTP_OK, { accountId: "abc-123", emailAddress: PROVIDER_EMAIL });
    const account = await JiraService.verifyApiKey({
      site: "https://Acme.atlassian.net/",
      email: PROVIDER_EMAIL,
      apiToken: "jira-key",
    });
    expect(account).toEqual({ accountId: "abc-123", accountEmail: PROVIDER_EMAIL });
    expect(recordedRequests[0]?.url).toBe("https://acme.atlassian.net/rest/api/3/myself");
    expect(recordedRequests[0]?.headers.get("authorization")).toBe(
      `Basic ${Buffer.from(`${PROVIDER_EMAIL}:jira-key`).toString("base64")}`,
    );
  });

  test.each([HTTP_UNAUTHORIZED, HTTP_FORBIDDEN])(
    "returns no account when jira answers %d",
    async (status) => {
      stubFetch(status, { errorMessages: ["Rejected"] });
      const account = await JiraService.verifyApiKey({
        site: "acme.atlassian.net",
        email: PROVIDER_EMAIL,
        apiToken: "bad-key",
      });
      expect(account).toBeNull();
    },
  );

  test("throws when jira fails for another reason", async () => {
    stubFetch(HTTP_SERVER_ERROR, { errorMessages: ["Down"] });
    const request = JiraService.verifyApiKey({
      site: "acme.atlassian.net",
      email: PROVIDER_EMAIL,
      apiToken: "jira-key",
    });
    await expect(request).rejects.toThrow();
  });

  test.each(["not a site", "evil.example.com", "acme.atlassian.net.evil.example", "localhost"])(
    "sends no request for the site %p",
    async (site) => {
      stubFetch(HTTP_OK, {});
      const account = await JiraService.verifyApiKey({
        site,
        email: PROVIDER_EMAIL,
        apiToken: "jira-key",
      });
      expect(account).toBeNull();
      expect(recordedRequests).toEqual([]);
    },
  );
});
