import { afterEach, describe, expect, test } from "bun:test";

import { env } from "cloudflare:workers";

import { EBindingsMessages } from "#api/shared/bindings/bindings.enums";
import { readBindings } from "#api/shared/bindings/bindings.helpers";
import { deferKvNamespace } from "#api/shared/cache/cache.helpers";
import { wipeCache } from "#api-tests/fixtures/fixtures.helpers";
import { DEFERRED_KV_CALL_COUNT } from "#api-tests/unit/shared/cache/cache.constants";

afterEach(async () => {
  await wipeCache();
});

describe("deferKvNamespace", () => {
  test("creates a cache without reading a missing CACHE binding", () => {
    const missing = readBindings({ ...env, CACHE: undefined });

    expect(() => deferKvNamespace(() => missing.CACHE)).not.toThrow();
  });

  test("throws on the first call when CACHE is missing", () => {
    const missing = readBindings({ ...env, CACHE: undefined });
    const cache = deferKvNamespace(() => missing.CACHE);

    expect(() => cache.get("cache-helpers-spec:key")).toThrow(EBindingsMessages.MISSING_BINDING);
  });

  test("reads the binding on every call", async () => {
    let reads = 0;
    const cache = deferKvNamespace(() => {
      reads += 1;
      return readBindings(env).CACHE;
    });
    expect(reads).toBe(0);

    await cache.put("cache-helpers-spec:key", "stored");
    expect(await cache.get("cache-helpers-spec:key")).toBe("stored");
    await cache.list({ prefix: "cache-helpers-spec:" });
    await cache.delete("cache-helpers-spec:key");

    expect(reads).toBe(DEFERRED_KV_CALL_COUNT);
  });
});
