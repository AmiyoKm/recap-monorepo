import {
  DIGEST_DAY_MARGIN_MS,
  DIGEST_EXTRA_TIME_ZONES,
  DIGEST_POLL_MS,
  DIGEST_REFETCH_MARGIN_MS,
} from "@/api/digest/digest.constants";
import { EDigestStatus } from "@/api/digest/digest.enums";
import type { TDigestData, TDigestSettingsData } from "@/api/digest/digest.types";
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

export function isDigestInProgress(status: TDigestData["status"] | undefined): boolean {
  return status === EDigestStatus.PENDING || status === EDigestStatus.RUNNING;
}

export function msUntilNextLocalDay(timeZone: string, now = dayjs()): number {
  const midnight = now.tz(timeZone).add(1, "day").startOf("day");
  return Math.max(midnight.diff(now), 0) + DIGEST_DAY_MARGIN_MS;
}

export function detailRefetchInterval(
  status: TDigestData["status"] | undefined,
  nextRunAt: string | undefined,
  now = dayjs(),
): number | false {
  if (isDigestInProgress(status)) {
    return DIGEST_POLL_MS;
  }
  return msUntilNextRun(nextRunAt, now);
}

export function listRefetchInterval(
  settings: Pick<TDigestSettingsData, "nextRunAt" | "timeZone"> | undefined,
  now = dayjs(),
): number | false {
  if (!settings) {
    return false;
  }
  const untilRun = msUntilNextRun(settings.nextRunAt, now);
  const untilMidnight = msUntilNextLocalDay(settings.timeZone, now);
  if (untilRun === false) {
    return untilMidnight;
  }
  return Math.min(untilRun, untilMidnight);
}
