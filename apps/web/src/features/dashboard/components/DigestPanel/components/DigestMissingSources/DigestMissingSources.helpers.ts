import { SOURCE_LABELS } from "@/api/activity/activity.constants";
import type { TDigestMissingSource } from "@/api/digest/digest.types";
import { DIGEST_MISSING_NOT_READ } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources/DigestMissingSources.constants";

export function describeMissingSource(missing: TDigestMissingSource): string {
  const names = missing.sources.map((source) => SOURCE_LABELS[source]).join(", ");
  return `${names} for ${missing.identityEmail}: ${DIGEST_MISSING_NOT_READ}`;
}
