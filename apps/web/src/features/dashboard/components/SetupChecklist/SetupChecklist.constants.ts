import { ESetupStep } from "@/features/dashboard/dashboard.enums";

export const SETUP_TITLE = "Getting started";
export const SETUP_PROGRESS_LABEL = "Setup progress";
export const SETUP_DONE_SUFFIX = "done";
export const SETUP_LATER = "Coming soon";
export const SETUP_STEP_TITLES: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "Create an account",
  [ESetupStep.IDENTITY]: "Add a work account",
  [ESetupStep.CONNECTION]: "Connect a tool",
};
export const SETUP_STEP_DESCRIPTIONS: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "You created your account.",
  [ESetupStep.IDENTITY]: "The Google account you use at work.",
  [ESetupStep.CONNECTION]: "Google Calendar, Jira or Linear.",
};
export const SETUP_STEP_ACTIONS: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "",
  [ESetupStep.IDENTITY]: "Add work account",
  [ESetupStep.CONNECTION]: "Connect",
};
export const SETUP_PERCENT = 100;
