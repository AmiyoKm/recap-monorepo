import { EAuthMode } from "@/features/auth/auth.enums";

export const SIGN_IN_TITLE: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "Sign in",
  [EAuthMode.SIGN_UP]: "Create an account",
};
export const SIGN_IN_DESCRIPTION: Record<EAuthMode, string> = {
  [EAuthMode.SIGN_IN]: "Use the account you made for Recap.",
  [EAuthMode.SIGN_UP]: "Any email works. You connect your work accounts after this.",
};
export const SIGN_IN_SEPARATOR = "or";
export const SIGN_IN_GOOGLE_FAILED = "Google sign-in did not finish. Try again.";
