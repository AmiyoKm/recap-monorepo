import { EGmailLabel } from "#api/shared/providers/google/google.enums";

export const ACTIVITY_PAGE_SIZE_DEFAULT = 25;
export const ACTIVITY_PAGE_SIZE_MAX = 100;
export const ACTIVITY_PAGE_DEFAULT = 1;
export const ACTIVITY_PAGE_MAX = 100000;
export const ACTIVITY_FILTER_VALUES_MAX = 20;
export const ACTIVITY_QUERY_MAX_LENGTH = 200;
export const ACTIVITY_ID_MAX_LENGTH = 128;
export const ACTIVITY_TITLE_MAX_LENGTH = 1024;
export const ACTIVITY_ACTOR_MAX_LENGTH = 320;
export const ACTIVITY_DETAIL_MAX_LENGTH = 2048;
export const ACTIVITY_URL_MAX_LENGTH = 8192;
export const ACTIVITY_TIMESTAMP_MAX_LENGTH = 64;
export const ACTIVITY_EMAIL_MAX_LENGTH = 320;
export const ACTIVITY_NO_TITLE = "(No title)";
export const LIKE_ESCAPE_CHARACTER = "\\";
export const LIKE_WILDCARDS = /[\\%_]/g;
export const CALENDAR_FALLBACK_TIME_ZONE = "UTC";
export const AUTHUSER_PARAM = "authuser";
export const ACTIVITY_INSERT_ROWS = 7;
export const ACTIVITY_DELETE_CHUNK = 90;
export const ACTIVITY_NO_SUBJECT = "(No subject)";
export const GMAIL_THREAD_HASH_PREFIX = "all/";
export const GMAIL_RECIPIENT_SEPARATOR = ", ";
export const GMAIL_EXCLUDED_LABELS: EGmailLabel[] = [
  EGmailLabel.SPAM,
  EGmailLabel.TRASH,
  EGmailLabel.CATEGORY_PROMOTIONS,
  EGmailLabel.CATEGORY_SOCIAL,
];
