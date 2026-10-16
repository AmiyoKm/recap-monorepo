import { EProvider } from "@/api/identity/identity.enums";
import type { IConnectApiKeyInput } from "@/api/identity/identity.interfaces";

export function apiKeyConnectInput(input: IConnectApiKeyInput): IConnectApiKeyInput {
  if (input.provider !== EProvider.JIRA) {
    return { identityId: input.identityId, provider: input.provider, apiKey: input.apiKey };
  }
  return input;
}
