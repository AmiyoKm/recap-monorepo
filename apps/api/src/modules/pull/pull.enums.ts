export enum EPullMessages {
  MESSAGE_INVALID = "Pull queue message has no connection id",
  TOKEN_CACHE_FAILED = "Connection token cache update failed",
  PULL_FAILED = "Connection pull failed",
  CACHED_TOKEN_REJECTED = "Provider rejected the cached access token",
  PROVIDER_UNSUPPORTED = "No pull reader exists for this provider",
  CREDENTIALS_REJECTED = "Provider rejected the credentials",
  ACCOUNT_ID_MISSING = "Connection has no provider account id",
  JIRA_SITE_MISSING = "Jira connection has no site or cloud id",
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

export enum EDriveCursorKey {
  TIME_MIN = "timeMin",
  PAGE_TOKEN = "pageToken",
  STARTED_AT = "startedAt",
}

export enum EJiraCursorKey {
  SINCE = "since",
  STARTED_AT = "startedAt",
  PAGE_TOKEN = "pageToken",
  OFFSET = "offset",
}

export enum ELinearPendingKey {
  ISSUE_ID = "issueId",
  HISTORY_AFTER = "historyAfter",
  COMMENTS_AFTER = "commentsAfter",
}

export enum ELinearCursorKey {
  SINCE = "since",
  AFTER = "after",
  STARTED_AT = "startedAt",
  PENDING = "pending",
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

export enum EChatCursorKey {
  SINCE = "since",
  SWEEP_STARTED_AT = "sweepStartedAt",
  AFTER_SPACE = "afterSpace",
  RESUME_SPACE = "resumeSpace",
  PAGE_TOKEN = "pageToken",
  SPACES_PAGE_TOKEN = "spacesPageToken",
}
