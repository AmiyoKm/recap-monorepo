import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

import { consentCompleted, identitiesFingerprint } from "@/api/identity/identity.helpers";
import { useIdentitiesQuery } from "@/api/identity/identity.queries";
import type { IConsentCompletionOptions } from "@/features/settings/components/ConsentDialog/ConsentDialog.interfaces";

export function useConsentCompletion({
  hasAuthorizeUrl,
  target,
  doneText,
  onDialogOpen,
}: IConsentCompletionOptions) {
  const [open, setOpen] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const isWaiting = open && hasAuthorizeUrl;
  const identities = useIdentitiesQuery({ isWaitingForConsent: isWaiting });
  const fingerprint = identities.data ? identitiesFingerprint(identities.data) : null;
  const finish = useEffectEvent(() => {
    setOpen(false);
    toast.success(doneText);
  });

  useEffect(() => {
    if (!isWaiting || baseline === null || fingerprint === null) {
      return;
    }
    if (!consentCompleted(baseline, fingerprint, target)) {
      return;
    }
    finish();
  }, [isWaiting, baseline, fingerprint, target]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setBaseline(fingerprint);
    if (!next) {
      return;
    }
    onDialogOpen();
  };

  return { open, isReady: fingerprint !== null, changeOpen };
}
