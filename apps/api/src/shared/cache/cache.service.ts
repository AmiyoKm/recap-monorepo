import { cache } from "#api/shared/cache/cache.client";
import { KV_MIN_TTL_SECONDS } from "#api/shared/cache/cache.constants";
import type { ICachePutInput } from "#api/shared/cache/cache.interfaces";

export abstract class CacheService {
  static async put({ key, value, ttlSeconds }: ICachePutInput): Promise<void> {
    await cache.put(key, value, { expirationTtl: Math.max(KV_MIN_TTL_SECONDS, ttlSeconds) });
  }

  static async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => cache.delete(key)));
  }
}
