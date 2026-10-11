import type { EGrantPurpose, EIdentityAuthKind } from "#api/modules/identity/identity.enums";
import type { TIdentityRow } from "#api/modules/identity/identity.types";
import type { IGoogleGrant, IGoogleProfile } from "#api/shared/providers/google/google.interfaces";
import type { IJiraCredentials } from "#api/shared/providers/jira/jira.interfaces";
import type { EProvider } from "#api/shared/providers/providers.enums";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";

export interface IProviderRegistration {
  authKind: EIdentityAuthKind;
  wired: boolean;
}

export interface IIdentityCreateGrant {
  userId: string;
  purpose: EGrantPurpose.IDENTITY_CREATE;
}

export interface IConnectionGrant {
  userId: string;
  purpose: EGrantPurpose.CONNECTION;
  identityId: string;
  provider: string;
}

export interface IGrantVerifier {
  codeVerifier: string;
}

export interface IOAuthConnectionSave {
  identity: TIdentityRow;
  provider: string;
  grant: IGoogleGrant;
  staleConnectionId: string | undefined;
}

export interface IConnectionOwnership {
  connectionId: string;
  userId: string;
}

export interface IProviderSlot {
  isTaken: boolean;
  staleConnectionId: string | undefined;
}

export interface IApiKeyConnectInput {
  provider: string;
  apiKey: string;
  email: string | undefined;
  site: string | undefined;
}

export interface IJiraApiKey {
  provider: EProvider.JIRA;
  credentials: IJiraCredentials;
}

export interface ILinearApiKey {
  provider: EProvider.LINEAR;
  apiKey: string;
}

export interface IOAuthConnectionInput {
  id: string;
  identityId: string;
  provider: string;
  refreshToken: string;
  expiresInSeconds: number | undefined;
  scopes: string[];
  profile: IGoogleProfile;
}

export interface IApiKeyConnectionInput {
  id: string;
  identityId: string;
  provider: string;
  apiKey: string;
  site: string | null;
  account: IProviderAccount;
}
