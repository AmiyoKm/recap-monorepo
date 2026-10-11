import { ESetupStep } from "@/features/dashboard/dashboard.enums";

export const SETUP_TITLE = "Getting started";
export const SETUP_PROGRESS_LABEL = "Setup progress";
export const SETUP_DONE_SUFFIX = "done";
export const SETUP_LATER = "Coming soon";
export const SETUP_STEP_TITLES: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "Create an account",
  [ESetupStep.IDENTITY]: "Add a work account",
  [ESetupStep.CONNECTION]: "Connect a tool",
  [ESetupStep.AI_KEY]: "Add an AI key",
};
export const SETUP_STEP_DESCRIPTIONS: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "You created your account.",
  [ESetupStep.IDENTITY]: "The Google account you use at work.",
  [ESetupStep.CONNECTION]: "Google Calendar, Jira or Linear.",
  [ESetupStep.AI_KEY]: "Summaries need an AI key. This step is not available yet.",
};
export const SETUP_STEP_ACTIONS: Record<ESetupStep, string> = {
  [ESetupStep.ACCOUNT]: "",
  [ESetupStep.IDENTITY]: "Add work account",
  [ESetupStep.CONNECTION]: "Connect",
  [ESetupStep.AI_KEY]: "",
};
export const SETUP_PERCENT = 100;
