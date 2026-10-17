import { DIGEST_DATE_API_FORMAT } from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.constants";
import type { TDayInput } from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.types";
import { dayjs } from "@/shared/date/date.helpers";

export function toDigestDate(day: TDayInput): string {
  return dayjs(day).format(DIGEST_DATE_API_FORMAT);
}

export function isDigestDateDisabled(dates: string[], day: TDayInput): boolean {
  return !dates.includes(toDigestDate(day));
}
