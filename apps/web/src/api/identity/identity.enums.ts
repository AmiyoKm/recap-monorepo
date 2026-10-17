export enum EProvider {
  GOOGLE = "google",
  JIRA = "jira",
  LINEAR = "linear",
  SLACK = "slack",
  GITHUB = "github",
}

export enum EGoogleSource {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  DRIVE = "drive",
  CHAT = "chat",
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
