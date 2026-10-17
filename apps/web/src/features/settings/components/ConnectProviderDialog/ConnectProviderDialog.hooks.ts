import { useState } from "react";

import { type EGoogleSource, EProvider } from "@/api/identity/identity.enums";
import { useConnectProviderMutation } from "@/api/identity/identity.mutations";
import type { IProviderConsentOptions } from "@/features/settings/components/ConnectProviderDialog/ConnectProviderDialog.interfaces";
import { defaultSources } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.helpers";

export function useProviderConsent({ identityId, provider, connection }: IProviderConsentOptions) {
  const connect = useConnectProviderMutation();
  const [sources, setSources] = useState<EGoogleSource[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const isGoogle = provider === EProvider.GOOGLE;

  const startConsent = () => {
    if (!isGoogle) {
      connect.mutate({ identityId, provider });
      return;
    }
    connect.reset();
    setSources(defaultSources(connection));
    setIsPicking(true);
  };

  const continueWithSources = () => {
    setIsPicking(false);
    connect.mutate({ identityId, provider, sources });
  };

  return { connect, sources, setSources, isPicking, startConsent, continueWithSources };
}
