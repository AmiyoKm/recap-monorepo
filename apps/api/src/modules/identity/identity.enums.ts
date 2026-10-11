export enum EIdentityAuthKind {
  OAUTH = "oauth",
  API_KEY = "api_key",
}

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
  INVALID_API_KEY = "API key is invalid",
  JIRA_DETAILS_REQUIRED = "Jira needs an email and site along with the API key",
  CONNECTION_EXISTS = "Connection already exists for this provider",
  API_KEY_VALIDATION_FAILED = "Provider check failed, try again",
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

export enum EIdentityRedisKeyPrefix {
  PENDING_GRANT = "pending-grant:",
  CONNECTION_TOKEN = "connection-token:",
}
