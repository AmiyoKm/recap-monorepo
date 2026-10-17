import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { schema } from "@recap/db";

import { CLIENT_IP_HEADERS } from "#api/shared/auth/auth.constants";
import { EAuthDatabaseProvider } from "#api/shared/auth/auth.enums";
import { crossSubDomainCookies } from "#api/shared/auth/auth.helpers";
import { AuthService } from "#api/shared/auth/auth.service";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";

export const auth = betterAuth({
  secret: ENV.auth.secret,
  baseURL: ENV.auth.baseUrl,
  trustedOrigins: [ENV.webOrigin],
  database: drizzleAdapter(db, { provider: EAuthDatabaseProvider.SQLITE, schema }),
  session: { storeSessionInDatabase: true },
  rateLimit: { enabled: true, storage: "database" },
  emailAndPassword: { enabled: true },
  socialProviders: { google: ENV.auth.google },
  databaseHooks: {
    account: { create: { after: (account) => AuthService.handleAccountCreated(account) } },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: CLIENT_IP_HEADERS },
    crossSubDomainCookies: crossSubDomainCookies(ENV.auth.cookieDomain),
  },
});
