import {
  EConnectionStatus,
  EGoogleSource,
  EIdentityConnectError,
  EProvider,
} from "@/api/identity/identity.enums";

export const CONNECTION_STATUS_LABELS: Record<EConnectionStatus, string> = {
  [EConnectionStatus.ACTIVE]: "Active",
  [EConnectionStatus.NEEDS_RECONNECT]: "Needs reconnect",
};
export const CONNECTION_PROVIDER_LABELS: Record<EProvider, string> = {
  [EProvider.GOOGLE]: "Google",
  [EProvider.JIRA]: "Jira",
  [EProvider.LINEAR]: "Linear",
  [EProvider.SLACK]: "Slack",
  [EProvider.GITHUB]: "GitHub",
};
export const GOOGLE_SOURCE_LABELS: Record<EGoogleSource, string> = {
  [EGoogleSource.CALENDAR]: "Calendar",
  [EGoogleSource.GMAIL]: "Gmail",
  [EGoogleSource.DRIVE]: "Drive",
  [EGoogleSource.CHAT]: "Chat",
};
export const GOOGLE_SOURCE_SEPARATOR = ",";
export const IDENTITY_SYNC_CHANNEL = "recap-identity-sync";
export const IDENTITY_CONSENT_POLL_MS = 3000;
export const IDENTITY_CONNECTED = "identity";
export const IDENTITY_CONNECTED_TITLE = "Google account added";
export const IDENTITY_CONNECTED_SUFFIX = "connected";
export const IDENTITY_CONNECT_UNKNOWN_ERROR = "Something went wrong. Start again.";
export const IDENTITY_CONNECT_ERROR_MESSAGES: Record<EIdentityConnectError, string> = {
  [EIdentityConnectError.EXPIRED]: "The consent link expired. Start again to get a new link.",
  [EIdentityConnectError.ALREADY_CONNECTED]:
    "This account is already connected. Disconnect it first to connect again.",
  [EIdentityConnectError.SUB_MISMATCH]:
    "This Google account does not match the work account. Give consent with the matching Google account.",
  [EIdentityConnectError.ACCESS_DENIED]: "Consent was cancelled. Start again to connect.",
  [EIdentityConnectError.SCOPE_DENIED]:
    "Recap needs one or more Google sources. Start again and allow at least one.",
  [EIdentityConnectError.FAILED]: "Consent did not complete. Try again.",
};
