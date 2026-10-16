import { EClientMessages } from "@/api/client/client.enums";
import {
  CONNECTION_PROVIDER_LABELS,
  CONNECTION_STATUS_LABELS,
  IDENTITY_CONNECT_ERROR_MESSAGES,
  IDENTITY_CONNECT_UNKNOWN_ERROR,
  IDENTITY_CONNECTED_GOOGLE,
  IDENTITY_CONNECTED_GOOGLE_TITLE,
  IDENTITY_CONNECTED_SUFFIX,
  IDENTITY_CONSENT_POLL_MS,
  IDENTITY_SYNC_CHANNEL,
} from "@/api/identity/identity.constants";
import { EConnectionStatus, EConsentTarget, EProvider } from "@/api/identity/identity.enums";
import type { IConnectResultMessage } from "@/api/identity/identity.interfaces";
import type { TConsentTarget, TIdentitiesData } from "@/api/identity/identity.types";

export function readAuthorizeUrl(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "authorizeUrl" in data &&
    typeof data.authorizeUrl === "string"
  ) {
    return data.authorizeUrl;
  }
  throw new Error(EClientMessages.REQUEST_FAILED);
}

export function providerLabel(provider: string): string {
  for (const [name, label] of Object.entries(CONNECTION_PROVIDER_LABELS)) {
    if (name === provider) {
      return label;
    }
  }
  return provider;
}

export function statusLabel(status: string): string {
  for (const [name, label] of Object.entries(CONNECTION_STATUS_LABELS)) {
    if (name === status) {
      return label;
    }
  }
  return status;
}

export function connectErrorMessage(connectError: string): string {
  for (const [code, message] of Object.entries(IDENTITY_CONNECT_ERROR_MESSAGES)) {
    if (code === connectError) {
      return message;
    }
  }
  return IDENTITY_CONNECT_UNKNOWN_ERROR;
}

export function connectedTitle(connected: string): string {
  if (connected === IDENTITY_CONNECTED_GOOGLE) {
    return IDENTITY_CONNECTED_GOOGLE_TITLE;
  }
  return `${providerLabel(connected)} ${IDENTITY_CONNECTED_SUFFIX}`;
}

function connectionEntry(identityId: string, provider: string, status: string): string {
  return `${identityId}:${provider}:${status}`;
}

export function identitiesFingerprint(identities: TIdentitiesData | undefined): string | null {
  if (!identities) {
    return null;
  }
  return identities
    .flatMap((identity) => [
      identity.id,
      ...identity.connections.map((connection) =>
        connectionEntry(identity.id, connection.provider, connection.status),
      ),
    ])
    .join("|");
}

export function toKnownConnected(connected: string | undefined): string | undefined {
  if (connected === IDENTITY_CONNECTED_GOOGLE) {
    return connected;
  }
  return Object.values(EProvider).find((provider) => provider === connected);
}

function readString(record: object, key: string): string | undefined {
  const value: unknown = Reflect.get(record, key);
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}

export function readConnectResultMessage(data: unknown): IConnectResultMessage | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const message = {
    connected: toKnownConnected(readString(data, "connected")),
    email: readString(data, "email"),
    error: readString(data, "error"),
  };
  if (!(message.connected || message.error)) {
    return null;
  }
  return message;
}

export function publishConnectResult(message: IConnectResultMessage): void {
  if (!(message.connected || message.error)) {
    return;
  }
  const channel = new BroadcastChannel(IDENTITY_SYNC_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

function gainedEntries(before: string, after: string): string[] {
  const known = new Set(before.split("|"));
  return after.split("|").filter((entry) => entry.length > 0 && !known.has(entry));
}

export function consentCompleted(before: string, after: string, target: TConsentTarget): boolean {
  const gained = gainedEntries(before, after);
  switch (target.kind) {
    case EConsentTarget.IDENTITY:
      return gained.some((entry) => !entry.includes(":"));
    case EConsentTarget.CONNECTION:
      return gained.includes(
        connectionEntry(target.identityId, target.provider, EConnectionStatus.ACTIVE),
      );
  }
}

export function consentPollInterval(isWaitingForConsent: boolean): number | false {
  if (!isWaitingForConsent) {
    return false;
  }
  return IDENTITY_CONSENT_POLL_MS;
}
