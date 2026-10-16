import { EAuthMode } from "@/features/auth/auth.enums";

export const EMAIL_AUTH_NAME_LABEL = "Your name";
export const EMAIL_AUTH_EMAIL_LABEL = "Email";
export const EMAIL_AUTH_PASSWORD_LABEL = "Password";
export const EMAIL_AUTH_PASSWORD_HINT = "At least 8 characters.";
const EMAIL_AUTH_PASSWORD_MIN_LENGTH = 8;
export const EMAIL_AUTH_SUBMIT: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "Sign in",
  [EAuthMode.SIGN_UP]: "Create account",
};
export const EMAIL_AUTH_PENDING: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "Signing in.",
  [EAuthMode.SIGN_UP]: "Creating your account.",
};
export const EMAIL_AUTH_SWITCH_PROMPT: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "No account yet?",
  [EAuthMode.SIGN_UP]: "Already have an account?",
};
export const EMAIL_AUTH_SWITCH_ACTION: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "Create one",
  [EAuthMode.SIGN_UP]: "Sign in",
};
export const EMAIL_AUTH_OTHER_MODE: Record<EAuthMode, EAuthMode> = {
  [EAuthMode.SIGN_IN]: EAuthMode.SIGN_UP,
  [EAuthMode.SIGN_UP]: EAuthMode.SIGN_IN,
};
export const EMAIL_AUTH_PASSWORD_AUTOCOMPLETE: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "current-password",
  [EAuthMode.SIGN_UP]: "new-password",
};
export const EMAIL_AUTH_PASSWORD_MIN_LENGTHS: Record<EAuthMode, number | undefined> = {
  [EAuthMode.SIGN_IN]: undefined,
  [EAuthMode.SIGN_UP]: EMAIL_AUTH_PASSWORD_MIN_LENGTH,
};
