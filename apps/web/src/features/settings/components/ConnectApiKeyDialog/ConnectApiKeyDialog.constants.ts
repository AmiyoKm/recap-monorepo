import { EProvider } from "@/api/identity/identity.enums";
import type { TApiKeyProvider } from "@/api/identity/identity.types";

export const CONNECT_API_KEY_LABELS: Record<TApiKeyProvider, string> = {
  [EProvider.JIRA]: "Connect Jira",
  [EProvider.LINEAR]: "Connect Linear",
};
export const CONNECT_API_KEY_DESCRIPTIONS: Record<TApiKeyProvider, string> = {
  [EProvider.JIRA]:
    "Paste a Jira API token, your Atlassian email and your Jira site. Recap checks them now and stores the token encrypted.",
  [EProvider.LINEAR]:
    "Paste an API key from the provider. Recap checks the key now and stores it encrypted.",
};
export const CONNECT_API_KEY_FIELD_LABEL = "API key";
export const CONNECT_API_KEY_EMAIL_LABEL = "Atlassian email";
export const CONNECT_API_KEY_SITE_LABEL = "Jira site";
export const CONNECT_API_KEY_SITE_PLACEHOLDER = "acme.atlassian.net";
export const CONNECT_API_KEY_SUBMIT = "Connect";
export const CONNECT_API_KEY_SUBMITTING = "Connecting.";
