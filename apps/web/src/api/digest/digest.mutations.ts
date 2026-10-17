import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";
import { digestKeys } from "@/api/digest/digest.keys";
import type {
  TUpdateDigestSettingsData,
  TUpdateDigestSettingsError,
} from "@/api/digest/digest.types";

export function useUpdateDigestSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation<TUpdateDigestSettingsData, ApiError<TUpdateDigestSettingsError>, string>({
    mutationFn: (timeZone) => ensureOk(api["digest-settings"].put({ timeZone })),
    onSuccess: (data) => {
      queryClient.setQueryData(digestKeys.settings(), data);
    },
  });
}
