import type { IGoogleProfile } from "#api/shared/providers/google/google.interfaces";
import type { IProviderGrant } from "#api/shared/providers/providers.interfaces";

export const TEST_USER_NAME = "Test User";
export const TEST_PASSWORD = "test-password-123";
export const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;
export const CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GMAIL_METADATA_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
export const DRIVE_ACTIVITY_SCOPE = "https://www.googleapis.com/auth/drive.activity.readonly";
export const CHAT_SPACES_SCOPE = "https://www.googleapis.com/auth/chat.spaces.readonly";
export const CHAT_MESSAGES_SCOPE = "https://www.googleapis.com/auth/chat.messages.readonly";
export const ALL_SOURCES_GRANTED_SCOPES = [
  "openid",
  "email",
  CALENDAR_READ_SCOPE,
  GMAIL_METADATA_SCOPE,
  DRIVE_ACTIVITY_SCOPE,
  CHAT_SPACES_SCOPE,
  CHAT_MESSAGES_SCOPE,
];
export const ALL_SOURCES = ["calendar", "gmail", "drive", "chat"] as const;
export const GOOGLE_ACCESS_DENIED = "access_denied";
export const CALENDAR_EMAIL = "work@employer.example";
export const TEST_AVATAR_URL = "https://img.test/avatar.png";
export const EXISTING_GOOGLE_SUB = "google-sub-existing";
export const HTTP_OK = 200;
export const HTTP_FOUND = 302;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_NOT_FOUND = 404;
export const HTTP_UNPROCESSABLE = 422;

export const GOOGLE_PROFILE: IGoogleProfile = {
  sub: "google-sub-1",
  email: "work@employer.example",
  name: "Work User",
  picture: TEST_AVATAR_URL,
};

export const JIRA_GRANT: IProviderGrant = {
  tokens: {
    accessToken: "jira-access-token",
    refreshToken: "jira-refresh-token",
    expiresInSeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
    scopes: ["read:jira-user", "read:jira-work", "offline_access"],
  },
  account: { accountId: "jira-account-1", accountEmail: "dev@employer.example" },
  site: "acme.atlassian.net",
  resourceId: "jira-cloud-1",
};

export const LINEAR_GRANT: IProviderGrant = {
  tokens: {
    accessToken: "linear-access-token",
    refreshToken: "linear-refresh-token",
    expiresInSeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
    scopes: ["read"],
  },
  account: { accountId: "linear-user-1", accountEmail: "dev@employer.example" },
  site: null,
  resourceId: null,
};
export const JIRA_SITE = "acme.atlassian.net";
export const JIRA_CLOUD_ID = "cloud-1";
export const JIRA_REFRESH_TOKEN = "jira-refresh-1";

export const LINEAR_LAST_PAGE = { hasNextPage: false, endCursor: null };
