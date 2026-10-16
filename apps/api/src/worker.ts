import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { createApp } from "#api/app";
import { IdentityService } from "#api/modules/identity/identity.service";

const app = new Elysia({ adapter: CloudflareAdapter }).use(createApp()).compile();

export default {
  fetch: (request) => app.fetch(request),
  scheduled: (_controller, _env, ctx) => {
    ctx.waitUntil(IdentityService.deleteExpiredPendingGrants());
  },
} satisfies ExportedHandler<Cloudflare.Env>;
