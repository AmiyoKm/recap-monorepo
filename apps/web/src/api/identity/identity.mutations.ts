import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { ensureOk } from "@/api/client/client.helpers";
import { identityKeys } from "@/api/identity/identity.keys";

export function useConnectIdentityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ensureOk(api.identities.connect.post()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useConnectCalendarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identityId: string) =>
      ensureOk(api.identities({ identityId }).connections.post({ provider: "google-calendar" })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useDeleteIdentityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identityId: string) => ensureOk(api.identities({ identityId }).delete()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}

export function useDeleteConnectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => ensureOk(api.connections({ connectionId }).delete()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}
