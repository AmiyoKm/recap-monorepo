import { describe, expect, test } from "bun:test";

import { EEnvMessages } from "#api/shared/env/env.enums";
import { optionalEnv, requireEnv } from "#api/shared/env/env.helpers";

describe("requireEnv", () => {
  test("returns a set value", () => {
    expect(requireEnv("WEB_ORIGIN", "http://localhost:5173")).toBe("http://localhost:5173");
  });

  test.each([undefined, ""])("throws with the variable name for %p", (value) => {
    expect(() => requireEnv("WEB_ORIGIN", value)).toThrow(EEnvMessages.MISSING_VARIABLE);
  });
});

describe("optionalEnv", () => {
  test("keeps a set value", () => {
    expect(optionalEnv("3000")).toBe("3000");
  });

  test.each([undefined, ""])("returns undefined for %p", (value) => {
    expect(optionalEnv(value)).toBeUndefined();
  });
});
