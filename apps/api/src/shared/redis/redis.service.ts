import type { RedisClient } from "bun";

import type { SecondaryStorage } from "better-auth";

import { INCREMENT_WITH_TTL_SCRIPT, SINGLE_KEY_COUNT } from "#api/shared/redis/redis.constants";
import { ERedisCommand, ERedisMessages, ERedisSetOption } from "#api/shared/redis/redis.enums";

export class RedisStorageService implements SecondaryStorage {
  constructor(
    private readonly redis: RedisClient,
    private readonly keyPrefix: string,
  ) {}

  get(key: string): Promise<string | null> {
    return this.redis.get(this.prefixed(key));
  }

  getAndDelete(key: string): Promise<unknown> {
    return this.redis.send(ERedisCommand.GET_AND_DELETE, [this.prefixed(key)]);
  }

  async increment(key: string, ttl: number): Promise<number> {
    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new TypeError(ERedisMessages.INVALID_TTL);
    }
    const value = await this.redis.send(ERedisCommand.EVAL, [
      INCREMENT_WITH_TTL_SCRIPT,
      SINGLE_KEY_COUNT,
      this.prefixed(key),
      String(ttl),
    ]);
    return Number(value);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!ttl) {
      await this.redis.set(this.prefixed(key), value);
      return;
    }
    await this.redis.send(ERedisCommand.SET, [
      this.prefixed(key),
      value,
      ERedisSetOption.EXPIRE_IN_SECONDS,
      String(ttl),
    ]);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.prefixed(key));
  }

  private prefixed(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
