import type { RedisClient } from "bun";

import type { TDb } from "@recap/db";

import type { EGrantPurpose, EIdentityAuthKind } from "#api/modules/identity/identity.enums";
import type { IProviderClient } from "#api/shared/provider/provider.interfaces";
import type { ISessionProvider } from "#api/shared/session/session.interfaces";

export interface IIdentityDeps {
  db: TDb;
  redis: RedisClient;
  redisKeyPrefix: string;
  webOrigin: string;
  callbackBaseUrl: string;
  encryptionKey: string;
  providerClient: IProviderClient;
  sessionProvider: ISessionProvider;
}

export interface IProviderRegistration {
  authKind: EIdentityAuthKind;
  wired: boolean;
}

export interface IPendingGrant {
  userId: string;
  purpose: EGrantPurpose;
  identityId: string | undefined;
}

export interface IApiKeyConnectFailure {
  code: number;
  message: string;
}

export interface IIdentityConnectionView {
  id: string;
  provider: string;
  authKind: string;
  status: string;
  scopes: string | null;
  providerAccountId: string | null;
  providerAccountEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IIdentityView {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  connections: IIdentityConnectionView[];
}
