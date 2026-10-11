import { describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { ROUTES } from "#api/shared/routes/routes.constants";

describe("ROUTES", () => {
  test("builds the google callback url from the auth base url", () => {
    expect(ROUTES.API.GOOGLE_CALLBACK_URL()).toBe(
      `${ENV.auth.baseUrl}${ROUTES.API.GOOGLE_CALLBACK}`,
    );
  });

  test("encodes the connect result query for the web", () => {
    expect(ROUTES.WEB.CONNECT_RESULT({ connected: "jira", email: "a+b@x.example" })).toBe(
      `${ENV.webOrigin}/connected?connected=jira&email=a%2Bb%40x.example`,
    );
  });

  test("builds an https jira site url", () => {
    expect(ROUTES.JIRA.SITE("acme.atlassian.net")).toBe("https://acme.atlassian.net");
  });
});
