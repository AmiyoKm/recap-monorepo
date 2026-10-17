import { ACTIVITY_KIND_LABELS, SOURCE_LABELS } from "@/api/activity/activity.constants";
import { EActivityKind, ESource } from "@/api/activity/activity.enums";
import { ACTIVITY_TIME_FORMAT } from "@/features/activity/activity.constants";
import { dayjs } from "@/shared/date/date.helpers";

export function formatActivityTime(occurredAt: string): string {
  return dayjs(occurredAt).format(ACTIVITY_TIME_FORMAT);
}

export function sourceLabel(source: string): string {
  const known = Object.values(ESource).find((entry) => entry === source);
  if (!known) {
    return source;
  }
  return SOURCE_LABELS[known];
}

export function kindLabel(kind: string): string {
  const known = Object.values(EActivityKind).find((entry) => entry === kind);
  if (!known) {
    return kind;
  }
  return ACTIVITY_KIND_LABELS[known];
}
