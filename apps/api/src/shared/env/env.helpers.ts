import { EEnvMessages } from "#api/shared/env/env.enums";

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(EEnvMessages.MISSING_VARIABLE, { cause: name });
  }
  return value;
}

export function optionalEnv(value: string | undefined): string | undefined {
  return value || undefined;
}
