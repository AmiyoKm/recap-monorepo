import { DEFAULT_PORT } from "#api/shared/env/env.constants";
import { EEnvMessages } from "#api/shared/env/env.enums";
import type { IEnv } from "#api/shared/env/env.interfaces";

function readRequired(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name];
  if (!value) {
    throw new Error(EEnvMessages.MISSING_VARIABLE, { cause: name });
  }
  return value;
}

function readOptional(source: NodeJS.ProcessEnv, name: string): string | undefined {
  return source[name] || undefined;
}

export function loadEnv(source: NodeJS.ProcessEnv): IEnv {
  return {
    port: Number(source["PORT"] ?? DEFAULT_PORT),
    databaseUrl: readRequired(source, "DATABASE_URL"),
    redisUrl: readRequired(source, "REDIS_URL"),
    redisKeyPrefix: readOptional(source, "REDIS_KEY_PREFIX") ?? "",
    webOrigin: readRequired(source, "WEB_ORIGIN"),
    connectionEncryptionKey: readRequired(source, "CONNECTION_ENCRYPTION_KEY"),
    auth: {
      secret: readRequired(source, "BETTER_AUTH_SECRET"),
      baseUrl: readRequired(source, "BETTER_AUTH_URL"),
      cookieDomain: readOptional(source, "COOKIE_DOMAIN"),
      google: {
        clientId: readOptional(source, "GOOGLE_CLIENT_ID"),
        clientSecret: readOptional(source, "GOOGLE_CLIENT_SECRET"),
      },
    },
  };
}
