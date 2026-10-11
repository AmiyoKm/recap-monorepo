import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

import { identitiesFingerprint, identitiesGained } from "@/api/identity/identity.helpers";
import { useConnectResultSubscription, useIdentitiesQuery } from "@/api/identity/identity.queries";
import type { IConsentCompletionOptions } from "@/features/settings/components/ConsentDialog/ConsentDialog.interfaces";

export function useConsentCompletion({ isWaiting, doneText, onDone }: IConsentCompletionOptions) {
  const [baseline, setBaseline] = useState<string | null>(null);
  const identities = useIdentitiesQuery({ isWaitingForConsent: isWaiting });
  const fingerprint = identities.data ? identitiesFingerprint(identities.data) : null;
  const finish = useEffectEvent(() => {
    onDone();
    toast.success(doneText);
  });

  useConnectResultSubscription(onDone);

  useEffect(() => {
    if (!isWaiting || baseline === null || fingerprint === null) {
      return;
    }
    if (!identitiesGained(baseline, fingerprint)) {
      return;
    }
    finish();
  }, [isWaiting, baseline, fingerprint]);

  return { markBaseline: () => setBaseline(fingerprint) };
}
