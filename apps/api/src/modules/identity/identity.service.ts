import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { schema } from "@recap/db";

import {
  GOOGLE_CALLBACK_PATH,
  IDENTITY_CREATE_SCOPES,
  PENDING_GRANT_TTL_SECONDS,
} from "#api/modules/identity/identity.constants";
import { EGrantPurpose, EIdentityConnectError } from "#api/modules/identity/identity.enums";
import {
  createGrantState,
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
import { dayjs } from "#api/shared/date/date.helpers";
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
  const state = createGrantState();
  const grant = JSON.stringify({ userId, purpose: EGrantPurpose.IDENTITY_CREATE });
  await deps.redis.send(ERedisCommand.SET, [
    pendingGrantKey(deps.redisKeyPrefix, state),
    grant,
    ERedisSetOption.EXPIRE_IN_SECONDS,
    String(PENDING_GRANT_TTL_SECONDS),
  ]);
  const authorizeUrl = deps.providerClient.buildAuthorizeUrl({
    state,
    redirectUri: `${deps.callbackBaseUrl}${GOOGLE_CALLBACK_PATH}`,
    scopes: IDENTITY_CREATE_SCOPES,
  });
  return { authorizeUrl };
}

function settingsSuccessUrl(webOrigin: string, email: string): string {
  return `${webOrigin}/settings?connected=google&email=${encodeURIComponent(email)}`;
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
    return { redirectUrl: settingsSuccessUrl(deps.webOrigin, profile.email) };
  } catch (error) {
    console.error(EIdentityConnectError.FAILED, error);
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.FAILED) };
  }
}

export async function completeGoogleCallback(
  deps: Pick<
    IIdentityDeps,
    "db" | "redis" | "redisKeyPrefix" | "webOrigin" | "callbackBaseUrl" | "providerClient"
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
  if (grant.purpose !== EGrantPurpose.IDENTITY_CREATE) {
    return { redirectUrl: settingsErrorUrl(deps.webOrigin, EIdentityConnectError.UNSUPPORTED) };
  }
  return completeIdentityCreate(deps, grant, input.code);
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
