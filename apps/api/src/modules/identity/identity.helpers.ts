import { randomBytes } from "node:crypto";

import {
  CONNECTION_TOKEN_KEY_PREFIX,
  GRANT_STATE_BYTES,
  HTTP_BAD_GATEWAY_STATUS,
  HTTP_BAD_REQUEST_STATUS,
  HTTP_CONFLICT_STATUS,
  HTTP_NOT_FOUND_STATUS,
  PENDING_GRANT_KEY_PREFIX,
} from "#api/modules/identity/identity.constants";
import { EGrantPurpose, EIdentityMessages } from "#api/modules/identity/identity.enums";
import type {
  IApiKeyConnectFailure,
  IPendingGrant,
  IProviderRegistration,
} from "#api/modules/identity/identity.interfaces";
import { toStringRecord } from "#api/shared/json/json.helpers";

export function createGrantState(): string {
  return randomBytes(GRANT_STATE_BYTES).toString("base64url");
}

export function pendingGrantKey(keyPrefix: string, state: string): string {
  return `${keyPrefix}${PENDING_GRANT_KEY_PREFIX}${state}`;
}

export function connectionTokenKey(keyPrefix: string, connectionId: string): string {
  return `${keyPrefix}${CONNECTION_TOKEN_KEY_PREFIX}${connectionId}`;
}

export function findProviderRegistration(
  registry: Record<string, IProviderRegistration>,
  provider: string,
): IProviderRegistration | undefined {
  for (const [name, registration] of Object.entries(registry)) {
    if (name === provider) {
      return registration;
    }
  }
  return undefined;
}

export function parsePendingGrant(stored: string): IPendingGrant | null {
  const parsed: unknown = JSON.parse(stored);
  const record = toStringRecord(parsed);
  if (!record) {
    return null;
  }
  const userId = record["userId"];
  const purpose = record["purpose"];
  if (typeof userId !== "string" || typeof purpose !== "string") {
    return null;
  }
  if (purpose !== EGrantPurpose.IDENTITY_CREATE && purpose !== EGrantPurpose.CONNECTION) {
    return null;
  }
  const identityId = record["identityId"];
  if (identityId !== undefined && typeof identityId !== "string") {
    return null;
  }
  const provider = record["provider"];
  if (provider !== undefined && typeof provider !== "string") {
    return null;
  }
  return { userId, purpose, identityId, provider };
}

export function apiKeyConnectFailure(error: unknown): IApiKeyConnectFailure | null {
  if (!(error instanceof Error)) {
    return null;
  }
  if (error.message === EIdentityMessages.IDENTITY_NOT_FOUND) {
    return { code: HTTP_NOT_FOUND_STATUS, message: error.message };
  }
  if (error.message === EIdentityMessages.INVALID_API_KEY) {
    return { code: HTTP_BAD_REQUEST_STATUS, message: error.message };
  }
  if (error.message === EIdentityMessages.CONNECTION_EXISTS) {
    return { code: HTTP_CONFLICT_STATUS, message: error.message };
  }
  if (error.message === EIdentityMessages.API_KEY_VALIDATION_FAILED) {
    return { code: HTTP_BAD_GATEWAY_STATUS, message: error.message };
  }
  return null;
}
