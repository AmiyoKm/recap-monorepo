import { EEnvMessages } from "#api/shared/env/env.enums";
import type { IEnv, IEnvSource } from "#api/shared/env/env.interfaces";

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(EEnvMessages.MISSING_VARIABLE, { cause: name });
  }
  return value;
}

export function optionalEnv(value: string | undefined): string | undefined {
  return value || undefined;
}

export function loadEnv(source: IEnvSource): IEnv {
  return {
    webOrigin: requireEnv("WEB_ORIGIN", source["WEB_ORIGIN"]),
    connectionEncryptionKey: requireEnv(
      "CONNECTION_ENCRYPTION_KEY",
      source["CONNECTION_ENCRYPTION_KEY"],
    ),
    auth: {
      secret: requireEnv("BETTER_AUTH_SECRET", source["BETTER_AUTH_SECRET"]),
      baseUrl: requireEnv("BETTER_AUTH_URL", source["BETTER_AUTH_URL"]),
      cookieDomain: optionalEnv(source["COOKIE_DOMAIN"]),
      google: {
        clientId: requireEnv("GOOGLE_CLIENT_ID", source["GOOGLE_CLIENT_ID"]),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET", source["GOOGLE_CLIENT_SECRET"]),
      },
    },
    jira: {
      clientId: requireEnv("JIRA_CLIENT_ID", source["JIRA_CLIENT_ID"]),
      clientSecret: requireEnv("JIRA_CLIENT_SECRET", source["JIRA_CLIENT_SECRET"]),
    },
    linear: {
      clientId: requireEnv("LINEAR_CLIENT_ID", source["LINEAR_CLIENT_ID"]),
      clientSecret: requireEnv("LINEAR_CLIENT_SECRET", source["LINEAR_CLIENT_SECRET"]),
    },
  };
}
