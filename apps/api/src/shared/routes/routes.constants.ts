import { ENV } from "#api/shared/env/env.constants";

export const ROUTES = {
  API: {
    GOOGLE_CALLBACK: "/api/connect/google/callback",
    GOOGLE_CALLBACK_URL: (): string => `${ENV.auth.baseUrl}${ROUTES.API.GOOGLE_CALLBACK}`,
    JIRA_CALLBACK: "/api/connect/jira/callback",
    JIRA_CALLBACK_URL: (): string => `${ENV.auth.baseUrl}${ROUTES.API.JIRA_CALLBACK}`,
    LINEAR_CALLBACK: "/api/connect/linear/callback",
    LINEAR_CALLBACK_URL: (): string => `${ENV.auth.baseUrl}${ROUTES.API.LINEAR_CALLBACK}`,
  },
  WEB: {
    CONNECT_RESULT: (query: Record<string, string>) =>
      `${ENV.webOrigin}/connected?${new URLSearchParams(query).toString()}`,
  },
  GOOGLE: {
    CALENDAR_READONLY_SCOPE: "https://www.googleapis.com/auth/calendar.readonly",
    GMAIL_METADATA_SCOPE: "https://www.googleapis.com/auth/gmail.metadata",
    DRIVE_ACTIVITY_READONLY_SCOPE: "https://www.googleapis.com/auth/drive.activity.readonly",
    CHAT_SPACES_READONLY_SCOPE: "https://www.googleapis.com/auth/chat.spaces.readonly",
    CHAT_MESSAGES_READONLY_SCOPE: "https://www.googleapis.com/auth/chat.messages.readonly",
  },
  LINEAR: {
    AUTHORIZE: "https://linear.app/oauth/authorize",
    TOKEN: "https://api.linear.app/oauth/token",
  },
} as const;
