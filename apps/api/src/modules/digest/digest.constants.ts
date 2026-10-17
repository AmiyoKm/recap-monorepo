import { ESource } from "#api/modules/activity/activity.enums";
import { EDigestStatus } from "#api/modules/digest/digest.enums";
import {
  D1_STATEMENTS_PER_INVOCATION_LIMIT,
  PULL_D1_STATEMENTS_PER_PAGE_BOUND,
  PULL_FIXED_D1_STATEMENTS,
} from "#api/modules/pull/pull.constants";

export const DEFAULT_DIGEST_TIME_ZONE = "Asia/Dhaka";
export const DIGEST_RUN_HOUR = 8;
export const DIGEST_LOCAL_DATE_FORMAT = "YYYY-MM-DD";
export const DIGEST_TIME_ZONE_MAX_LENGTH = 64;
export const DIGEST_TIMESTAMP_MAX_LENGTH = 64;
export const DIGEST_TIME_ZONE_PATTERN = "^[A-Za-z0-9_+\\-/]+$";
export const DIGEST_EXTRA_TIME_ZONES = ["UTC"];
export const SATURDAY = 6;
export const SUNDAY = 0;
export const MONDAY = 1;
export const DIGEST_MODEL = "gemini-3.5-flash-lite";
export const DIGEST_NO_PREVIOUS_WINDOW_HOURS = 24;
export const DIGEST_WEEKEND_BACK_DAYS = 3;
export const DIGEST_STALE_MINUTES = 30;
export const DIGEST_ACTIVITY_LIMIT = 300;
export const DIGEST_MEETING_LIMIT = 50;
export const DIGEST_FINAL_PULL_FIXED_D1_STATEMENTS = PULL_FIXED_D1_STATEMENTS + 1;
export const DIGEST_FINAL_PULL_MAX_PAGES = Math.floor(
  (D1_STATEMENTS_PER_INVOCATION_LIMIT - DIGEST_FINAL_PULL_FIXED_D1_STATEMENTS) /
    PULL_D1_STATEMENTS_PER_PAGE_BOUND,
);
export const DIGEST_START_ROWS_PER_STATEMENT = 10;
export const DIGEST_IDS_PER_STATEMENT = 90;
export const DIGEST_PROMPT_DETAIL_LENGTH = 200;
export const DIGEST_WORKFLOW_BATCH_MAX = 100;
export const DIGEST_ID_MAX_LENGTH = 128;
export const DIGEST_DATE_MAX_LENGTH = 10;
export const DIGEST_DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";
export const DIGEST_ITEM_TEXT_MAX_LENGTH = 500;
export const DIGEST_ITEMS_MAX = 30;
export const DIGEST_ITEM_ACTIVITY_IDS_MAX = 20;
export const DIGEST_SECTIONS_MAX = 20;
export const DIGEST_MISSING_SOURCES_MAX = 50;
export const DIGEST_SOURCES_MAX = 6;
export const DIGEST_ERROR_MAX_LENGTH = 500;
export const DIGEST_LIST_MAX = 400;
export const DIGEST_EMAIL_MAX_LENGTH = 320;
export const DIGEST_PROVIDER_MAX_LENGTH = 32;
export const DIGEST_EMPTY_LIST = "[]";
const DIGEST_WORKFLOW_RETRY_LIMIT = 3;
const DIGEST_WORKFLOW_RETRY_DELAY_MS = 10_000;
const DIGEST_WORKFLOW_STEP_TIMEOUT_MS = 300_000;
export const DIGEST_SYSTEM_PROMPT = [
  "You write a short daily Digest for one person who works under several Work Identities.",
  `Each Activity line shows its source (${Object.values(ESource).join(", ")}) and its kind.`,
  "Write one section for each Work Identity in the input, using the identityId given there.",
  "Each section has three lists. highlights: what happened in the window that matters.",
  "meetingsAhead: the meetings still ahead today, from the meetings list only.",
  "needsYou: open items that need the person to act or reply.",
  "Every item is one plain sentence and lists the ids of the Activities it comes from.",
  "Use only ids that appear in the input. Never invent facts. Leave a list empty when nothing fits.",
  "Do not use em dashes.",
].join(" ");
export const DIGEST_IN_PROGRESS_STATUSES = [EDigestStatus.PENDING, EDigestStatus.RUNNING];
export const DIGEST_WORKFLOW_STEP_CONFIG = {
  retries: {
    limit: DIGEST_WORKFLOW_RETRY_LIMIT,
    delay: DIGEST_WORKFLOW_RETRY_DELAY_MS,
    backoff: "exponential" as const,
  },
  timeout: DIGEST_WORKFLOW_STEP_TIMEOUT_MS,
};
