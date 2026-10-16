import {
  DASHBOARD_AFTERNOON_HOUR,
  DASHBOARD_EVENING_HOUR,
} from "@/features/dashboard/containers/DashboardContainer/DashboardContainer.constants";
import { EDayPart } from "@/features/dashboard/dashboard.enums";

export function dayPartFor(hour: number): EDayPart {
  if (hour < DASHBOARD_AFTERNOON_HOUR) {
    return EDayPart.MORNING;
  }
  if (hour < DASHBOARD_EVENING_HOUR) {
    return EDayPart.AFTERNOON;
  }
  return EDayPart.EVENING;
}

export function firstName(name: string | undefined): string | undefined {
  const first = name?.trim().split(" ")[0];
  if (!first) {
    return undefined;
  }
  return first;
}

export function greetingTitle(greeting: string, name: string | undefined): string {
  if (!name) {
    return `${greeting}.`;
  }
  return `${greeting}, ${name}.`;
}
