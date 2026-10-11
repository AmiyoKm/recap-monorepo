import { EAuthMode } from "@/features/auth/auth.enums";

export function toAuthMode(value: string | undefined): EAuthMode {
  return value === EAuthMode.SIGN_UP ? EAuthMode.SIGN_UP : EAuthMode.SIGN_IN;
}
