import { useConnectCalendarMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  CONNECT_CALENDAR_COPIED,
  CONNECT_CALENDAR_COPY,
  CONNECT_CALENDAR_DESCRIPTION,
  CONNECT_CALENDAR_FAILED,
  CONNECT_CALENDAR_LOADING,
  CONNECT_CALENDAR_OPEN_GOOGLE,
  CONNECT_CALENDAR_TITLE,
  CONNECT_CALENDAR_TRIGGER,
} from "@/features/settings/components/ConnectCalendarDialog/ConnectCalendarDialog.constants";
import type { IConnectCalendarDialogProps } from "@/features/settings/components/ConnectCalendarDialog/ConnectCalendarDialog.interfaces";
import { ConsentDialog } from "@/features/settings/components/ConsentDialog";

export function ConnectCalendarDialog({ identityId }: IConnectCalendarDialogProps) {
  const connect = useConnectCalendarMutation();

  return (
    <ConsentDialog
      trigger={
        <Button variant="outline" size="sm">
          {CONNECT_CALENDAR_TRIGGER}
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
      onDialogOpen={() => connect.mutate(identityId)}
    />
  );
}
