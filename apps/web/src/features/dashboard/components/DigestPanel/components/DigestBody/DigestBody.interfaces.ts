import type { ApiError } from "@/api/client/client.helpers";
import type { TDigestData, TRegenerateDigestError } from "@/api/digest/digest.types";
import type { EDigestView } from "@/features/dashboard/components/DigestPanel/DigestPanel.enums";

export interface IDigestBodyProps {
  view: EDigestView;
  digest: TDigestData | undefined;
  isToday: boolean;
  isRegenerating: boolean;
  regenerateError: ApiError<TRegenerateDigestError> | null;
  onRegenerate: () => void;
  onRetry: () => void;
}
