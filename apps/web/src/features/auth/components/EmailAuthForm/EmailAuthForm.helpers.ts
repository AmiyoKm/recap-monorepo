import { EAuthMode } from "@/features/auth/auth.enums";

export function otherMode(mode: EAuthMode): EAuthMode {
  return mode === EAuthMode.SIGN_IN ? EAuthMode.SIGN_UP : EAuthMode.SIGN_IN;
}
