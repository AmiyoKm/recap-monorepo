export enum EPullMessages {
  MESSAGE_INVALID = "Pull queue message has no connection id",
  TOKEN_CACHE_FAILED = "Connection token cache update failed",
  PULL_FAILED = "Connection pull failed",
  CACHED_TOKEN_REJECTED = "Provider rejected the cached access token",
  PROVIDER_UNSUPPORTED = "No pull reader exists for this provider",
  SOURCE_UNSUPPORTED = "No pull reader exists for this Source",
  CREDENTIALS_REJECTED = "Provider rejected the credentials",
}

export enum EPullMessageKey {
  CONNECTION_ID = "connectionId",
}

export enum ECalendarCursorKey {
  SYNC_TOKEN = "syncToken",
  PAGE_TOKEN = "pageToken",
  TIME_MIN = "timeMin",
  TIME_MAX = "timeMax",
  STARTED_AT = "startedAt",
}

export enum EPullOutcome {
  COMPLETE = "complete",
  MORE_PAGES = "more_pages",
  REJECTED = "rejected",
}

export enum EGmailCursorKey {
  HISTORY_ID = "historyId",
  LABEL = "label",
  PAGE_TOKEN = "pageToken",
  CUTOFF = "cutoff",
}
