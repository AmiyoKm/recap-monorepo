import { beforeEach, describe, expect, test } from "bun:test";

import { ENV } from "#api/shared/env/env.constants";
import { redis } from "#api/shared/redis/redis.client";
import { ERedisMessages } from "#api/shared/redis/redis.enums";
import { RedisStorageService } from "#api/shared/redis/redis.service";

const TTL_SECONDS = 60;
const FRACTIONAL_TTL_SECONDS = 1.5;
const storage = new RedisStorageService();

function key(name: string): string {
  return `redis-spec:${name}`;
}

beforeEach(async () => {
  await redis.del(
    ...["plain", "ttl", "counter", "taken"].map((name) => `${ENV.redisKeyPrefix}${key(name)}`),
  );
});

describe("RedisStorageService", () => {
  test("stores values under the env key prefix", async () => {
    await storage.set(key("plain"), "value");
    expect(await storage.get(key("plain"))).toBe("value");
    expect(await redis.get(`${ENV.redisKeyPrefix}${key("plain")}`)).toBe("value");
  });

  test("sets an expiry when a ttl is given", async () => {
    await storage.set(key("ttl"), "value", TTL_SECONDS);
    const ttl = await redis.ttl(`${ENV.redisKeyPrefix}${key("ttl")}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(TTL_SECONDS);
  });

  test("returns and removes a value once", async () => {
    await storage.set(key("taken"), "value");
    expect(await storage.getAndDelete(key("taken"))).toBe("value");
    expect(await storage.get(key("taken"))).toBeNull();
  });

  test("increments a counter and expires it", async () => {
    expect(await storage.increment(key("counter"), TTL_SECONDS)).toBe(1);
    expect(await storage.increment(key("counter"), TTL_SECONDS)).toBe(2);
    expect(await redis.ttl(`${ENV.redisKeyPrefix}${key("counter")}`)).toBeGreaterThan(0);
  });

  test.each([0, -1, FRACTIONAL_TTL_SECONDS])("refuses the ttl %p", async (ttl) => {
    await expect(storage.increment(key("counter"), ttl)).rejects.toThrow(
      ERedisMessages.INVALID_TTL,
    );
  });

  test("deletes a value", async () => {
    await storage.set(key("plain"), "value");
    await storage.delete(key("plain"));
    expect(await storage.get(key("plain"))).toBeNull();
  });
});
