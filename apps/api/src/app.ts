import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import type { IAppDeps } from "#api/app.interfaces";
import { authModule } from "#api/modules/auth/auth.module";
import { createAuth } from "#api/modules/auth/auth.service";
import { healthModule } from "#api/modules/health/health.module";
import { identityModule } from "#api/modules/identity/identity.module";
import { RedisStorageService } from "#api/shared/redis/redis.service";

export function createApp({ db, redis, env, providerClient }: IAppDeps) {
  const auth = createAuth({
    db,
    storage: new RedisStorageService(redis, env.redisKeyPrefix),
    config: env.auth,
    trustedOrigins: [env.webOrigin],
  });

  return new Elysia()
    .use(cors({ origin: env.webOrigin, credentials: true }))
    .use(openapi())
    .use(authModule(auth))
    .use(healthModule({ db, redis }))
    .use(
      identityModule({
        db,
        redis,
        redisKeyPrefix: env.redisKeyPrefix,
        webOrigin: env.webOrigin,
        callbackBaseUrl: env.auth.baseUrl,
        encryptionKey: env.connectionEncryptionKey,
        providerClient,
        sessionProvider: auth,
      }),
    );
}
