import { EGoogleSource } from "#api/shared/providers/google/google.enums";
import { ROUTES } from "#api/shared/routes/routes.constants";

export const GOOGLE_REQUEST_TIMEOUT_MS = 10000;
export const GOOGLE_SOURCE_SCOPES: Record<EGoogleSource, string[]> = {
  [EGoogleSource.CALENDAR]: [ROUTES.GOOGLE.CALENDAR_READONLY_SCOPE],
  [EGoogleSource.GMAIL]: [ROUTES.GOOGLE.GMAIL_METADATA_SCOPE],
  [EGoogleSource.DRIVE]: [ROUTES.GOOGLE.DRIVE_ACTIVITY_READONLY_SCOPE],
  [EGoogleSource.CHAT]: [
    ROUTES.GOOGLE.CHAT_SPACES_READONLY_SCOPE,
    ROUTES.GOOGLE.CHAT_MESSAGES_READONLY_SCOPE,
  ],
};
