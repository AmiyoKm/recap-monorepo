import type { EGrantPurpose } from "#api/modules/identity/identity.enums";
import type { TIdentityRow } from "#api/modules/identity/identity.types";
import type { EGoogleSource } from "#api/shared/providers/google/google.enums";
import type { IGoogleGrant } from "#api/shared/providers/google/google.interfaces";
import type { EProvider } from "#api/shared/providers/providers.enums";
import type {
  IProviderAccount,
  IProviderGrant,
  IProviderTokens,
} from "#api/shared/providers/providers.interfaces";

export interface IIdentityCreateGrant {
  userId: string;
  purpose: EGrantPurpose.IDENTITY_CREATE;
}

export interface IConnectionGrant {
  userId: string;
  purpose: EGrantPurpose.CONNECTION;
  identityId: string;
  provider: EProvider;
  sources: EGoogleSource[];
}

export interface IGrantVerifier {
  codeVerifier: string | null;
}

export interface IConnectionTarget {
  identity: TIdentityRow;
  provider: EProvider;
  staleConnectionId: string | undefined;
}

export interface IGoogleConnectionSave extends IConnectionTarget {
  grant: IGoogleGrant;
  requestedSources: EGoogleSource[];
}

export interface IProviderConnectionSave extends IConnectionTarget {
  grant: IProviderGrant;
}

export interface IProviderSlot {
  isTaken: boolean;
  staleConnectionId: string | undefined;
}

export interface IOAuthConnectionInput {
  id: string;
  identityId: string;
  provider: EProvider;
  refreshToken: string;
  tokens: IProviderTokens;
  account: IProviderAccount;
  site: string | null;
  resourceId: string | null;
}

export interface ITakePendingGrantInput {
  state: string;
  now: string;
}

export interface ISharedAccountInput {
  provider: EProvider;
  providerAccountId: string;
  revokedConnectionId: string;
}
