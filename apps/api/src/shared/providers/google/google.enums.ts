export enum EGoogleOAuthValue {
  OFFLINE_ACCESS_TYPE = "offline",
  CONSENT_PROMPT = "consent",
}

export enum EGoogleOAuthError {
  INVALID_TOKEN = "invalid_token",
}

export enum EGoogleMessages {
  ID_TOKEN_MISSING = "Google token response has no id token",
  INVALID_PROFILE = "Google id token has no subject or email",
}

export enum EGoogleSource {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  DRIVE = "drive",
  CHAT = "chat",
}
