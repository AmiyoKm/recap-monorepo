import type { EConsentTarget, EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider } from "@/api/identity/identity.types";

export interface IConnectProviderInput {
  identityId: string;
  provider: TConnectorProvider;
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

export interface IIdentityConsentTarget {
  kind: EConsentTarget.IDENTITY;
}

export interface IConnectionConsentTarget {
  kind: EConsentTarget.CONNECTION;
  identityId: string;
  provider: EProvider;
}
