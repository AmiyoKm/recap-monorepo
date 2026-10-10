import { EEnvMessages } from "@/shared/env/env.enums";

export function readRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(EEnvMessages.MISSING_VARIABLE, { cause: name });
  }
  return value;
}
