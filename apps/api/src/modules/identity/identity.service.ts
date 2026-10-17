import { randomUUID } from "node:crypto";

import { status } from "elysia";

import {
  GOOGLE_ACCOUNT_SCOPES,
  GOOGLE_SOURCE_SEPARATOR,
  IDENTITY_CONNECTED,
} from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityConnectError,
  EIdentityMessages,
  type EOAuthCallback,
} from "#api/modules/identity/identity.enums";
import {
  buildIdentityRow,
  buildOAuthConnectionRow,
  buildPendingGrantRow,
  connectionTokenKey,
  createGrantState,
  grantCallback,
  isWiredProvider,
  parsePendingGrant,
  readRequestedSources,
  requireCodeVerifier,
  toIdentityView,
  toProvider,
} from "#api/modules/identity/identity.helpers";
import type {
  IConnectionGrant,
  IConnectionTarget,
  IGoogleConnectionSave,
  IGrantVerifier,
  IIdentityCreateGrant,
  IProviderConnectionSave,
  IProviderSlot,
} from "#api/modules/identity/identity.interfaces";
import { IdentityRepository } from "#api/modules/identity/identity.repository";
import type {
  TAuthorizeResponse,
  TConnectBadRequestError,
  TConnectConnectionBody,
  TConnectionNotFoundError,
  TConnectionRow,
  TDeleteResponse,
  TGrantRequest,
  TIdentityNotFoundError,
  TIdentityResponse,
  TIdentityRow,
  TOAuthCallbackQuery,
  TPendingGrant,
} from "#api/modules/identity/identity.types";
import { CacheService } from "#api/shared/cache/cache.service";
import { decryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { ENV } from "#api/shared/env/env.constants";
import { logError } from "#api/shared/logger/logger.helpers";
import type { EGoogleSource } from "#api/shared/providers/google/google.enums";
import {
  deniedSources,
  grantedSources,
  sourceScopes,
} from "#api/shared/providers/google/google.helpers";
import type { IGoogleGrant } from "#api/shared/providers/google/google.interfaces";
import { providers } from "#api/shared/providers/providers.client";
import { EProvider } from "#api/shared/providers/providers.enums";
import type {
  IProviderAuthorization,
  IProviderTokens,
} from "#api/shared/providers/providers.interfaces";
import { ROUTES } from "#api/shared/routes/routes.constants";

export abstract class IdentityService {
  static async listIdentities(userId: string): Promise<TIdentityResponse[]> {
    const identities = await IdentityRepository.listIdentities(userId);
    if (identities.length === 0) {
      return [];
    }
    const connections = await IdentityRepository.listConnections(identities.map((row) => row.id));
    return identities.map((row) => toIdentityView(row, connections));
  }

  static async startIdentityConnect(userId: string): Promise<TAuthorizeResponse> {
    const state = createGrantState();
    const authorization = await providers.google.createAuthorization({
      state,
      redirectUri: ROUTES.API.GOOGLE_CALLBACK_URL(),
      scopes: GOOGLE_ACCOUNT_SCOPES,
    });
    return IdentityService.storeGrant(
      state,
      { userId, purpose: EGrantPurpose.IDENTITY_CREATE },
      authorization,
    );
  }

  static async startConnection(
    userId: string,
    identityId: string,
    body: TConnectConnectionBody,
  ): Promise<TAuthorizeResponse> {
    await IdentityService.requireOwnedIdentity(userId, identityId);
    const provider = toProvider(body.provider);
    if (!(provider && isWiredProvider(provider))) {
      throw IdentityService.unsupportedProvider();
    }
    const sources = readRequestedSources(provider, body.sources);
    if (!sources) {
      throw status("Bad Request", {
        message: EIdentityMessages.SOURCES_INVALID,
      } satisfies TConnectBadRequestError);
    }
    const state = createGrantState();
    const authorization = await IdentityService.createAuthorization(provider, state, sources);
    return IdentityService.storeGrant(
      state,
      { userId, purpose: EGrantPurpose.CONNECTION, identityId, provider, sources },
      authorization,
    );
  }

  static async completeCallback(
    callback: EOAuthCallback,
    query: TOAuthCallbackQuery,
  ): Promise<string> {
    const stored = await IdentityRepository.takePendingGrant({
      state: query.state,
      now: dayjs().toISOString(),
    });
    if (!stored) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.EXPIRED });
    }
    const grant = parsePendingGrant(stored);
    if (!grant || grantCallback(grant) !== callback) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
    const { code } = query;
    if (!code) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ACCESS_DENIED });
    }
    try {
      return await IdentityService.completeGrant(grant, code);
    } catch (error) {
      logError(EIdentityConnectError.FAILED, error);
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
  }

  static async deleteExpiredPendingGrants(): Promise<void> {
    await IdentityRepository.deleteExpiredPendingGrants(dayjs().toISOString());
  }

  static async deleteIdentity(userId: string, identityId: string): Promise<TDeleteResponse> {
    await IdentityService.requireOwnedIdentity(userId, identityId);
    const connections = await IdentityRepository.listConnections([identityId]);
    await IdentityService.revokeGoogleAccess(connections);
    await IdentityService.deleteConnectionTokens(connections.map((connection) => connection.id));
    await IdentityRepository.deleteIdentityRow(identityId);
    return { deleted: true };
  }

  static async deleteConnection(userId: string, connectionId: string): Promise<TDeleteResponse> {
    const connection = await IdentityRepository.findOwnedConnection(userId, connectionId);
    if (!connection) {
      throw status("Not Found", {
        message: EIdentityMessages.CONNECTION_NOT_FOUND,
      } satisfies TConnectionNotFoundError);
    }
    await IdentityService.revokeGoogleAccess([connection]);
    await IdentityService.deleteConnectionTokens([connectionId]);
    await IdentityRepository.deleteConnectionRow(connectionId);
    return { deleted: true };
  }

  private static createAuthorization(
    provider: EProvider,
    state: string,
    sources: EGoogleSource[],
  ): Promise<IProviderAuthorization> {
    switch (provider) {
      case EProvider.GOOGLE:
        return providers.google.createAuthorization({
          state,
          redirectUri: ROUTES.API.GOOGLE_CALLBACK_URL(),
          scopes: [...GOOGLE_ACCOUNT_SCOPES, ...sourceScopes(sources)],
        });
      case EProvider.JIRA:
        return Promise.resolve(
          providers.jira.createAuthorization({
            state,
            redirectUri: ROUTES.API.JIRA_CALLBACK_URL(),
          }),
        );
      case EProvider.LINEAR:
        return Promise.resolve(
          providers.linear.createAuthorization({
            state,
            redirectUri: ROUTES.API.LINEAR_CALLBACK_URL(),
          }),
        );
      case EProvider.SLACK:
      case EProvider.GITHUB:
        throw IdentityService.unsupportedProvider();
    }
  }

  private static unsupportedProvider() {
    return status("Bad Request", {
      message: EIdentityMessages.PROVIDER_UNSUPPORTED,
    } satisfies TConnectBadRequestError);
  }

  private static async storeGrant(
    state: string,
    request: TGrantRequest,
    authorization: IProviderAuthorization,
  ): Promise<TAuthorizeResponse> {
    await IdentityRepository.storePendingGrant(
      buildPendingGrantRow(state, { ...request, codeVerifier: authorization.codeVerifier }),
    );
    return { authorizeUrl: authorization.authorizeUrl };
  }

  private static completeGrant(grant: TPendingGrant, code: string): Promise<string> {
    switch (grant.purpose) {
      case EGrantPurpose.IDENTITY_CREATE:
        return IdentityService.completeIdentityCreate(grant, code);
      case EGrantPurpose.CONNECTION:
        return IdentityService.completeConnection(grant, code);
    }
  }

  private static async completeIdentityCreate(
    grant: IIdentityCreateGrant & IGrantVerifier,
    code: string,
  ): Promise<string> {
    const { profile } = await IdentityService.exchangeGoogleCode(grant, code);
    const existing = await IdentityRepository.findIdentityBySub(grant.userId, profile.sub);
    if (existing) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    const inserted = await IdentityRepository.insertIdentity(
      buildIdentityRow(randomUUID(), grant.userId, profile),
    );
    if (!inserted) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    return ROUTES.WEB.CONNECT_RESULT({
      connected: IDENTITY_CONNECTED,
      email: profile.email,
    });
  }

  private static async completeConnection(
    grant: IConnectionGrant & IGrantVerifier,
    code: string,
  ): Promise<string> {
    const identity = await IdentityRepository.findOwnedIdentity(grant.userId, grant.identityId);
    if (!identity) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
    const slot = await IdentityService.findProviderSlot(identity.id, grant.provider);
    if (slot.isTaken) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    return IdentityService.connectProvider(
      { identity, provider: grant.provider, staleConnectionId: slot.staleConnectionId },
      grant,
      code,
    );
  }

  private static async connectProvider(
    target: IConnectionTarget,
    grant: IConnectionGrant & IGrantVerifier,
    code: string,
  ): Promise<string> {
    switch (target.provider) {
      case EProvider.GOOGLE:
        return IdentityService.saveGoogleConnection({
          ...target,
          requestedSources: grant.sources,
          grant: await IdentityService.exchangeGoogleCode(grant, code),
        });
      case EProvider.JIRA:
        return IdentityService.saveConnection({
          ...target,
          grant: await providers.jira.exchangeCode({
            code,
            redirectUri: ROUTES.API.JIRA_CALLBACK_URL(),
          }),
        });
      case EProvider.LINEAR:
        return IdentityService.saveConnection({
          ...target,
          grant: await providers.linear.exchangeCode({
            code,
            codeVerifier: requireCodeVerifier(grant.codeVerifier),
            redirectUri: ROUTES.API.LINEAR_CALLBACK_URL(),
          }),
        });
      case EProvider.SLACK:
      case EProvider.GITHUB:
        return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
  }

  private static async findProviderSlot(
    identityId: string,
    provider: EProvider,
  ): Promise<IProviderSlot> {
    const existing = await IdentityRepository.findConnection(identityId, provider);
    if (!existing) {
      return { isTaken: false, staleConnectionId: undefined };
    }
    if (existing.status !== EConnectionStatus.NEEDS_RECONNECT && provider !== EProvider.GOOGLE) {
      return { isTaken: true, staleConnectionId: undefined };
    }
    return { isTaken: false, staleConnectionId: existing.id };
  }

  private static async saveGoogleConnection({
    grant: { tokens, profile },
    requestedSources,
    ...target
  }: IGoogleConnectionSave): Promise<string> {
    if (profile.sub !== target.identity.googleSub) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.SUB_MISMATCH });
    }
    const granted = grantedSources(tokens.scopes);
    if (granted.length === 0) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.SCOPE_DENIED });
    }
    const denied = deniedSources({ requested: requestedSources, granted });
    return await IdentityService.saveConnection(
      {
        ...target,
        grant: {
          tokens,
          account: { accountId: profile.sub, accountEmail: profile.email },
          site: null,
          resourceId: null,
        },
      },
      { denied: denied.join(GOOGLE_SOURCE_SEPARATOR) },
    );
  }

  private static async saveConnection(
    {
      identity,
      provider,
      grant: { tokens, account, site, resourceId },
      staleConnectionId,
    }: IProviderConnectionSave,
    resultQuery: Record<string, string> = {},
  ): Promise<string> {
    if (tokens.refreshToken === undefined) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
    const row = buildOAuthConnectionRow({
      id: staleConnectionId ?? randomUUID(),
      identityId: identity.id,
      provider,
      refreshToken: tokens.refreshToken,
      tokens,
      account,
      site,
      resourceId,
    });
    const saved = await IdentityService.replaceConnection(row, staleConnectionId);
    if (!saved) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    await IdentityService.runCacheTask(IdentityService.cacheConnectionToken(row.id, tokens));
    return ROUTES.WEB.CONNECT_RESULT({
      connected: provider,
      email: account.accountEmail,
      ...resultQuery,
    });
  }

  private static async replaceConnection(
    row: TConnectionRow,
    staleConnectionId: string | undefined,
  ): Promise<boolean> {
    const saved = await IdentityRepository.replaceConnection(row, staleConnectionId);
    if (!(saved && staleConnectionId)) {
      return saved;
    }
    await IdentityService.runCacheTask(IdentityService.deleteConnectionTokens([staleConnectionId]));
    return true;
  }

  private static exchangeGoogleCode(grant: IGrantVerifier, code: string): Promise<IGoogleGrant> {
    return providers.google.exchangeCode({
      code,
      codeVerifier: requireCodeVerifier(grant.codeVerifier),
      redirectUri: ROUTES.API.GOOGLE_CALLBACK_URL(),
    });
  }

  private static async requireOwnedIdentity(
    userId: string,
    identityId: string,
  ): Promise<TIdentityRow> {
    const identity = await IdentityRepository.findOwnedIdentity(userId, identityId);
    if (!identity) {
      throw status("Not Found", {
        message: EIdentityMessages.IDENTITY_NOT_FOUND,
      } satisfies TIdentityNotFoundError);
    }
    return identity;
  }

  private static async runCacheTask(task: Promise<void>): Promise<void> {
    try {
      await task;
    } catch (error) {
      logError(EIdentityMessages.CONNECTION_CACHE_FAILED, error);
    }
  }

  private static async cacheConnectionToken(
    connectionId: string,
    tokens: IProviderTokens,
  ): Promise<void> {
    if (tokens.expiresInSeconds === undefined || tokens.expiresInSeconds <= 0) {
      return;
    }
    await CacheService.put({
      key: connectionTokenKey(connectionId),
      value: tokens.accessToken,
      ttlSeconds: tokens.expiresInSeconds,
    });
  }

  private static async revokeGoogleAccess(connections: TConnectionRow[]): Promise<void> {
    const google = connections.find((connection) => connection.provider === EProvider.GOOGLE);
    if (!google) {
      return;
    }
    try {
      await providers.google.revokeToken(
        decryptSecret(ENV.connectionEncryptionKey, google.refreshTokenEnc),
      );
    } catch (error) {
      logError(EIdentityMessages.GOOGLE_REVOKE_FAILED, error);
      return;
    }
    await IdentityService.markSharedGoogleGrantRevoked(google);
  }

  private static async markSharedGoogleGrantRevoked(revoked: TConnectionRow): Promise<void> {
    if (!revoked.providerAccountId) {
      return;
    }
    const connectionIds = await IdentityRepository.markSharedAccountNeedsReconnect({
      provider: EProvider.GOOGLE,
      providerAccountId: revoked.providerAccountId,
      revokedConnectionId: revoked.id,
    });
    await IdentityService.runCacheTask(IdentityService.deleteConnectionTokens(connectionIds));
  }

  private static async deleteConnectionTokens(connectionIds: string[]): Promise<void> {
    if (connectionIds.length === 0) {
      return;
    }
    await CacheService.delete(connectionIds.map((id) => connectionTokenKey(id)));
  }
}
