import { queryOptions, useQuery } from "@tanstack/react-query";

import { toAuthError } from "@/api/auth/auth.helpers";
import { authKeys } from "@/api/auth/auth.keys";
import type { TSession } from "@/api/auth/auth.types";
import { authClient } from "@/api/client";
import type { ApiError } from "@/api/client/client.helpers";

function sessionQueryOptions() {
  return queryOptions<TSession | null, ApiError>({
    queryKey: authKeys.session(),
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) {
        throw toAuthError(error);
      }
      return data;
    },
  });
}

export function useSessionQuery() {
  return useQuery(sessionQueryOptions());
}
