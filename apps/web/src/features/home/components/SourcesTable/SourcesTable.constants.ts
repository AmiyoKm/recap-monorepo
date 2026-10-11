import { EProvider } from "@/api/identity/identity.enums";
import { ESourceAvailability } from "@/features/home/home.enums";
import type { ISourceRow } from "@/features/home/home.interfaces";

export const SOURCES_TITLE = "Supported tools";
export const SOURCES_BODY = "Slack, Google Chat and GitHub are next.";
export const SOURCES_HEAD_SOURCE = "Tool";
export const SOURCES_HEAD_METHOD = "How you connect it";
export const SOURCES_HEAD_STATUS = "Status";
export const SOURCES_AVAILABILITY_LABELS: Record<ESourceAvailability, string> = {
  [ESourceAvailability.AVAILABLE]: "Available",
  [ESourceAvailability.PLANNED]: "Coming soon",
};
export const SOURCES_ROWS: ISourceRow[] = [
  {
    provider: EProvider.GOOGLE_CALENDAR,
    method: "Sign in with Google",
    availability: ESourceAvailability.AVAILABLE,
  },
  { provider: EProvider.JIRA, method: "API token", availability: ESourceAvailability.AVAILABLE },
  { provider: EProvider.LINEAR, method: "API key", availability: ESourceAvailability.AVAILABLE },
  { provider: EProvider.SLACK, method: "Not yet", availability: ESourceAvailability.PLANNED },
  { provider: EProvider.GOOGLE_CHAT, method: "Not yet", availability: ESourceAvailability.PLANNED },
  { provider: EProvider.GITHUB, method: "Not yet", availability: ESourceAvailability.PLANNED },
];
