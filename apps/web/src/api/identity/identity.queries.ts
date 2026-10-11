import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { ensureOk } from "@/api/client/client.helpers";
import { identityKeys } from "@/api/identity/identity.keys";

function identitiesQueryOptions() {
  return queryOptions({
    queryKey: identityKeys.list(),
    queryFn: () => ensureOk(api.identities.get()),
    refetchOnWindowFocus: true,
  });
}

export function useIdentitiesQuery() {
  return useQuery(identitiesQueryOptions());
}
