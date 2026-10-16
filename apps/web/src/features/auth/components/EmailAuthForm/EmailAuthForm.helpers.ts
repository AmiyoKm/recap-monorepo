import type { EAuthMode } from "@/features/auth/auth.enums";
import { EMAIL_AUTH_OTHER_MODE } from "@/features/auth/components/EmailAuthForm/EmailAuthForm.constants";

export function otherMode(mode: EAuthMode): EAuthMode {
  return EMAIL_AUTH_OTHER_MODE[mode];
}
