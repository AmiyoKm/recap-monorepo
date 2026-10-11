export enum EProvider {
  GOOGLE_CALENDAR = "google-calendar",
  JIRA = "jira",
  LINEAR = "linear",
  SLACK = "slack",
  GOOGLE_CHAT = "google-chat",
  GITHUB = "github",
}

export enum EConnectionStatus {
  ACTIVE = "active",
  NEEDS_RECONNECT = "needs_reconnect",
}

export enum EIdentityConnectError {
  EXPIRED = "expired",
  ALREADY_CONNECTED = "already_connected",
  SUB_MISMATCH = "sub_mismatch",
  ACCESS_DENIED = "access_denied",
  SCOPE_DENIED = "scope_denied",
  FAILED = "failed",
}

export enum EConsentTarget {
  IDENTITY = "identity",
  CONNECTION = "connection",
}
