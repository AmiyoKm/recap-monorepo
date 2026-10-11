import { optionalEnv, requireEnv } from "#api/shared/env/env.helpers";
import type { IEnv } from "#api/shared/env/env.interfaces";

const DEFAULT_PORT = 3000;

export const ENV: IEnv = {
  port: Number(optionalEnv(process.env["PORT"]) ?? DEFAULT_PORT),
  databaseUrl: requireEnv("DATABASE_URL", process.env["DATABASE_URL"]),
  redisUrl: requireEnv("REDIS_URL", process.env["REDIS_URL"]),
  redisKeyPrefix: optionalEnv(process.env["REDIS_KEY_PREFIX"]) ?? "",
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
      clientId: optionalEnv(process.env["GOOGLE_CLIENT_ID"]),
      clientSecret: optionalEnv(process.env["GOOGLE_CLIENT_SECRET"]),
    },
  },
};
