import type { TApiKeyProvider } from "@/api/identity/identity.types";

export const CONNECT_API_KEY_LABELS: Record<TApiKeyProvider, string> = {
  jira: "Connect Jira",
  linear: "Connect Linear",
};
export const CONNECT_API_KEY_DESCRIPTION =
  "Paste an API key from the provider. The key is validated now and stored encrypted.";
export const CONNECT_API_KEY_FIELD_LABEL = "API key";
export const CONNECT_API_KEY_SUBMIT = "Connect";
export const CONNECT_API_KEY_SUBMITTING = "Connecting.";
