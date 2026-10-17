import { EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider } from "@/api/identity/identity.types";

export const CONNECT_PROVIDER_TITLES: Record<TConnectorProvider, string> = {
  [EProvider.GOOGLE]: "Connect Google",
  [EProvider.JIRA]: "Connect Jira",
  [EProvider.LINEAR]: "Connect Linear",
};
export const CONNECT_PROVIDER_DESCRIPTIONS: Record<TConnectorProvider, string> = {
  [EProvider.GOOGLE]:
    "Pick what Recap can read. Then open the Google consent in the browser profile where this work account lives. Recap gets read-only access.",
  [EProvider.JIRA]:
    "Open the Atlassian consent in the browser profile where your Jira account lives, then pick the Jira site. Recap gets read-only access to your Jira work.",
  [EProvider.LINEAR]:
    "Open the Linear consent in the browser profile where your Linear account lives, then pick the workspace. Recap gets read-only access.",
};
export const CONNECT_PROVIDER_LOADING: Record<TConnectorProvider, string> = {
  [EProvider.GOOGLE]: "Preparing your Google consent link.",
  [EProvider.JIRA]: "Preparing your Atlassian consent link.",
  [EProvider.LINEAR]: "Preparing your Linear consent link.",
};
export const CONNECT_PROVIDER_OPEN: Record<TConnectorProvider, string> = {
  [EProvider.GOOGLE]: "Open Google",
  [EProvider.JIRA]: "Open Atlassian",
  [EProvider.LINEAR]: "Open Linear",
};
export const CONNECT_PROVIDER_DONE: Record<TConnectorProvider, string> = {
  [EProvider.GOOGLE]: "Google connected.",
  [EProvider.JIRA]: "Jira connected.",
  [EProvider.LINEAR]: "Linear connected.",
};
export const CONNECT_PROVIDER_FAILED = "Recap failed to make the consent link. Try again.";
export const CONNECT_PROVIDER_COPY = "Copy";
export const CONNECT_PROVIDER_COPIED = "Copied";
