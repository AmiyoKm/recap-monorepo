import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { ensureOk } from "@/api/client/client.helpers";
import { healthKeys } from "@/api/health/health.keys";

function healthStatusQueryOptions() {
  return queryOptions({
    queryKey: healthKeys.status(),
    queryFn: () => ensureOk(api.health.get()),
  });
}

export function useHealthStatusQuery() {
  return useQuery(healthStatusQueryOptions());
}
