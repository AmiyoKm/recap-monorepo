import { EDigestStatus } from "@/api/digest/digest.enums";
import { EDigestView } from "@/features/dashboard/components/DigestPanel/DigestPanel.enums";

export const DIGEST_PANEL_TITLE = "Digest";
export const DIGEST_PANEL_REGENERATE = "Regenerate";
export const DIGEST_PANEL_TODAY = "Today";

export const DIGEST_VIEW_BY_STATUS: Record<EDigestStatus, EDigestView> = {
  [EDigestStatus.PENDING]: EDigestView.IN_PROGRESS,
  [EDigestStatus.RUNNING]: EDigestView.IN_PROGRESS,
  [EDigestStatus.READY]: EDigestView.READY,
  [EDigestStatus.FAILED]: EDigestView.FAILED,
};
