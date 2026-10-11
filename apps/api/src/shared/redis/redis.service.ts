import type { SecondaryStorage } from "better-auth";

import { ENV } from "#api/shared/env/env.constants";
import { redis } from "#api/shared/redis/redis.client";
import { INCREMENT_WITH_TTL_SCRIPT, SINGLE_KEY_COUNT } from "#api/shared/redis/redis.constants";
import { ERedisCommand, ERedisMessages, ERedisSetOption } from "#api/shared/redis/redis.enums";

export class RedisStorageService implements SecondaryStorage {
  constructor() {
    this.get = this.get.bind(this);
    this.getAndDelete = this.getAndDelete.bind(this);
    this.increment = this.increment.bind(this);
    this.set = this.set.bind(this);
    this.delete = this.delete.bind(this);
  }

  get(key: string): Promise<string | null> {
    return redis.get(this.prefixed(key));
  }

  getAndDelete(key: string): Promise<unknown> {
    return redis.send(ERedisCommand.GET_AND_DELETE, [this.prefixed(key)]);
  }

  async increment(key: string, ttl: number): Promise<number> {
    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new TypeError(ERedisMessages.INVALID_TTL);
    }
    const value = await redis.send(ERedisCommand.EVAL, [
      INCREMENT_WITH_TTL_SCRIPT,
      SINGLE_KEY_COUNT,
      this.prefixed(key),
      String(ttl),
    ]);
    return Number(value);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!ttl) {
      await redis.set(this.prefixed(key), value);
      return;
    }
    await redis.send(ERedisCommand.SET, [
      this.prefixed(key),
      value,
      ERedisSetOption.EXPIRE_IN_SECONDS,
      String(ttl),
    ]);
  }

  async delete(key: string): Promise<void> {
    await redis.del(this.prefixed(key));
  }

  private prefixed(key: string): string {
    return `${ENV.redisKeyPrefix}${key}`;
  }
}
