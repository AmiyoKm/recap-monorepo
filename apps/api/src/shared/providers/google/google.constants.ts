import { EGoogleSource } from "#api/shared/providers/google/google.enums";
import { ROUTES } from "#api/shared/routes/routes.constants";

export const GOOGLE_REQUEST_TIMEOUT_MS = 10000;
export const GOOGLE_CALENDAR_API_VERSION = "v3";
export const GOOGLE_CALENDAR_ID = "primary";
export const GOOGLE_CALENDAR_PAGE_SIZE = 100;
export const GOOGLE_CHAT_API_VERSION = "v1";
export const GOOGLE_CHAT_SPACES_PAGE_SIZE = 1000;
export const GOOGLE_CHAT_MESSAGES_PAGE_SIZE = 40;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_GONE = 410;
export const GOOGLE_SOURCE_SCOPES: Record<EGoogleSource, string[]> = {
  [EGoogleSource.CALENDAR]: [ROUTES.GOOGLE.CALENDAR_READONLY_SCOPE],
  [EGoogleSource.GMAIL]: [ROUTES.GOOGLE.GMAIL_METADATA_SCOPE],
  [EGoogleSource.DRIVE]: [ROUTES.GOOGLE.DRIVE_ACTIVITY_READONLY_SCOPE],
  [EGoogleSource.CHAT]: [
    ROUTES.GOOGLE.CHAT_SPACES_READONLY_SCOPE,
    ROUTES.GOOGLE.CHAT_MESSAGES_READONLY_SCOPE,
  ],
};
export const GOOGLE_GMAIL_API_VERSION = "v1";
export const GOOGLE_GMAIL_USER_ID = "me";
export const GOOGLE_GMAIL_PAGE_SIZE = 25;
export const HTTP_NOT_FOUND = 404;
