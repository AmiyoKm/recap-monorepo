import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { EClientMessages } from "@/api/client/client.enums";
import { ensureOk } from "@/api/client/client.helpers";
import type { IConnectApiKeyInput } from "@/api/identity/identity.interfaces";
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
    mutationFn: async (identityId: string) => {
      const data: unknown = await ensureOk(
        api.identities({ identityId }).connections.post({ provider: "google-calendar" }),
      );
      if (
        typeof data === "object" &&
        data !== null &&
        "authorizeUrl" in data &&
        typeof data.authorizeUrl === "string"
      ) {
        return { authorizeUrl: data.authorizeUrl };
      }
      throw new Error(EClientMessages.REQUEST_FAILED);
    },
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

export function useConnectApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identityId, provider, apiKey }: IConnectApiKeyInput) =>
      ensureOk(api.identities({ identityId }).connections.post({ provider, apiKey })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.all });
    },
  });
}
