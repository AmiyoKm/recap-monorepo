import {
  ACTIVITY_DELETE_CHUNK,
  ACTIVITY_INSERT_ROWS,
} from "#api/modules/activity/activity.constants";
import { ESource } from "#api/modules/activity/activity.enums";
import {
  GOOGLE_CALENDAR_PAGE_SIZE,
  GOOGLE_CHAT_MESSAGES_PAGE_SIZE,
  GOOGLE_DRIVE_PAGE_SIZE,
  GOOGLE_GMAIL_PAGE_SIZE,
} from "#api/shared/providers/google/google.constants";
import { EGmailLabel, EGoogleSource } from "#api/shared/providers/google/google.enums";
import { EProvider } from "#api/shared/providers/providers.enums";

export const PULL_MAX_PAGES_PER_MESSAGE = 1;
export const PULL_FIRST_LOOKBACK_DAYS = 7;
export const CALENDAR_LOOKAHEAD_DAYS = 30;
export const CALENDAR_CURSOR_MAX_AGE_DAYS = 14;
export const CHAT_SPACES_PER_PAGE = 5;
export const DRIVE_CURSOR_OVERLAP_MINUTES = 60;
export const QUEUE_SEND_BATCH_MAX = 100;
export const ACCESS_TOKEN_EXPIRY_MARGIN_SECONDS = 120;
export const PULL_ERROR_MAX_LENGTH = 500;
export const PULLABLE_PROVIDERS: EProvider[] = [EProvider.GOOGLE];
export const READABLE_SOURCES: ESource[] = [
  ESource.CALENDAR,
  ESource.GMAIL,
  ESource.CHAT,
  ESource.DRIVE,
];
export const GMAIL_BACKFILL_LABELS: EGmailLabel[] = [EGmailLabel.SENT, EGmailLabel.INBOX];

export const GOOGLE_SOURCE_TO_SOURCE: Record<EGoogleSource, ESource> = {
  [EGoogleSource.CALENDAR]: ESource.CALENDAR,
  [EGoogleSource.GMAIL]: ESource.GMAIL,
  [EGoogleSource.DRIVE]: ESource.DRIVE,
  [EGoogleSource.CHAT]: ESource.CHAT,
};

const PULL_FIXED_D1_STATEMENTS = 4;
const CALENDAR_D1_STATEMENTS_PER_PAGE =
  Math.ceil(GOOGLE_CALENDAR_PAGE_SIZE / ACTIVITY_INSERT_ROWS) +
  Math.ceil(GOOGLE_CALENDAR_PAGE_SIZE / ACTIVITY_DELETE_CHUNK);
const CHAT_D1_STATEMENTS_PER_PAGE = Math.ceil(
  (CHAT_SPACES_PER_PAGE * GOOGLE_CHAT_MESSAGES_PAGE_SIZE) / ACTIVITY_INSERT_ROWS,
);
const DRIVE_COMMENTED_FILES_READS = 1;
const DRIVE_D1_STATEMENTS_PER_PAGE =
  Math.ceil(GOOGLE_DRIVE_PAGE_SIZE / ACTIVITY_INSERT_ROWS) + DRIVE_COMMENTED_FILES_READS;
const GMAIL_D1_STATEMENTS_PER_PAGE = Math.ceil(GOOGLE_GMAIL_PAGE_SIZE / ACTIVITY_INSERT_ROWS);
export const PULL_D1_STATEMENTS_PER_MESSAGE_BOUND =
  PULL_MAX_PAGES_PER_MESSAGE *
    Math.max(
      CALENDAR_D1_STATEMENTS_PER_PAGE,
      CHAT_D1_STATEMENTS_PER_PAGE,
      DRIVE_D1_STATEMENTS_PER_PAGE,
      GMAIL_D1_STATEMENTS_PER_PAGE,
    ) +
  PULL_FIXED_D1_STATEMENTS;
