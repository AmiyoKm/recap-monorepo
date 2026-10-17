import { EEnvMessages } from "#api/shared/env/env.enums";
import type { IOAuthClientEnv } from "#api/shared/env/env.interfaces";

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(EEnvMessages.MISSING_VARIABLE, { cause: name });
  }
  return value;
}

export function optionalEnv(value: string | undefined): string | undefined {
  return value || undefined;
}

export function optionalOAuthClient(
  clientId: string | undefined,
  clientSecret: string | undefined,
): IOAuthClientEnv | undefined {
  if (!(clientId && clientSecret)) {
    return undefined;
  }
  return { clientId, clientSecret };
}
