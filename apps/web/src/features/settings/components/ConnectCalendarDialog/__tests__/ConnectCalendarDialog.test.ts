import { describe, expect, test } from "bun:test";

import { readAuthorizeUrl } from "@/api/identity/identity.helpers";

describe("readAuthorizeUrl", () => {
  test("returns the authorize url from a connect response", () => {
    expect(readAuthorizeUrl({ authorizeUrl: "https://consent.test/auth?state=x" })).toBe(
      "https://consent.test/auth?state=x",
    );
  });

  test("throws for responses without an authorize url", () => {
    expect(() => readAuthorizeUrl({ id: "connection-1" })).toThrow("Request failed");
    expect(() => readAuthorizeUrl(null)).toThrow("Request failed");
  });
});
