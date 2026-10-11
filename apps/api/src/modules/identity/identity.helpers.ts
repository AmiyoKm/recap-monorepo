import { randomBytes } from "node:crypto";

import {
  GRANT_STATE_BYTES,
  PENDING_GRANT_KEY_PREFIX,
} from "#api/modules/identity/identity.constants";
import { EGrantPurpose } from "#api/modules/identity/identity.enums";
import type { IPendingGrant } from "#api/modules/identity/identity.interfaces";
import { toStringRecord } from "#api/shared/json/json.helpers";

export function createGrantState(): string {
  return randomBytes(GRANT_STATE_BYTES).toString("base64url");
}

export function pendingGrantKey(keyPrefix: string, state: string): string {
  return `${keyPrefix}${PENDING_GRANT_KEY_PREFIX}${state}`;
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
  return { userId, purpose, identityId };
}
