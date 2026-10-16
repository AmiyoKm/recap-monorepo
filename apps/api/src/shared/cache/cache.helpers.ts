import type { ICacheClient } from "#api/shared/cache/cache.interfaces";

export function deferKvNamespace(read: () => KVNamespace): ICacheClient {
  return {
    get: (key) => read().get(key),
    put: (key, value, options) => read().put(key, value, options),
    delete: (key) => read().delete(key),
    list: (options) => read().list(options),
  };
}
