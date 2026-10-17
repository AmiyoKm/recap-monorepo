import type { ApiError } from "@/api/client/client.helpers";
import type { TDigestData, TDigestError } from "@/api/digest/digest.types";

export interface IDigestViewInput {
  isPending: boolean;
  isListError: boolean;
  error: ApiError<TDigestError> | null;
  digest: TDigestData | undefined;
}
