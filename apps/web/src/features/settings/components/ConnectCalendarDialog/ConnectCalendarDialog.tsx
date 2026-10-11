import { useConnectCalendarMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  CONNECT_CALENDAR_COPIED,
  CONNECT_CALENDAR_COPY,
  CONNECT_CALENDAR_DESCRIPTION,
  CONNECT_CALENDAR_DONE,
  CONNECT_CALENDAR_FAILED,
  CONNECT_CALENDAR_LOADING,
  CONNECT_CALENDAR_OPEN_GOOGLE,
  CONNECT_CALENDAR_TITLE,
} from "@/features/settings/components/ConnectCalendarDialog/ConnectCalendarDialog.constants";
import type { IConnectCalendarDialogProps } from "@/features/settings/components/ConnectCalendarDialog/ConnectCalendarDialog.interfaces";
import { ConsentDialog } from "@/features/settings/components/ConsentDialog";

export function ConnectCalendarDialog({ identityId, triggerLabel }: IConnectCalendarDialogProps) {
  const connect = useConnectCalendarMutation();

  return (
    <ConsentDialog
      trigger={
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      }
      title={CONNECT_CALENDAR_TITLE}
      description={CONNECT_CALENDAR_DESCRIPTION}
      isPending={connect.isPending}
      isError={connect.isError}
      authorizeUrl={connect.data?.authorizeUrl}
      pendingText={CONNECT_CALENDAR_LOADING}
      failedText={CONNECT_CALENDAR_FAILED}
      copyText={CONNECT_CALENDAR_COPY}
      copiedText={CONNECT_CALENDAR_COPIED}
      openText={CONNECT_CALENDAR_OPEN_GOOGLE}
      doneText={CONNECT_CALENDAR_DONE}
      onDialogOpen={() => connect.mutate(identityId)}
    />
  );
}
