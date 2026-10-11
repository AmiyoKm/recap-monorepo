import type { TApiKeyProvider } from "@/api/identity/identity.types";

export interface IConnectApiKeyInput {
  identityId: string;
  provider: TApiKeyProvider;
  apiKey: string;
  email?: string;
  site?: string;
}

export interface IAuthorizeResult {
  authorizeUrl: string;
}

export interface IConnectResultMessage {
  connected: string | undefined;
  email: string | undefined;
  error: string | undefined;
}

export interface IIdentitiesQueryOptions {
  isWaitingForConsent?: boolean;
}
