import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { schema } from "@recap/db";

import {
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_CALLBACK_PATH,
  IDENTITY_CREATE_SCOPES,
  PENDING_GRANT_TTL_SECONDS,
  PROVIDER_REGISTRY,
} from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityAuthKind,
  EIdentityConnectError,
  EIdentityMessages,
} from "#api/modules/identity/identity.enums";
import {
  connectionTokenKey,
  createGrantState,
  findProviderRegistration,
  parsePendingGrant,
  pendingGrantKey,
} from "#api/modules/identity/identity.helpers";
import type {
  IIdentityConnectionView,
  IIdentityDeps,
  IIdentityView,
  IPendingGrant,
} from "#api/modules/identity/identity.interfaces";
import type { TConnectionRow, TIdentityRow } from "#api/modules/identity/identity.types";
import { encryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { EProviderMessages } from "#api/shared/provider/provider.enums";
import type { IApiKeyValidationResult, ITokenSet } from "#api/shared/provider/provider.interfaces";
import { ERedisCommand, ERedisSetOption } from "#api/shared/redis/redis.enums";

function toConnectionView(row: TConnectionRow): IIdentityConnectionView {
  return {
    id: row.id,
    provider: row.provider,
    authKind: row.authKind,
    status: row.status,
    scopes: row.scopes,
    providerAccountId: row.providerAccountId,
    providerAccountEmail: row.providerAccountEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toIdentityView(row: TIdentityRow, rows: TConnectionRow[]): IIdentityView {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    connections: rows
      .filter((link) => link.identityId === row.id)
      .map((link) => toConnectionView(link)),
  };
}

export async function listIdentities(
  deps: Pick<IIdentityDeps, "db">,
  userId: string,
): Promise<IIdentityView[]> {
  const identities = await deps.db
    .select()
    .from(schema.identity)
    .where(eq(schema.identity.userId, userId));
  if (identities.length === 0) {
    return [];
  }
  const links = await deps.db
    .select()
    .from(schema.connection)
    .where(
      inArray(
        schema.connection.identityId,
        identities.map((row) => row.id),
      ),
    );
  return identities.map((row) => toIdentityView(row, links));
}

export async function startIdentityConnect(
  deps: Pick<IIdentityDeps, "redis" | "redisKeyPrefix" | "providerClient" | "callbackBaseUrl">,
  userId: string,
): Promise<{ authorizeUrl: string }> {
  const state = await storePendingGrant(deps, {
    userId,
    purpose: EGrantPurpose.IDENTITY_CREATE,
    identityId: undefined,
    provider: undefined,
  });
  const authorizeUrl = deps.providerClient.buildAuthorizeUrl({
    state,
    redirectUri: `${deps.callbackBaseUrl}${GOOGLE_CALLBACK_PATH}`,
    scopes: IDENTITY_CREATE_SCOPES,
  });
  return { authorizeUrl };
}

function settingsSuccessUrl(webOrigin: string, connected: string, email: string): string {
  return `${webOrigin}/settings?connected=${connected}&email=${encodeURIComponent(email)}`;
}

async function storePendingGrant(
  deps: Pick<IIdentityDeps, "redis" | "redisKeyPrefix">,
  grant: IPendingGrant,
): Promise<string> {
  const state = createGrantState();
  await deps.redis.send(ERedisCommand.SET, [
    pendingGrantKey(deps.redisKeyPrefix, state),
    JSON.stringify(grant),
    ERedisSetOption.EXPIRE_IN_SECONDS,
    String(PENDING_GRANT_TTL_SECONDS),
  ]);
  return state;
}

export async function startConnection(
  deps: Pick<
    IIdentityDeps,
    "db" | "redis" | "redisKeyPrefix" | "providerClient" | "callbackBaseUrl"
  >,
  userId: string,
  identityId: string,
  provider: string,
): Promise<{ authorizeUrl: string } | { error: EIdentityMessages }> {
  const owned = await deps.db
    .select({ id: schema.identity.id })
    .from(schema.identity)
    .where(and(eq(schema.identity.id, identityId), eq(schema.identity.userId, userId)));
  if (owned.length === 0) {
    return { error: EIdentityMessages.IDENTITY_NOT_FOUND };
  }
  const registration = findProviderRegistration(PROVIDER_REGISTRY, provider);
  if (!registration?.wired || registration.authKind !== EIdentityAuthKind.OAUTH) {
    return { error: EIdentityMessages.PROVIDER_UNSUPPORTED };
  }
  const state = await storePendingGrant(deps, {
    userId,
    purpose: EGrantPurpose.CONNECTION,
    identityId,
    provider,
  });
  const authorizeUrl = deps.providerClient.buildAuthorizeUrl({
    state,
    redirectUri: `${deps.callbackBaseUrl}${GOOGLE_CALLBACK_PATH}`,
    scopes: GOOGLE_CALENDAR_SCOPES,
  });
  return { authorizeUrl };
}

function settingsErrorUrl(webOrigin: string, error: EIdentityConnectError): string {
  return `${webOrigin}/settings?error=${error}`;
}

async function completeIdentityCreate(
  deps: Pick<IIdentityDeps, "db" | "webOrigin" | "callbackBaseUrl" | "providerClient">,
  grant: IPendingGrant,
  code: string,
): Promise<{ redirectUrl: string }> {
  const redirectUri = `${deps.callbackBaseUrl}${GOOGLE_CALLBACK_PATH}`;
  try {
    const tokens = await deps.providerClient.exchangeCode({ code, redirectUri });
    const profile = await deps.providerClient.fetchGoogleUserinfo(tokens.accessToken);
    const existing = await deps.db
      .select({ id: schema.identity.id })
      .from(schema.identity)
      .where(eq(schema.identity.googleSub, profile.sub));
    if (existing.length > 0) {
      return {
        redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.ALREADY_CONNECTED),
      };
    }
    const now = dayjs().toISOString();
    await deps.db.insert(schema.identity).values({
      id: randomUUID(),
      userId: grant.userId,
      googleSub: profile.sub,
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.picture,
      createdAt: now,
      updatedAt: now,
    });
    return { redirectUrl: settingsSuccessUrl(deps.webOrigin, "google", profile.email) };
  } catch (error) {
    console.error(EIdentityConnectError.FAILED, error);
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
}

async function cacheConnectionToken(
  deps: Pick<IIdentityDeps, "redis" | "redisKeyPrefix">,
  connectionId: string,
  tokens: ITokenSet,
): Promise<void> {
  if (tokens.expiresInSeconds === undefined || tokens.expiresInSeconds <= 0) {
    return;
  }
  await deps.redis.send(ERedisCommand.SET, [
    connectionTokenKey(deps.redisKeyPrefix, connectionId),
    tokens.accessToken,
    ERedisSetOption.EXPIRE_IN_SECONDS,
    String(tokens.expiresInSeconds),
  ]);
}

async function completeConnection(
  deps: Pick<
    IIdentityDeps,
    | "db"
    | "redis"
    | "redisKeyPrefix"
    | "webOrigin"
    | "callbackBaseUrl"
    | "providerClient"
    | "encryptionKey"
  >,
  grant: IPendingGrant,
  code: string,
): Promise<{ redirectUrl: string }> {
  if (grant.identityId === undefined || grant.provider === undefined) {
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
  const identities = await deps.db
    .select()
    .from(schema.identity)
    .where(eq(schema.identity.id, grant.identityId));
  const identity = identities[0];
  if (!identity || identity.userId !== grant.userId) {
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
  const existing = await deps.db
    .select({ id: schema.connection.id })
    .from(schema.connection)
    .where(
      and(
        eq(schema.connection.identityId, identity.id),
        eq(schema.connection.provider, grant.provider),
      ),
    );
  if (existing.length > 0) {
    return {
      redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.ALREADY_CONNECTED),
    };
  }
  const redirectUri = `${deps.callbackBaseUrl}${GOOGLE_CALLBACK_PATH}`;
  try {
    const tokens = await deps.providerClient.exchangeCode({ code, redirectUri });
    const profile = await deps.providerClient.fetchGoogleUserinfo(tokens.accessToken);
    if (profile.sub !== identity.googleSub) {
      return {
        redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.SUB_MISMATCH),
      };
    }
    if (tokens.refreshToken === undefined) {
      return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
    }
    const now = dayjs().toISOString();
    const connectionId = randomUUID();
    await deps.db.insert(schema.connection).values({
      id: connectionId,
      identityId: identity.id,
      provider: grant.provider,
      authKind: EIdentityAuthKind.OAUTH,
      status: EConnectionStatus.ACTIVE,
      scopes: GOOGLE_CALENDAR_SCOPES.join(" "),
      refreshTokenEnc: encryptSecret(deps.encryptionKey, tokens.refreshToken),
      apiKeyEnc: null,
      accessTokenExpiresAt:
        tokens.expiresInSeconds === undefined
          ? null
          : dayjs().add(tokens.expiresInSeconds, "second").toISOString(),
      providerAccountId: profile.sub,
      providerAccountEmail: profile.email,
      createdAt: now,
      updatedAt: now,
    });
    await cacheConnectionToken(deps, connectionId, tokens);
    return {
      redirectUrl: settingsSuccessUrl(deps.webOrigin, grant.provider, profile.email),
    };
  } catch (error) {
    console.error(EIdentityConnectError.FAILED, error);
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
}

export async function completeGoogleCallback(
  deps: Pick<
    IIdentityDeps,
    | "db"
    | "redis"
    | "redisKeyPrefix"
    | "webOrigin"
    | "callbackBaseUrl"
    | "providerClient"
    | "encryptionKey"
  >,
  input: { code: string; state: string },
): Promise<{ redirectUrl: string }> {
  const stored: unknown = await deps.redis.send(ERedisCommand.GET_AND_DELETE, [
    pendingGrantKey(deps.redisKeyPrefix, input.state),
  ]);
  if (typeof stored !== "string" || stored.length === 0) {
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.EXPIRED) };
  }
  const grant = parsePendingGrant(stored);
  if (!grant) {
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
  switch (grant.purpose) {
    case EGrantPurpose.IDENTITY_CREATE:
      return completeIdentityCreate(deps, grant, input.code);
    case EGrantPurpose.CONNECTION:
      return completeConnection(deps, grant, input.code);
  }
}

export async function connectApiKeyConnection(
  deps: Pick<IIdentityDeps, "db" | "providerClient" | "encryptionKey">,
  userId: string,
  identityId: string,
  providerName: string,
  apiKey: string,
): Promise<IIdentityConnectionView> {
  const owned = await deps.db
    .select({ id: schema.identity.id })
    .from(schema.identity)
    .where(and(eq(schema.identity.id, identityId), eq(schema.identity.userId, userId)));
  if (owned.length === 0) {
    throw new Error(EIdentityMessages.IDENTITY_NOT_FOUND);
  }
  let validation: IApiKeyValidationResult;
  try {
    validation = await deps.providerClient.validateApiKey(providerName, apiKey);
  } catch (error) {
    if (error instanceof Error && error.message === EProviderMessages.INVALID_API_KEY) {
      throw new Error(EIdentityMessages.INVALID_API_KEY);
    }
    throw new Error(EIdentityMessages.API_KEY_VALIDATION_FAILED, { cause: error });
  }
  const existing = await deps.db
    .select({ id: schema.connection.id })
    .from(schema.connection)
    .where(
      and(
        eq(schema.connection.identityId, identityId),
        eq(schema.connection.provider, providerName),
      ),
    );
  if (existing.length > 0) {
    throw new Error(EIdentityMessages.CONNECTION_EXISTS);
  }
  const now = dayjs().toISOString();
  const id = randomUUID();
  await deps.db.insert(schema.connection).values({
    id,
    identityId,
    provider: providerName,
    authKind: EIdentityAuthKind.API_KEY,
    status: EConnectionStatus.ACTIVE,
    scopes: null,
    refreshTokenEnc: null,
    apiKeyEnc: encryptSecret(deps.encryptionKey, apiKey),
    accessTokenExpiresAt: null,
    providerAccountId: validation.accountId,
    providerAccountEmail: validation.accountEmail,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id,
    provider: providerName,
    authKind: EIdentityAuthKind.API_KEY,
    status: EConnectionStatus.ACTIVE,
    scopes: null,
    providerAccountId: validation.accountId,
    providerAccountEmail: validation.accountEmail,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteIdentity(
  deps: Pick<IIdentityDeps, "db">,
  userId: string,
  identityId: string,
): Promise<boolean> {
  const removed = await deps.db
    .delete(schema.identity)
    .where(and(eq(schema.identity.id, identityId), eq(schema.identity.userId, userId)))
    .returning({ id: schema.identity.id });
  return removed.length > 0;
}

export async function deleteConnection(
  deps: Pick<IIdentityDeps, "db">,
  userId: string,
  connectionId: string,
): Promise<boolean> {
  const owned = await deps.db
    .select({ id: schema.connection.id })
    .from(schema.connection)
    .innerJoin(schema.identity, eq(schema.connection.identityId, schema.identity.id))
    .where(and(eq(schema.connection.id, connectionId), eq(schema.identity.userId, userId)));
  if (owned.length === 0) {
    return false;
  }
  await deps.db.delete(schema.connection).where(eq(schema.connection.id, connectionId));
  return true;
}
