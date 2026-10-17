export enum EGoogleOAuthValue {
  OFFLINE_ACCESS_TYPE = "offline",
  CONSENT_PROMPT = "consent",
}

export enum EGoogleOAuthError {
  INVALID_TOKEN = "invalid_token",
  INVALID_GRANT = "invalid_grant",
}

export enum EGoogleMessages {
  ID_TOKEN_MISSING = "Google token response has no id token",
  INVALID_PROFILE = "Google id token has no subject or email",
  ACCESS_TOKEN_MISSING = "Google token refresh returned no access token",
}

export enum EGoogleSource {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  DRIVE = "drive",
  CHAT = "chat",
}

export enum EGmailLabel {
  INBOX = "INBOX",
  SENT = "SENT",
  SPAM = "SPAM",
  TRASH = "TRASH",
  CATEGORY_PROMOTIONS = "CATEGORY_PROMOTIONS",
  CATEGORY_SOCIAL = "CATEGORY_SOCIAL",
}

export enum EGmailHeader {
  SUBJECT = "Subject",
  FROM = "From",
  TO = "To",
  CC = "Cc",
}

export enum EGmailFormat {
  METADATA = "metadata",
}

export enum EGmailHistoryType {
  MESSAGE_ADDED = "messageAdded",
}

export enum EGoogleUrlParam {
  AUTHUSER = "authuser",
}

export enum EGoogleChatSpaceType {
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
}
