import { EProvider } from "@/api/identity/identity.enums";
import type { TBadgeVariant } from "@/features/app-shell/app-shell.types";
import { ESourceAvailability } from "@/features/home/home.enums";
import type { ISourceRow } from "@/features/home/home.interfaces";

export const SOURCES_TITLE = "Supported tools";
export const SOURCES_BODY = "Slack and GitHub are next.";
export const SOURCES_HEAD_SOURCE = "Tool";
export const SOURCES_HEAD_METHOD = "How you connect it";
export const SOURCES_HEAD_STATUS = "Status";
export const SOURCES_AVAILABILITY_LABELS: Record<ESourceAvailability, string> = {
  [ESourceAvailability.AVAILABLE]: "Available",
  [ESourceAvailability.PLANNED]: "Coming soon",
};
export const SOURCES_ROWS: ISourceRow[] = [
  {
    provider: EProvider.GOOGLE,
    detail: "Calendar, Gmail, Drive and Chat",
    method: "Sign in with Google",
    availability: ESourceAvailability.AVAILABLE,
  },
  {
    provider: EProvider.JIRA,
    detail: null,
    method: "Sign in with Atlassian",
    availability: ESourceAvailability.AVAILABLE,
  },
  {
    provider: EProvider.LINEAR,
    detail: null,
    method: "Sign in with Linear",
    availability: ESourceAvailability.AVAILABLE,
  },
  {
    provider: EProvider.SLACK,
    detail: null,
    method: "Not yet",
    availability: ESourceAvailability.PLANNED,
  },
  {
    provider: EProvider.GITHUB,
    detail: null,
    method: "Not yet",
    availability: ESourceAvailability.PLANNED,
  },
];
export const SOURCES_AVAILABILITY_BADGE_VARIANTS: Record<ESourceAvailability, TBadgeVariant> = {
  [ESourceAvailability.AVAILABLE]: "secondary",
  [ESourceAvailability.PLANNED]: "outline",
};
