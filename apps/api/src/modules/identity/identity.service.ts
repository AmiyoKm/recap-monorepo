import { randomUUID } from "node:crypto";

import { status } from "elysia";

import {
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_IDENTITY_CONNECTED,
  IDENTITY_CREATE_SCOPES,
  PENDING_GRANT_TTL_SECONDS,
} from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityAuthKind,
  EIdentityConnectError,
  EIdentityMessages,
} from "#api/modules/identity/identity.enums";
import {
  apiKeySite,
  buildApiKeyConnectionRow,
  buildIdentityRow,
  buildOAuthConnectionRow,
  connectionTokenKey,
  createGrantState,
  hasCalendarScope,
  isWiredProvider,
  parsePendingGrant,
  pendingGrantKey,
  toConnectionView,
  toIdentityView,
} from "#api/modules/identity/identity.helpers";
import type {
  IApiKeyConnectInput,
  IConnectionGrant,
  IGrantVerifier,
  IIdentityCreateGrant,
  IOAuthConnectionSave,
  IProviderSlot,
} from "#api/modules/identity/identity.interfaces";
import { IdentityRepository } from "#api/modules/identity/identity.repository";
import type {
  TApiKey,
  TApiKeyValidationError,
  TAuthorizeResponse,
  TConnectBadRequestError,
  TConnectConnectionBody,
  TConnectionExistsError,
  TConnectionNotFoundError,
  TConnectionResponse,
  TConnectionRow,
  TDeleteResponse,
  TGoogleCallbackQuery,
  TGrantRequest,
  TIdentityNotFoundError,
  TIdentityResponse,
  TIdentityRow,
  TPendingGrant,
} from "#api/modules/identity/identity.types";
import { logError } from "#api/shared/logger/logger.helpers";
import type { IGoogleGrant, IGoogleTokens } from "#api/shared/providers/google/google.interfaces";
import { providers } from "#api/shared/providers/providers.client";
import { EProvider } from "#api/shared/providers/providers.enums";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";
import { redis } from "#api/shared/redis/redis.client";
import { ERedisCommand, ERedisSetOption } from "#api/shared/redis/redis.enums";
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

  static startIdentityConnect(userId: string): Promise<TAuthorizeResponse> {
    return IdentityService.authorize(
      { userId, purpose: EGrantPurpose.IDENTITY_CREATE },
      IDENTITY_CREATE_SCOPES,
    );
  }

  static connect(
    userId: string,
    identityId: string,
    body: TConnectConnectionBody,
  ): Promise<TAuthorizeResponse | TConnectionResponse> {
    const { apiKey } = body;
    if (apiKey === undefined) {
      return IdentityService.startConnection(userId, identityId, body.provider);
    }
    return IdentityService.connectApiKey(userId, identityId, {
      provider: body.provider,
      apiKey,
      email: body.email,
      site: body.site,
    });
  }

  static async completeGoogleCallback(query: TGoogleCallbackQuery): Promise<string> {
    const stored: unknown = await redis.send(ERedisCommand.GET_AND_DELETE, [
      pendingGrantKey(query.state),
    ]);
    if (typeof stored !== "string" || stored.length === 0) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.EXPIRED });
    }
    const grant = parsePendingGrant(stored);
    if (!grant) {
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

  static async deleteIdentity(userId: string, identityId: string): Promise<TDeleteResponse> {
    await IdentityService.requireOwnedIdentity(userId, identityId);
    const connectionIds = await IdentityRepository.connectionIdsForIdentity(identityId);
    await IdentityService.deleteConnectionTokens(connectionIds);
    await IdentityRepository.deleteIdentityRow(identityId);
    return { deleted: true };
  }

  static async deleteConnection(userId: string, connectionId: string): Promise<TDeleteResponse> {
    const ownership = await IdentityRepository.findConnectionOwner(connectionId);
    if (ownership?.userId !== userId) {
      throw status("Not Found", {
        message: EIdentityMessages.CONNECTION_NOT_FOUND,
      } satisfies TConnectionNotFoundError);
    }
    await IdentityService.deleteConnectionTokens([connectionId]);
    await IdentityRepository.deleteConnectionRow(connectionId);
    return { deleted: true };
  }

  private static async startConnection(
    userId: string,
    identityId: string,
    provider: string,
  ): Promise<TAuthorizeResponse> {
    await IdentityService.requireOwnedIdentity(userId, identityId);
    if (!isWiredProvider(provider, EIdentityAuthKind.OAUTH)) {
      throw status("Bad Request", {
        message: EIdentityMessages.PROVIDER_UNSUPPORTED,
      } satisfies TConnectBadRequestError);
    }
    return IdentityService.authorize(
      { userId, purpose: EGrantPurpose.CONNECTION, identityId, provider },
      GOOGLE_CALENDAR_SCOPES,
    );
  }

  private static async connectApiKey(
    userId: string,
    identityId: string,
    input: IApiKeyConnectInput,
  ): Promise<TConnectionResponse> {
    await IdentityService.requireOwnedIdentity(userId, identityId);
    if (!isWiredProvider(input.provider, EIdentityAuthKind.API_KEY)) {
      throw status("Bad Request", {
        message: EIdentityMessages.PROVIDER_UNSUPPORTED,
      } satisfies TConnectBadRequestError);
    }
    const slot = await IdentityService.findProviderSlot(identityId, input.provider);
    if (slot.isTaken) {
      throw status("Conflict", {
        message: EIdentityMessages.CONNECTION_EXISTS,
      } satisfies TConnectionExistsError);
    }
    const apiKey = IdentityService.toApiKey(input);
    const account = await IdentityService.verifyApiKey(apiKey);
    const row = buildApiKeyConnectionRow({
      id: randomUUID(),
      identityId,
      provider: input.provider,
      apiKey: input.apiKey,
      site: apiKeySite(apiKey),
      account,
    });
    const saved = await IdentityService.saveConnection(row, slot.staleConnectionId);
    if (!saved) {
      throw status("Conflict", {
        message: EIdentityMessages.CONNECTION_EXISTS,
      } satisfies TConnectionExistsError);
    }
    return toConnectionView(row);
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
    const { profile } = await IdentityService.exchangeCode(grant, code);
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
      connected: GOOGLE_IDENTITY_CONNECTED,
      email: profile.email,
    });
  }

  private static async completeConnection(
    grant: IConnectionGrant & IGrantVerifier,
    code: string,
  ): Promise<string> {
    const { identityId, provider } = grant;
    const identity = await IdentityRepository.findOwnedIdentity(grant.userId, identityId);
    if (!identity) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
    const slot = await IdentityService.findProviderSlot(identity.id, provider);
    if (slot.isTaken) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    return IdentityService.saveOAuthConnection({
      identity,
      provider,
      grant: await IdentityService.exchangeCode(grant, code),
      staleConnectionId: slot.staleConnectionId,
    });
  }

  private static async findProviderSlot(
    identityId: string,
    provider: string,
  ): Promise<IProviderSlot> {
    const existing = await IdentityRepository.findConnection(identityId, provider);
    if (!existing) {
      return { isTaken: false, staleConnectionId: undefined };
    }
    if (existing.status !== EConnectionStatus.NEEDS_RECONNECT) {
      return { isTaken: true, staleConnectionId: undefined };
    }
    return { isTaken: false, staleConnectionId: existing.id };
  }

  private static async saveConnection(
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

  private static async saveOAuthConnection({
    identity,
    provider,
    grant: { tokens, profile },
    staleConnectionId,
  }: IOAuthConnectionSave): Promise<string> {
    if (profile.sub !== identity.googleSub) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.SUB_MISMATCH });
    }
    if (tokens.refreshToken === undefined) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.FAILED });
    }
    if (!hasCalendarScope(tokens.scopes)) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.SCOPE_DENIED });
    }
    const row = buildOAuthConnectionRow({
      id: randomUUID(),
      identityId: identity.id,
      provider,
      refreshToken: tokens.refreshToken,
      expiresInSeconds: tokens.expiresInSeconds,
      scopes: tokens.scopes,
      profile,
    });
    const saved = await IdentityService.saveConnection(row, staleConnectionId);
    if (!saved) {
      return ROUTES.WEB.CONNECT_RESULT({ error: EIdentityConnectError.ALREADY_CONNECTED });
    }
    await IdentityService.runCacheTask(IdentityService.cacheConnectionToken(row.id, tokens));
    return ROUTES.WEB.CONNECT_RESULT({ connected: provider, email: profile.email });
  }

  private static exchangeCode(grant: TPendingGrant, code: string): Promise<IGoogleGrant> {
    return providers.google.exchangeCode({
      code,
      codeVerifier: grant.codeVerifier,
      redirectUri: ROUTES.API.GOOGLE_CALLBACK_URL(),
    });
  }

  private static toApiKey(input: IApiKeyConnectInput): TApiKey {
    if (input.provider === EProvider.LINEAR) {
      return { provider: EProvider.LINEAR, apiKey: input.apiKey };
    }
    const { email, site } = input;
    if (input.provider !== EProvider.JIRA || !(email && site)) {
      throw status("Bad Request", {
        message: EIdentityMessages.JIRA_DETAILS_REQUIRED,
      } satisfies TConnectBadRequestError);
    }
    return { provider: EProvider.JIRA, credentials: { site, email, apiToken: input.apiKey } };
  }

  private static async verifyApiKey(apiKey: TApiKey): Promise<IProviderAccount> {
    const account = await IdentityService.requestProviderAccount(apiKey);
    if (!account) {
      throw status("Bad Request", {
        message: EIdentityMessages.INVALID_API_KEY,
      } satisfies TConnectBadRequestError);
    }
    return account;
  }

  private static async requestProviderAccount(apiKey: TApiKey): Promise<IProviderAccount | null> {
    try {
      return await IdentityService.verifyWithProvider(apiKey);
    } catch (error) {
      logError(EIdentityMessages.API_KEY_VALIDATION_FAILED, error);
      throw status("Bad Gateway", {
        message: EIdentityMessages.API_KEY_VALIDATION_FAILED,
      } satisfies TApiKeyValidationError);
    }
  }

  private static verifyWithProvider(apiKey: TApiKey): Promise<IProviderAccount | null> {
    switch (apiKey.provider) {
      case EProvider.JIRA:
        return providers.jira.verifyApiKey(apiKey.credentials);
      case EProvider.LINEAR:
        return providers.linear.verifyApiKey(apiKey.apiKey);
    }
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

  private static async authorize(
    request: TGrantRequest,
    scopes: string[],
  ): Promise<TAuthorizeResponse> {
    const state = createGrantState();
    const { authorizeUrl, codeVerifier } = await providers.google.createAuthorization({
      state,
      redirectUri: ROUTES.API.GOOGLE_CALLBACK_URL(),
      scopes,
    });
    await IdentityService.storePendingGrant(state, { ...request, codeVerifier });
    return { authorizeUrl };
  }

  private static async storePendingGrant(state: string, grant: TPendingGrant): Promise<void> {
    await redis.send(ERedisCommand.SET, [
      pendingGrantKey(state),
      JSON.stringify(grant),
      ERedisSetOption.EXPIRE_IN_SECONDS,
      String(PENDING_GRANT_TTL_SECONDS),
    ]);
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
    tokens: IGoogleTokens,
  ): Promise<void> {
    if (tokens.expiresInSeconds === undefined || tokens.expiresInSeconds <= 0) {
      return;
    }
    await redis.send(ERedisCommand.SET, [
      connectionTokenKey(connectionId),
      tokens.accessToken,
      ERedisSetOption.EXPIRE_IN_SECONDS,
      String(tokens.expiresInSeconds),
    ]);
  }

  private static async deleteConnectionTokens(connectionIds: string[]): Promise<void> {
    if (connectionIds.length === 0) {
      return;
    }
    await redis.send(
      ERedisCommand.DELETE,
      connectionIds.map((id) => connectionTokenKey(id)),
    );
  }
}
