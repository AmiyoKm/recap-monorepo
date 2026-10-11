import { EIdentityAuthKind, EIdentityProvider } from "#api/modules/identity/identity.enums";
import type { IProviderRegistration } from "#api/modules/identity/identity.interfaces";

export const PENDING_GRANT_KEY_PREFIX = "pending-grant:";
export const CONNECTION_TOKEN_KEY_PREFIX = "connection-token:";
export const PENDING_GRANT_TTL_SECONDS = 600;
export const GRANT_STATE_BYTES = 32;
export const GOOGLE_CALLBACK_PATH = "/api/connect/google/callback";
export const IDENTITY_CREATE_SCOPES = ["openid", "email"];
export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
];
export const MAX_ID_LENGTH = 128;
export const MAX_PROVIDER_LENGTH = 64;
export const MAX_OAUTH_CODE_LENGTH = 4096;
export const MAX_STATE_LENGTH = 512;
export const HTTP_BAD_REQUEST_STATUS = 400;
export const HTTP_NOT_FOUND_STATUS = 404;
export const HTTP_CONFLICT_STATUS = 409;
export const HTTP_BAD_GATEWAY_STATUS = 502;
export const MIN_API_KEY_LENGTH = 8;
export const MAX_API_KEY_LENGTH = 4096;
export const PROVIDER_REGISTRY: Record<EIdentityProvider, IProviderRegistration> = {
  [EIdentityProvider.GOOGLE_CALENDAR]: { authKind: EIdentityAuthKind.OAUTH, wired: true },
  [EIdentityProvider.JIRA]: { authKind: EIdentityAuthKind.API_KEY, wired: true },
  [EIdentityProvider.LINEAR]: { authKind: EIdentityAuthKind.API_KEY, wired: true },
  [EIdentityProvider.SLACK]: { authKind: EIdentityAuthKind.OAUTH, wired: false },
  [EIdentityProvider.GOOGLE_CHAT]: { authKind: EIdentityAuthKind.OAUTH, wired: false },
  [EIdentityProvider.GITHUB]: { authKind: EIdentityAuthKind.OAUTH, wired: false },
};
