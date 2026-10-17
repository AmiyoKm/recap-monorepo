import { DIGEST_EXTRA_TIME_ZONES, DIGEST_REFETCH_MARGIN_MS } from "@/api/digest/digest.constants";
import { dayjs } from "@/shared/date/date.helpers";

export function listTimeZones(): string[] {
  return [...new Set([...DIGEST_EXTRA_TIME_ZONES, ...Intl.supportedValuesOf("timeZone")])];
}

export function msUntilNextRun(nextRunAt: string | undefined, now = dayjs()): number | false {
  if (!nextRunAt) {
    return false;
  }
  return Math.max(dayjs(nextRunAt).diff(now), 0) + DIGEST_REFETCH_MARGIN_MS;
}
