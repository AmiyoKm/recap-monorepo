import { DIGEST_NOT_FOUND_STATUS } from "@/api/digest/digest.constants";
import { DIGEST_VIEW_BY_STATUS } from "@/features/dashboard/components/DigestPanel/DigestPanel.constants";
import { EDigestView } from "@/features/dashboard/components/DigestPanel/DigestPanel.enums";
import type { IDigestViewInput } from "@/features/dashboard/components/DigestPanel/DigestPanel.interfaces";

export function digestView({
  isPending,
  isListError,
  error,
  digest,
}: IDigestViewInput): EDigestView {
  if (isListError) {
    return EDigestView.ERROR;
  }
  if (error?.status === DIGEST_NOT_FOUND_STATUS) {
    return EDigestView.NOT_FOUND;
  }
  if (error) {
    return EDigestView.ERROR;
  }
  if (isPending || !digest) {
    return EDigestView.LOADING;
  }
  return DIGEST_VIEW_BY_STATUS[digest.status];
}

export function isRegenerateDisabled(view: EDigestView, isRegenerating: boolean): boolean {
  return isRegenerating || view === EDigestView.IN_PROGRESS || view === EDigestView.LOADING;
}
