import { afterEach, describe, expect, test } from "bun:test";

import { cache } from "#api/shared/cache/cache.client";
import { CacheService } from "#api/shared/cache/cache.service";
import { dayjs } from "#api/shared/date/date.helpers";
import { ETestMessages } from "#api-tests/fixtures/fixtures.enums";
import { wipeCache } from "#api-tests/fixtures/fixtures.helpers";
import {
  LONG_TTL_SECONDS,
  SHORT_TTL_SECONDS,
  TTL_CLOCK_SLACK_SECONDS,
} from "#api-tests/unit/shared/cache/cache.constants";

async function ttlSeconds(key: string): Promise<number> {
  const { keys } = await cache.list({ prefix: key });
  const expiration = keys[0]?.expiration;
  if (expiration === undefined) {
    throw new Error(ETestMessages.CACHED_TOKEN_IS_MISSING);
  }
  return expiration - dayjs().unix();
}

afterEach(async () => {
  await wipeCache();
});

describe("CacheService.put", () => {
  test("stores the value", async () => {
    await CacheService.put({
      key: "cache-spec:value",
      value: "stored",
      ttlSeconds: LONG_TTL_SECONDS,
    });

    expect(await cache.get("cache-spec:value")).toBe("stored");
  });

  test("skips a TTL below the KV minimum", async () => {
    await CacheService.put({
      key: "cache-spec:short",
      value: "stored",
      ttlSeconds: SHORT_TTL_SECONDS,
    });

    expect(await cache.get("cache-spec:short")).toBeNull();
  });

  test("keeps a TTL above the KV minimum", async () => {
    await CacheService.put({
      key: "cache-spec:long",
      value: "stored",
      ttlSeconds: LONG_TTL_SECONDS,
    });

    const ttl = await ttlSeconds("cache-spec:long");
    expect(ttl).toBeGreaterThan(LONG_TTL_SECONDS - TTL_CLOCK_SLACK_SECONDS);
    expect(ttl).toBeLessThanOrEqual(LONG_TTL_SECONDS);
  });
});

describe("CacheService.delete", () => {
  test("deletes every given key and keeps the others", async () => {
    await Promise.all([
      cache.put("cache-spec:a", "a"),
      cache.put("cache-spec:b", "b"),
      cache.put("cache-spec:keep", "keep"),
    ]);

    await CacheService.delete(["cache-spec:a", "cache-spec:b"]);

    expect(await cache.get("cache-spec:a")).toBeNull();
    expect(await cache.get("cache-spec:b")).toBeNull();
    expect(await cache.get("cache-spec:keep")).toBe("keep");
  });

  test("does nothing for an empty list", async () => {
    await expect(CacheService.delete([])).resolves.toBeUndefined();
  });
});
