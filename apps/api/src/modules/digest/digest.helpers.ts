import {
  DIGEST_EXTRA_TIME_ZONES,
  DIGEST_LOCAL_DATE_FORMAT,
  DIGEST_RUN_HOUR,
  SATURDAY,
  SUNDAY,
} from "#api/modules/digest/digest.constants";
import { dayjs } from "#api/shared/date/date.helpers";

export function isSupportedTimeZone(timeZone: string): boolean {
  return (
    DIGEST_EXTRA_TIME_ZONES.includes(timeZone) ||
    Intl.supportedValuesOf("timeZone").includes(timeZone)
  );
}

function isWeekend(localDate: string): boolean {
  const weekday = dayjs.utc(localDate).day();
  return weekday === SATURDAY || weekday === SUNDAY;
}

function nextWorkday(localDate: string): string {
  const next = dayjs.utc(localDate).add(1, "day").format(DIGEST_LOCAL_DATE_FORMAT);
  if (!isWeekend(next)) {
    return next;
  }
  return nextWorkday(next);
}

export function nextDigestRunAt(now: string, timeZone: string): string {
  const local = dayjs(now).tz(timeZone);
  const today = local.format(DIGEST_LOCAL_DATE_FORMAT);
  const runDate = resolveRunDate(today, local.hour());
  const hour = String(DIGEST_RUN_HOUR).padStart(2, "0");
  return dayjs.tz(`${runDate} ${hour}:00`, timeZone).toISOString();
}

function resolveRunDate(today: string, hour: number): string {
  const isBeforeRun = hour < DIGEST_RUN_HOUR;
  if (isBeforeRun && !isWeekend(today)) {
    return today;
  }
  return nextWorkday(today);
}
