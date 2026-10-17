import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { createApp } from "#api/app";
import { IdentityService } from "#api/modules/identity/identity.service";
import { PullService } from "#api/modules/pull/pull.service";

const app = new Elysia({ adapter: CloudflareAdapter }).use(createApp()).compile();

export default {
  fetch: (request) => app.fetch(request),
  scheduled: (_controller, _env, ctx) => {
    ctx.waitUntil(IdentityService.deleteExpiredPendingGrants());
    ctx.waitUntil(PullService.enqueueActiveConnections());
  },
  queue: async (batch) => {
    await Promise.all(batch.messages.map((message) => PullService.handleMessage(message)));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
