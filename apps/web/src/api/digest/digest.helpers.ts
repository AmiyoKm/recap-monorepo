import { DIGEST_EXTRA_TIME_ZONES } from "@/api/digest/digest.constants";

export function listTimeZones(): string[] {
  return [...new Set([...DIGEST_EXTRA_TIME_ZONES, ...Intl.supportedValuesOf("timeZone")])];
}
