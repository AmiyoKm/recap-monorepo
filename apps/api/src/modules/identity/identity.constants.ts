import { EOAuthCallback } from "#api/modules/identity/identity.enums";
import { EProvider } from "#api/shared/providers/providers.enums";
import { ROUTES } from "#api/shared/routes/routes.constants";

export const PENDING_GRANT_TTL_SECONDS = 600;
export const GRANT_STATE_BYTES = 32;
export const GOOGLE_IDENTITY_CONNECTED = "google";
export const IDENTITY_CREATE_SCOPES = ["openid", "email"];
export const GOOGLE_CALENDAR_SCOPES = ["openid", "email", ROUTES.GOOGLE.CALENDAR_READONLY_SCOPE];
export const MAX_ID_LENGTH = 128;
export const MAX_OAUTH_CODE_LENGTH = 4096;
export const MAX_STATE_LENGTH = 512;
export const MAX_OAUTH_ERROR_LENGTH = 256;
export const MAX_EMAIL_LENGTH = 320;
export const MAX_SITE_LENGTH = 253;
export const MAX_ACCOUNT_ID_LENGTH = 256;
export const MAX_DISPLAY_NAME_LENGTH = 256;
export const MAX_URL_LENGTH = 8192;
export const MAX_SCOPES_LENGTH = 2048;
export const MAX_TIMESTAMP_LENGTH = 64;
export const SQLITE_UNIQUE_VIOLATION = "SQLITE_CONSTRAINT_UNIQUE";
export const PROVIDER_CALLBACKS: Record<EProvider, EOAuthCallback | null> = {
  [EProvider.GOOGLE_CALENDAR]: EOAuthCallback.GOOGLE,
  [EProvider.JIRA]: EOAuthCallback.JIRA,
  [EProvider.LINEAR]: EOAuthCallback.LINEAR,
  [EProvider.SLACK]: null,
  [EProvider.GOOGLE_CHAT]: null,
  [EProvider.GITHUB]: null,
};
