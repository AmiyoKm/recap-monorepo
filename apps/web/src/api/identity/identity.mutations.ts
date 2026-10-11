import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";
import { EProvider } from "@/api/identity/identity.enums";
import { readAuthorizeUrl } from "@/api/identity/identity.helpers";
import type { IAuthorizeResult, IConnectApiKeyInput } from "@/api/identity/identity.interfaces";
import { identityKeys } from "@/api/identity/identity.keys";
import type {
  TConnectConnectionData,
  TConnectConnectionError,
  TConnectIdentityData,
  TConnectIdentityError,
  TDeleteConnectionData,
  TDeleteConnectionError,
  TDeleteIdentityData,
  TDeleteIdentityError,
} from "@/api/identity/identity.types";

export function useConnectIdentityMutation() {
  const queryClient = useQueryClient();
  return useMutation<TConnectIdentityData, ApiError<TConnectIdentityError>>({
    mutationFn: () => ensureOk(api.identities.connect.post()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useConnectCalendarMutation() {
  const queryClient = useQueryClient();
  return useMutation<IAuthorizeResult, ApiError<TConnectConnectionError>, string>({
    mutationFn: async (identityId) => {
      const data = await ensureOk(
        api.identities({ identityId }).connections.post({ provider: EProvider.GOOGLE_CALENDAR }),
      );
      return { authorizeUrl: readAuthorizeUrl(data) };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useDeleteIdentityMutation() {
  const queryClient = useQueryClient();
  return useMutation<TDeleteIdentityData, ApiError<TDeleteIdentityError>, string>({
    mutationFn: (identityId) => ensureOk(api.identities({ identityId }).delete()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useDeleteConnectionMutation() {
  const queryClient = useQueryClient();
  return useMutation<TDeleteConnectionData, ApiError<TDeleteConnectionError>, string>({
    mutationFn: (connectionId) => ensureOk(api.connections({ connectionId }).delete()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useConnectApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    TConnectConnectionData,
    ApiError<TConnectConnectionError>,
    IConnectApiKeyInput
  >({
    mutationFn: ({ identityId, provider, apiKey, email, site }) =>
      ensureOk(api.identities({ identityId }).connections.post({ provider, apiKey, email, site })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}
