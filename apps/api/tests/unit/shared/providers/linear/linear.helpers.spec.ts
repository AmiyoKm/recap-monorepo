import { describe, expect, test } from "bun:test";

import { AuthenticationLinearError, ForbiddenLinearError, NetworkLinearError } from "@linear/sdk";

import { isRejectedLinearCredential } from "#api/shared/providers/linear/linear.helpers";

describe("isRejectedLinearCredential", () => {
  test("accepts authentication and forbidden errors", () => {
    expect(isRejectedLinearCredential(new AuthenticationLinearError())).toBe(true);
    expect(isRejectedLinearCredential(new ForbiddenLinearError())).toBe(true);
  });

  test("rejects other failures", () => {
    expect(isRejectedLinearCredential(new NetworkLinearError())).toBe(false);
    expect(isRejectedLinearCredential(new Error("boom"))).toBe(false);
  });
});
