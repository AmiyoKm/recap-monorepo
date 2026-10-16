import { bindings } from "#api/shared/bindings/bindings.client";
import { deferKvNamespace } from "#api/shared/cache/cache.helpers";

export const cache = deferKvNamespace(() => bindings.CACHE);
