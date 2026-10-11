import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EAuthPath, ESocialProvider } from "@/api/auth/auth.enums";
import { toAuthError, webUrl } from "@/api/auth/auth.helpers";
import type { IEmailSignInInput, IEmailSignUpInput } from "@/api/auth/auth.interfaces";
import { authKeys } from "@/api/auth/auth.keys";
import { authClient } from "@/api/client";
import type { ApiError } from "@/api/client/client.helpers";
import { identityKeys } from "@/api/identity/identity.keys";

export function useGoogleSignInMutation() {
  return useMutation<void, ApiError>({
    mutationFn: async () => {
      const { error } = await authClient.signIn.social({
        provider: ESocialProvider.GOOGLE,
        callbackURL: webUrl(EAuthPath.DASHBOARD),
        errorCallbackURL: webUrl(EAuthPath.SIGN_IN),
      });
      if (error) {
        throw toAuthError(error);
      }
    },
  });
}

export function useEmailSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, IEmailSignInInput>({
    mutationFn: async (input) => {
      const { error } = await authClient.signIn.email(input);
      if (error) {
        throw toAuthError(error);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useEmailSignUpMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, IEmailSignUpInput>({
    mutationFn: async (input) => {
      const { error } = await authClient.signUp.email(input);
      if (error) {
        throw toAuthError(error);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError>({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) {
        throw toAuthError(error);
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: identityKeys.all });
      queryClient.setQueryData(authKeys.session(), null);
    },
  });
}
