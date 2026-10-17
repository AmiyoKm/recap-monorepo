export enum ESource {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  CHAT = "chat",
  DRIVE = "drive",
  JIRA = "jira",
  LINEAR = "linear",
}

export enum EActivityKind {
  CALENDAR_EVENT = "calendar_event",
  EMAIL_SENT = "email_sent",
  EMAIL_RECEIVED = "email_received",
  CHAT_MESSAGE = "chat_message",
  CHAT_MENTION = "chat_mention",
  DRIVE_FILE_CREATED = "drive_file_created",
  DRIVE_FILE_EDITED = "drive_file_edited",
  DRIVE_COMMENT = "drive_comment",
  ISSUE_CREATED = "issue_created",
  ISSUE_STATUS_CHANGED = "issue_status_changed",
  ISSUE_ASSIGNED = "issue_assigned",
  ISSUE_COMMENTED = "issue_commented",
}

export enum EActivityMessages {
  ITEM_WITHOUT_URL_DROPPED = "Activity item has no link and was dropped",
  ITEM_INCOMPLETE_DROPPED = "Activity item has no id, thread or date and was dropped",
  UNKNOWN_ACTIVITY_VALUE = "Activity row holds an unknown value",
}

export enum ECalendarEventStatus {
  CANCELLED = "cancelled",
}

export enum ECalendarResponseStatus {
  DECLINED = "declined",
}

export enum EChatAnnotationType {
  USER_MENTION = "USER_MENTION",
}

export enum EChatMentionType {
  MENTION = "MENTION",
}

export enum EChatWebPath {
  ROOM = "room",
  DM = "dm",
}
