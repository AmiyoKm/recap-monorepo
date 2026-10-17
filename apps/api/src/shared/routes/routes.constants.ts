import { ENV } from "#api/shared/env/env.constants";
import { EGoogleUrlParam } from "#api/shared/providers/google/google.enums";

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
    GMAIL_THREAD: (email: string, threadId: string): string =>
      `https://mail.google.com/mail/?${new URLSearchParams({ [EGoogleUrlParam.AUTHUSER]: email }).toString()}#all/${threadId}`,
    CHAT_WEB: (segments: string[]): string => `https://chat.google.com/${segments.join("/")}`,
    DRIVE_OPEN: (fileId: string): string =>
      `https://drive.google.com/open?${new URLSearchParams({ id: fileId }).toString()}`,
  },
  JIRA: {
    SITE: (site: string): string => `https://${site}`,
    ISSUE: (site: string, issueKey: string): string =>
      `${ROUTES.JIRA.SITE(site)}/browse/${issueKey}`,
    COMMENT: (site: string, issueKey: string, commentId: string): string =>
      `${ROUTES.JIRA.ISSUE(site, issueKey)}?focusedCommentId=${commentId}`,
  },
  LINEAR: {
    AUTHORIZE: "https://linear.app/oauth/authorize",
    TOKEN: "https://api.linear.app/oauth/token",
  },
} as const;
