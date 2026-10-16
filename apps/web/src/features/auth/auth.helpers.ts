import { EAuthMode } from "@/features/auth/auth.enums";

export function toAuthMode(value: string | undefined): EAuthMode {
  if (value !== EAuthMode.SIGN_UP) {
    return EAuthMode.SIGN_IN;
  }
  return EAuthMode.SIGN_UP;
}
