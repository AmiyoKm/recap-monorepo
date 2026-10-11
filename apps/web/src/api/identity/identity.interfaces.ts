import type { TApiKeyProvider } from "@/api/identity/identity.types";

export interface IConnectApiKeyInput {
  identityId: string;
  provider: TApiKeyProvider;
  apiKey: string;
}
