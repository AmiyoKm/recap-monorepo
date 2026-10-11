import { EDayPart } from "@/features/dashboard/dashboard.enums";

export const DASHBOARD_GREETINGS: Record<EDayPart, string> = {
  [EDayPart.MORNING]: "Good morning",
  [EDayPart.AFTERNOON]: "Good afternoon",
  [EDayPart.EVENING]: "Good evening",
};
export const DASHBOARD_DATE_FORMAT = "dddd, D MMMM";
export const DASHBOARD_AFTERNOON_HOUR = 12;
export const DASHBOARD_EVENING_HOUR = 18;
