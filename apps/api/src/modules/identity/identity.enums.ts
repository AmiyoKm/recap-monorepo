export enum EConnectionStatus {
  ACTIVE = "active",
  NEEDS_RECONNECT = "needs_reconnect",
}

export enum EGrantPurpose {
  IDENTITY_CREATE = "identity-create",
  CONNECTION = "connection",
}

export enum EIdentityMessages {
  IDENTITY_NOT_FOUND = "Work Identity was not found",
  CONNECTION_NOT_FOUND = "Connection was not found",
  PROVIDER_UNSUPPORTED = "That provider cannot be connected yet",
  SOURCES_INVALID = "Google needs one or more different Sources, and other providers take none",
  GOOGLE_REVOKE_FAILED = "Google token revoke failed",
  CODE_VERIFIER_MISSING = "Pending grant has no code verifier",
  UNKNOWN_CONNECTION_VALUE = "Connection row holds an unknown value",
  CONNECTION_CACHE_FAILED = "Connection token cache update failed",
}

export enum EIdentityConnectError {
  EXPIRED = "expired",
  ALREADY_CONNECTED = "already_connected",
  SUB_MISMATCH = "sub_mismatch",
  ACCESS_DENIED = "access_denied",
  SCOPE_DENIED = "scope_denied",
  FAILED = "failed",
}

export enum EOAuthCallback {
  GOOGLE = "google",
  JIRA = "jira",
  LINEAR = "linear",
}

export enum EIdentityCacheKeyPrefix {
  CONNECTION_TOKEN = "connection-token:",
}
