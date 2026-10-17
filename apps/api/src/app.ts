import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { activityModule } from "#api/modules/activity/activity.module";
import { authModule } from "#api/modules/auth/auth.module";
import { healthModule } from "#api/modules/health/health.module";
import { identityModule } from "#api/modules/identity/identity.module";
import { ENV } from "#api/shared/env/env.constants";

export function createApp() {
  return new Elysia()
    .use(cors({ origin: ENV.webOrigin, credentials: true }))
    .use(openapi())
    .use(authModule)
    .use(healthModule)
    .use(identityModule)
    .use(activityModule);
}
