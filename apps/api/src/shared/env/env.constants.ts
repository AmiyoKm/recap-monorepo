import { optionalEnv, optionalOAuthClient, requireEnv } from "#api/shared/env/env.helpers";
import type { IEnv } from "#api/shared/env/env.interfaces";

export const ENV: IEnv = {
  webOrigin: requireEnv("WEB_ORIGIN", process.env["WEB_ORIGIN"]),
  connectionEncryptionKey: requireEnv(
    "CONNECTION_ENCRYPTION_KEY",
    process.env["CONNECTION_ENCRYPTION_KEY"],
  ),
  auth: {
    secret: requireEnv("BETTER_AUTH_SECRET", process.env["BETTER_AUTH_SECRET"]),
    baseUrl: requireEnv("BETTER_AUTH_URL", process.env["BETTER_AUTH_URL"]),
    cookieDomain: optionalEnv(process.env["COOKIE_DOMAIN"]),
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID", process.env["GOOGLE_CLIENT_ID"]),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET", process.env["GOOGLE_CLIENT_SECRET"]),
    },
  },
  jira: optionalOAuthClient(process.env["JIRA_CLIENT_ID"], process.env["JIRA_CLIENT_SECRET"]),
  linear: optionalOAuthClient(process.env["LINEAR_CLIENT_ID"], process.env["LINEAR_CLIENT_SECRET"]),
};
