import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { schema } from "@recap/db";

import { CLIENT_IP_HEADERS } from "#api/shared/auth/auth.constants";
import { EAuthDatabaseProvider } from "#api/shared/auth/auth.enums";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";

const { clientId, clientSecret } = ENV.auth.google;

export const auth = betterAuth({
  secret: ENV.auth.secret,
  baseURL: ENV.auth.baseUrl,
  trustedOrigins: [ENV.webOrigin],
  database: drizzleAdapter(db, { provider: EAuthDatabaseProvider.SQLITE, schema }),
  session: { storeSessionInDatabase: true },
  rateLimit: { enabled: true, storage: "database" },
  emailAndPassword: { enabled: true },
  socialProviders: clientId && clientSecret ? { google: { clientId, clientSecret } } : {},
  advanced: {
    ipAddress: { ipAddressHeaders: CLIENT_IP_HEADERS },
    crossSubDomainCookies: ENV.auth.cookieDomain
      ? { enabled: true, domain: ENV.auth.cookieDomain }
      : undefined,
  },
});
