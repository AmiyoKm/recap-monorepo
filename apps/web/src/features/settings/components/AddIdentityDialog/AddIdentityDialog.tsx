import { EConsentTarget } from "@/api/identity/identity.enums";
import { useConnectIdentityMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  ADD_IDENTITY_COPIED,
  ADD_IDENTITY_COPY,
  ADD_IDENTITY_DESCRIPTION,
  ADD_IDENTITY_DONE,
  ADD_IDENTITY_FAILED,
  ADD_IDENTITY_LOADING,
  ADD_IDENTITY_OPEN_GOOGLE,
  ADD_IDENTITY_TITLE,
  ADD_IDENTITY_TRIGGER,
} from "@/features/settings/components/AddIdentityDialog/AddIdentityDialog.constants";
import { ConsentDialog } from "@/features/settings/components/ConsentDialog";

export function AddIdentityDialog() {
  const connect = useConnectIdentityMutation();

  return (
    <ConsentDialog
      trigger={<Button>{ADD_IDENTITY_TRIGGER}</Button>}
      title={ADD_IDENTITY_TITLE}
      description={ADD_IDENTITY_DESCRIPTION}
      isPending={connect.isPending}
      isError={connect.isError}
      authorizeUrl={connect.data?.authorizeUrl}
      pendingText={ADD_IDENTITY_LOADING}
      failedText={ADD_IDENTITY_FAILED}
      copyText={ADD_IDENTITY_COPY}
      copiedText={ADD_IDENTITY_COPIED}
      openText={ADD_IDENTITY_OPEN_GOOGLE}
      doneText={ADD_IDENTITY_DONE}
      target={{ kind: EConsentTarget.IDENTITY }}
      onDialogOpen={() => connect.mutate()}
    />
  );
}
