import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { schema } from "@recap/db";

import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";
import { RedisStorageService } from "#api/shared/redis/redis.service";

const { clientId, clientSecret } = ENV.auth.google;

export const auth = betterAuth({
  secret: ENV.auth.secret,
  baseURL: ENV.auth.baseUrl,
  trustedOrigins: [ENV.webOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secondaryStorage: new RedisStorageService(),
  session: { storeSessionInDatabase: true },
  rateLimit: { enabled: true, storage: "secondary-storage" },
  emailAndPassword: { enabled: true },
  socialProviders: clientId && clientSecret ? { google: { clientId, clientSecret } } : {},
  advanced: {
    crossSubDomainCookies: ENV.auth.cookieDomain
      ? { enabled: true, domain: ENV.auth.cookieDomain }
      : undefined,
  },
});
