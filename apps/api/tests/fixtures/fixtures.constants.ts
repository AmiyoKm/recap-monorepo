import type { IGoogleProfile } from "#api/shared/providers/google/google.interfaces";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";

export const TEST_USER_NAME = "Test User";
export const TEST_PASSWORD = "test-password-123";
export const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;
export const CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const CALENDAR_GRANTED_SCOPES = ["openid", "email", CALENDAR_READ_SCOPE];
export const GOOGLE_ACCESS_DENIED = "access_denied";
export const CALENDAR_EMAIL = "work@employer.example";
export const JIRA_EMAIL = "dev@employer.example";
export const JIRA_SITE = "acme.atlassian.net";
export const VALID_JIRA_KEY = "valid-jira-api-key-12345678";
export const VALID_LINEAR_KEY = "valid-linear-api-key-12345678";
export const INVALID_API_KEY = "wrong-key-12345678";
export const HTTP_OK = 200;
export const HTTP_FOUND = 302;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;

export const GOOGLE_PROFILE: IGoogleProfile = {
  sub: "google-sub-1",
  email: "work@employer.example",
  name: "Work User",
  picture: "https://img.test/avatar.png",
};

export const JIRA_ACCOUNT: IProviderAccount = {
  accountId: "jira-account-1",
  accountEmail: "dev@employer.example",
};

export const LINEAR_ACCOUNT: IProviderAccount = {
  accountId: "linear-user-1",
  accountEmail: "dev@employer.example",
};
