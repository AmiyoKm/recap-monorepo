import { EActivityKind, ESource } from "@/api/activity/activity.enums";

export const ACTIVITY_PAGE_SIZE = 25;
export const ACTIVITY_FIRST_PAGE = 1;
export const ACTIVITY_PAGE_MAX = 100000;
export const ACTIVITY_SEARCH_MAX_LENGTH = 200;

export const SOURCE_LABELS: Record<ESource, string> = {
  [ESource.CALENDAR]: "Calendar",
  [ESource.GMAIL]: "Gmail",
  [ESource.CHAT]: "Chat",
  [ESource.DRIVE]: "Drive",
  [ESource.JIRA]: "Jira",
  [ESource.LINEAR]: "Linear",
};

export const ACTIVITY_KIND_LABELS: Record<EActivityKind, string> = {
  [EActivityKind.CALENDAR_EVENT]: "Calendar event",
  [EActivityKind.EMAIL_SENT]: "Email sent",
  [EActivityKind.EMAIL_RECEIVED]: "Email received",
  [EActivityKind.CHAT_MESSAGE]: "Chat message",
  [EActivityKind.CHAT_MENTION]: "Chat mention",
  [EActivityKind.DRIVE_FILE_CREATED]: "File created",
  [EActivityKind.DRIVE_FILE_EDITED]: "File edited",
  [EActivityKind.DRIVE_COMMENT]: "File comment",
  [EActivityKind.ISSUE_CREATED]: "Issue created",
  [EActivityKind.ISSUE_STATUS_CHANGED]: "Status changed",
  [EActivityKind.ISSUE_ASSIGNED]: "Issue assigned",
  [EActivityKind.ISSUE_COMMENTED]: "Issue comment",
};
