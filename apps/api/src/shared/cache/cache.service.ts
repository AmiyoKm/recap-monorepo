import { cache } from "#api/shared/cache/cache.client";
import { KV_MIN_TTL_SECONDS } from "#api/shared/cache/cache.constants";
import type { ICachePutInput } from "#api/shared/cache/cache.interfaces";

export abstract class CacheService {
  static get(key: string): Promise<string | null> {
    return cache.get(key);
  }

  static async put({ key, value, ttlSeconds }: ICachePutInput): Promise<void> {
    if (ttlSeconds < KV_MIN_TTL_SECONDS) {
      return;
    }
    await cache.put(key, value, { expirationTtl: ttlSeconds });
  }

  static async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => cache.delete(key)));
  }
}
