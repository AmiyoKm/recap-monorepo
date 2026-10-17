import {
  DIGEST_BODY_EMPTY_PAST_DESCRIPTION,
  DIGEST_BODY_EMPTY_TODAY_DESCRIPTION,
} from "@/features/dashboard/components/DigestPanel/components/DigestBody/DigestBody.constants";

export function emptyDescription(isToday: boolean): string {
  if (isToday) {
    return DIGEST_BODY_EMPTY_TODAY_DESCRIPTION;
  }
  return DIGEST_BODY_EMPTY_PAST_DESCRIPTION;
}
