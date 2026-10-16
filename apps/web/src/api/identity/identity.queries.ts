import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";

import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";
import { IDENTITY_SYNC_CHANNEL } from "@/api/identity/identity.constants";
import { consentPollInterval, readConnectResultMessage } from "@/api/identity/identity.helpers";
import type {
  IConnectResultMessage,
  IIdentitiesQueryOptions,
} from "@/api/identity/identity.interfaces";
import { identityKeys } from "@/api/identity/identity.keys";
import type { TIdentitiesData, TIdentitiesError } from "@/api/identity/identity.types";

function identitiesQueryOptions() {
  return queryOptions<TIdentitiesData, ApiError<TIdentitiesError>>({
    queryKey: identityKeys.list(),
    queryFn: () => ensureOk(api.identities.get()),
    refetchOnWindowFocus: true,
  });
}

export function useIdentitiesQuery({ isWaitingForConsent = false }: IIdentitiesQueryOptions = {}) {
  return useQuery({
    ...identitiesQueryOptions(),
    refetchInterval: consentPollInterval(isWaitingForConsent),
  });
}

export function useConnectResultSubscription(onResult: (message: IConnectResultMessage) => void) {
  const queryClient = useQueryClient();
  const handleResult = useEffectEvent((message: IConnectResultMessage) => {
    void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    onResult(message);
  });

  useEffect(() => {
    const channel = new BroadcastChannel(IDENTITY_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = readConnectResultMessage(event.data);
      if (!message) {
        return;
      }
      handleResult(message);
    };
    return () => channel.close();
  }, []);
}
