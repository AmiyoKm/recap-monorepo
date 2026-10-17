import { describe, expect, test } from "bun:test";

import { describeError } from "#api/shared/logger/logger.helpers";

describe("describeError", () => {
  test("keeps only the error name and message", () => {
    const error = Object.assign(new TypeError("request failed"), {
      config: { headers: { authorization: "Basic secret" } },
    });
    expect(describeError(error)).toBe("TypeError: request failed");
  });

  test("adds a string cause", () => {
    const error = new Error("item dropped", { cause: "message-1" });
    expect(describeError(error)).toBe("Error: item dropped (message-1)");
  });

  test("leaves out a cause that is not a string", () => {
    const error = new Error("request failed", { cause: { token: "secret" } });
    expect(describeError(error)).toBe("Error: request failed");
  });

  test("names the type of a thrown non-error", () => {
    expect(describeError({ token: "secret" })).toBe("object");
  });
});
