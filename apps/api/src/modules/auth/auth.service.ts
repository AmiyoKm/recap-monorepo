import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { schema } from "@recap/db";

import type { ICreateAuthOptions } from "#api/modules/auth/auth.interfaces";

export function createAuth({ db, storage, config, trustedOrigins }: ICreateAuthOptions) {
  const { clientId, clientSecret } = config.google;

  return betterAuth({
    secret: config.secret,
    baseURL: config.baseUrl,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secondaryStorage: storage,
    session: { storeSessionInDatabase: true },
    rateLimit: { enabled: true, storage: "secondary-storage" },
    emailAndPassword: { enabled: true },
    socialProviders: clientId && clientSecret ? { google: { clientId, clientSecret } } : {},
    advanced: {
      cookiePrefix: config.cookiePrefix,
      crossSubDomainCookies: config.cookieDomain
        ? { enabled: true, domain: config.cookieDomain }
        : undefined,
    },
  });
}
