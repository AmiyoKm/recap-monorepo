import { ENV } from "#api/shared/env/env.constants";

export const ROUTES = {
  API: {
    GOOGLE_CALLBACK: "/api/connect/google/callback",
    GOOGLE_CALLBACK_URL: (): string => `${ENV.auth.baseUrl}${ROUTES.API.GOOGLE_CALLBACK}`,
  },
  WEB: {
    CONNECT_RESULT: (query: Record<string, string>) =>
      `${ENV.webOrigin}/connected?${new URLSearchParams(query).toString()}`,
  },
  GOOGLE: {
    CALENDAR_READONLY_SCOPE: "https://www.googleapis.com/auth/calendar.readonly",
  },
  JIRA: {
    SITE: (site: string) => `https://${site}`,
  },
} as const;
