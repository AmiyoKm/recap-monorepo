import { describe, expect, test } from "bun:test";

import { describeError } from "#api/shared/logger/logger.helpers";

describe("describeError", () => {
  test("keeps only the error name and message", () => {
    const error = Object.assign(new TypeError("request failed"), {
      config: { headers: { authorization: "Basic secret" } },
    });
    expect(describeError(error)).toBe("TypeError: request failed");
  });

  test("names the type of a thrown non-error", () => {
    expect(describeError({ token: "secret" })).toBe("object");
  });
});
