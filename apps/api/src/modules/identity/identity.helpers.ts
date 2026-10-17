import { randomBytes } from "node:crypto";

import {
  GRANT_STATE_BYTES,
  PENDING_GRANT_TTL_SECONDS,
  PROVIDER_CALLBACKS,
  SQLITE_UNIQUE_VIOLATION,
} from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityCacheKeyPrefix,
  EIdentityMessages,
  EOAuthCallback,
} from "#api/modules/identity/identity.enums";
import type { IOAuthConnectionInput } from "#api/modules/identity/identity.interfaces";
import type {
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
import type { EGoogleSource } from "#api/shared/providers/google/google.enums";
import { grantedSources, parseSources } from "#api/shared/providers/google/google.helpers";
import type { IGoogleProfile } from "#api/shared/providers/google/google.interfaces";
import { OAUTH_SCOPE_SEPARATOR } from "#api/shared/providers/providers.constants";
import { EProvider } from "#api/shared/providers/providers.enums";

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

export function isWiredProvider(provider: EProvider): boolean {
  return PROVIDER_CALLBACKS[provider] !== null;
}

export function toProvider(value: string): EProvider | undefined {
  return Object.values(EProvider).find((provider) => provider === value);
}

export function grantCallback(grant: TPendingGrant): EOAuthCallback | null {
  switch (grant.purpose) {
    case EGrantPurpose.IDENTITY_CREATE:
      return EOAuthCallback.GOOGLE;
    case EGrantPurpose.CONNECTION:
      return PROVIDER_CALLBACKS[grant.provider];
  }
}

export function requireCodeVerifier(codeVerifier: string | null): string {
  if (codeVerifier === null) {
    throw new Error(EIdentityMessages.CODE_VERIFIER_MISSING);
  }
  return codeVerifier;
}

function readCodeVerifier(value: unknown): string | null | undefined {
  if (typeof value === "string" || value === null) {
    return value;
  }
  return undefined;
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
  const { userId, purpose, codeVerifier: storedVerifier } = record;
  const codeVerifier = readCodeVerifier(storedVerifier);
  if (typeof userId !== "string" || codeVerifier === undefined) {
    return null;
  }
  if (purpose === EGrantPurpose.IDENTITY_CREATE) {
    return { userId, purpose, codeVerifier };
  }
  if (purpose !== EGrantPurpose.CONNECTION) {
    return null;
  }
  const { identityId, provider: providerName, sources: storedSources } = record;
  if (typeof identityId !== "string" || typeof providerName !== "string") {
    return null;
  }
  const provider = toProvider(providerName);
  if (!(provider && Array.isArray(storedSources))) {
    return null;
  }
  const sources = parseSources(storedSources);
  if (!sources) {
    return null;
  }
  return { userId, purpose, identityId, provider, sources, codeVerifier };
}

export function readRequestedSources(
  provider: EProvider,
  sources: string[] | undefined,
): EGoogleSource[] | null {
  if (provider === EProvider.GOOGLE) {
    return readGoogleSources(sources);
  }
  if (sources !== undefined) {
    return null;
  }
  return [];
}

function readGoogleSources(sources: string[] | undefined): EGoogleSource[] | null {
  if (!sources || sources.length === 0) {
    return null;
  }
  return parseSources(sources);
}

function connectionSources(provider: EProvider, scopes: string | null): EGoogleSource[] {
  if (provider !== EProvider.GOOGLE || !scopes) {
    return [];
  }
  return grantedSources(scopes.split(OAUTH_SCOPE_SEPARATOR));
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
  const provider = toKnownValue(Object.values(EProvider), row.provider);
  return {
    id: row.id,
    provider,
    status: toKnownValue(Object.values(EConnectionStatus), row.status),
    scopes: row.scopes,
    sources: connectionSources(provider, row.scopes),
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
    status: EConnectionStatus.ACTIVE,
    scopes: input.tokens.scopes.join(OAUTH_SCOPE_SEPARATOR),
    refreshTokenEnc: encryptSecret(ENV.connectionEncryptionKey, input.refreshToken),
    accessTokenExpiresAt: accessTokenExpiresAt(now, input.tokens.expiresInSeconds),
    providerAccountId: input.account.accountId,
    providerAccountEmail: input.account.accountEmail,
    providerSite: input.site,
    providerResourceId: input.resourceId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
