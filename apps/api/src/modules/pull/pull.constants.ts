import { ESource } from "#api/modules/activity/activity.enums";
import { EGoogleSource } from "#api/shared/providers/google/google.enums";
import { EProvider } from "#api/shared/providers/providers.enums";

export const PULL_MAX_PAGES_PER_MESSAGE = 2;
export const PULL_FIRST_LOOKBACK_DAYS = 7;
export const CALENDAR_LOOKAHEAD_DAYS = 30;
export const CALENDAR_CURSOR_MAX_AGE_DAYS = 14;
export const QUEUE_SEND_BATCH_MAX = 100;
export const ACCESS_TOKEN_EXPIRY_MARGIN_SECONDS = 120;
export const PULL_ERROR_MAX_LENGTH = 500;
export const PULLABLE_PROVIDERS: EProvider[] = [EProvider.GOOGLE];
export const READABLE_SOURCES: ESource[] = [ESource.CALENDAR];

export const GOOGLE_SOURCE_TO_SOURCE: Record<EGoogleSource, ESource> = {
  [EGoogleSource.CALENDAR]: ESource.CALENDAR,
  [EGoogleSource.GMAIL]: ESource.GMAIL,
  [EGoogleSource.DRIVE]: ESource.DRIVE,
  [EGoogleSource.CHAT]: ESource.CHAT,
};
