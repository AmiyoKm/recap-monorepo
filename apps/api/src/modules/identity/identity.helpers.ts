import { randomBytes } from "node:crypto";

import {
  GRANT_STATE_BYTES,
  PENDING_GRANT_TTL_SECONDS,
  PROVIDER_REGISTRY,
  SQLITE_UNIQUE_VIOLATION,
} from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityAuthKind,
  EIdentityCacheKeyPrefix,
  EIdentityMessages,
} from "#api/modules/identity/identity.enums";
import type {
  IApiKeyConnectionInput,
  IOAuthConnectionInput,
  IProviderRegistration,
} from "#api/modules/identity/identity.interfaces";
import type {
  TApiKey,
  TConnectionResponse,
  TConnectionRow,
  TIdentityResponse,
  TIdentityRow,
  TPendingGrant,
  TPendingGrantInsert,
} from "#api/modules/identity/identity.types";
import { encryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { ENV } from "#api/shared/env/env.constants";
import { toStringRecord } from "#api/shared/json/json.helpers";
import { GOOGLE_SCOPE_SEPARATOR } from "#api/shared/providers/google/google.constants";
import type { IGoogleProfile } from "#api/shared/providers/google/google.interfaces";
import { normalizeJiraSite } from "#api/shared/providers/jira/jira.helpers";
import { EProvider } from "#api/shared/providers/providers.enums";
import { ROUTES } from "#api/shared/routes/routes.constants";

export function createGrantState(): string {
  return randomBytes(GRANT_STATE_BYTES).toString("base64url");
}

export function connectionTokenKey(connectionId: string): string {
  return `${EIdentityCacheKeyPrefix.CONNECTION_TOKEN}${connectionId}`;
}

export function buildPendingGrantRow(state: string, grant: TPendingGrant): TPendingGrantInsert {
  return {
    state,
    payload: JSON.stringify(grant),
    expiresAt: dayjs().add(PENDING_GRANT_TTL_SECONDS, "second").toISOString(),
  };
}

export function findProviderRegistration(
  registry: Record<string, IProviderRegistration>,
  provider: string,
): IProviderRegistration | undefined {
  if (!Object.hasOwn(registry, provider)) {
    return undefined;
  }
  return registry[provider];
}

export function isWiredProvider(provider: string, authKind: EIdentityAuthKind): boolean {
  const registration = findProviderRegistration(PROVIDER_REGISTRY, provider);
  return registration?.wired === true && registration.authKind === authKind;
}

export function parsePendingGrant(stored: string): TPendingGrant | null {
  try {
    return readPendingGrant(stored);
  } catch {
    return null;
  }
}

function readPendingGrant(stored: string): TPendingGrant | null {
  const parsed: unknown = JSON.parse(stored);
  const record = toStringRecord(parsed);
  if (!record) {
    return null;
  }
  const { userId, purpose, codeVerifier } = record;
  if (typeof userId !== "string" || typeof codeVerifier !== "string") {
    return null;
  }
  if (purpose === EGrantPurpose.IDENTITY_CREATE) {
    return { userId, purpose, codeVerifier };
  }
  if (purpose !== EGrantPurpose.CONNECTION) {
    return null;
  }
  const { identityId, provider } = record;
  if (typeof identityId !== "string" || typeof provider !== "string") {
    return null;
  }
  return { userId, purpose, identityId, provider, codeVerifier };
}

function errorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [];
  }
  return [error.message, ...errorMessages(error.cause)];
}

export function isUniqueViolation(error: unknown): boolean {
  return errorMessages(error).some((message) => message.includes(SQLITE_UNIQUE_VIOLATION));
}

function toKnownValue<TValue extends string>(values: TValue[], value: string): TValue {
  const match = values.find((entry) => entry === value);
  if (match === undefined) {
    throw new Error(EIdentityMessages.UNKNOWN_CONNECTION_VALUE, { cause: value });
  }
  return match;
}

export function toConnectionView(row: TConnectionRow): TConnectionResponse {
  return {
    id: row.id,
    provider: toKnownValue(Object.values(EProvider), row.provider),
    authKind: toKnownValue(Object.values(EIdentityAuthKind), row.authKind),
    status: toKnownValue(Object.values(EConnectionStatus), row.status),
    scopes: row.scopes,
    providerAccountId: row.providerAccountId,
    providerAccountEmail: row.providerAccountEmail,
    providerSite: row.providerSite,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toIdentityView(
  row: TIdentityRow,
  connections: TConnectionRow[],
): TIdentityResponse {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    connections: connections
      .filter((connection) => connection.identityId === row.id)
      .map((connection) => toConnectionView(connection)),
  };
}

export function buildIdentityRow(
  id: string,
  userId: string,
  profile: IGoogleProfile,
): TIdentityRow {
  const now = dayjs().toISOString();
  return {
    id,
    userId,
    googleSub: profile.sub,
    email: profile.email,
    displayName: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function accessTokenExpiresAt(
  now: ReturnType<typeof dayjs>,
  expiresInSeconds: number | undefined,
): string | null {
  if (expiresInSeconds === undefined) {
    return null;
  }
  return now.add(expiresInSeconds, "second").toISOString();
}

export function buildOAuthConnectionRow(input: IOAuthConnectionInput): TConnectionRow {
  const now = dayjs();
  return {
    id: input.id,
    identityId: input.identityId,
    provider: input.provider,
    authKind: EIdentityAuthKind.OAUTH,
    status: EConnectionStatus.ACTIVE,
    scopes: input.scopes.join(GOOGLE_SCOPE_SEPARATOR),
    refreshTokenEnc: encryptSecret(ENV.connectionEncryptionKey, input.refreshToken),
    apiKeyEnc: null,
    accessTokenExpiresAt: accessTokenExpiresAt(now, input.expiresInSeconds),
    providerAccountId: input.profile.sub,
    providerAccountEmail: input.profile.email,
    providerSite: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function buildApiKeyConnectionRow(input: IApiKeyConnectionInput): TConnectionRow {
  const now = dayjs().toISOString();
  return {
    id: input.id,
    identityId: input.identityId,
    provider: input.provider,
    authKind: EIdentityAuthKind.API_KEY,
    status: EConnectionStatus.ACTIVE,
    scopes: null,
    refreshTokenEnc: null,
    apiKeyEnc: encryptSecret(ENV.connectionEncryptionKey, input.apiKey),
    accessTokenExpiresAt: null,
    providerAccountId: input.account.accountId,
    providerAccountEmail: input.account.accountEmail,
    providerSite: input.site,
    createdAt: now,
    updatedAt: now,
  };
}

export function apiKeySite(apiKey: TApiKey): string | null {
  if (apiKey.provider !== EProvider.JIRA) {
    return null;
  }
  return normalizeJiraSite(apiKey.credentials.site);
}

export function hasCalendarScope(scopes: string[]): boolean {
  return scopes.includes(ROUTES.GOOGLE.CALENDAR_READONLY_SCOPE);
}
