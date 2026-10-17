import { NEXT_RUN_FORMAT } from "@/features/settings/components/DigestCard/components/DigestSettingsForm/DigestSettingsForm.constants";
import { dayjs } from "@/shared/date/date.helpers";

export function formatNextRun(nextRunAt: string, timeZone: string): string {
  return dayjs(nextRunAt).tz(timeZone).format(NEXT_RUN_FORMAT);
}
