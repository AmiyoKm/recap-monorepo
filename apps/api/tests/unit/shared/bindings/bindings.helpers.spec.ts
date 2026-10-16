import { describe, expect, test } from "bun:test";

import { env } from "cloudflare:workers";

import { EBindingsMessages } from "#api/shared/bindings/bindings.enums";
import { readBindings } from "#api/shared/bindings/bindings.helpers";

describe("readBindings", () => {
  test("does not throw before a binding is read", () => {
    expect(() => readBindings({ ...env, DB: undefined, CACHE: undefined })).not.toThrow();
  });

  test("returns the DB and CACHE bindings when both are set", () => {
    const bindings = readBindings(env);

    expect(env.DB).toBe(bindings.DB);
    expect(env.CACHE).toBe(bindings.CACHE);
  });

  test("throws on DB access when DB is missing", () => {
    const bindings = readBindings({ ...env, DB: undefined });

    expect(() => bindings.DB).toThrow(EBindingsMessages.MISSING_BINDING);
  });

  test("throws on CACHE access when CACHE is missing", () => {
    const bindings = readBindings({ ...env, CACHE: undefined });

    expect(() => bindings.CACHE).toThrow(EBindingsMessages.MISSING_BINDING);
  });
});
