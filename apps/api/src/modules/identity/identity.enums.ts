export enum EIdentityProvider {
  GOOGLE_CALENDAR = "google-calendar",
  JIRA = "jira",
  LINEAR = "linear",
  SLACK = "slack",
  GOOGLE_CHAT = "google-chat",
  GITHUB = "github",
}

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
  INVALID_API_KEY = "API key is invalid",
  CONNECTION_EXISTS = "Connection already exists for this provider",
  API_KEY_VALIDATION_FAILED = "Provider check failed, try again",
}

export enum EIdentityConnectError {
  EXPIRED = "expired",
  ALREADY_CONNECTED = "already_connected",
  FAILED = "failed",
  UNSUPPORTED = "unsupported",
}
