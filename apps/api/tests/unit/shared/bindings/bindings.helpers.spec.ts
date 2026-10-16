import { describe, expect, test } from "bun:test";

import { env } from "cloudflare:workers";

import { EBindingsMessages } from "#api/shared/bindings/bindings.enums";
import { readBindings } from "#api/shared/bindings/bindings.helpers";

describe("readBindings", () => {
  test("returns the DB and CACHE bindings when both are set", () => {
    const bindings = readBindings(env);

    expect(env.DB).toBe(bindings.DB);
    expect(env.CACHE).toBe(bindings.CACHE);
  });

  test("throws when DB is missing", () => {
    expect(() => readBindings({ ...env, DB: undefined })).toThrow(
      EBindingsMessages.MISSING_BINDING,
    );
  });

  test("throws when CACHE is missing", () => {
    expect(() => readBindings({ ...env, CACHE: undefined })).toThrow(
      EBindingsMessages.MISSING_BINDING,
    );
  });
});
