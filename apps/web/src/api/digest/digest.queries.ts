import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";
import { msUntilNextRun } from "@/api/digest/digest.helpers";
import { digestKeys } from "@/api/digest/digest.keys";
import type { TDigestSettingsData, TDigestSettingsError } from "@/api/digest/digest.types";

function digestSettingsQueryOptions() {
  return queryOptions<TDigestSettingsData, ApiError<TDigestSettingsError>>({
    queryKey: digestKeys.settings(),
    queryFn: () => ensureOk(api["digest-settings"].get()),
    refetchInterval: (query) => msUntilNextRun(query.state.data?.nextRunAt),
  });
}

export function useDigestSettingsQuery() {
  return useQuery(digestSettingsQueryOptions());
}
