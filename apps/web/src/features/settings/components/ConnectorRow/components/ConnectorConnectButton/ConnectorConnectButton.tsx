import { EProvider } from "@/api/identity/identity.enums";
import { ConnectApiKeyDialog } from "@/features/settings/components/ConnectApiKeyDialog";
import { ConnectCalendarDialog } from "@/features/settings/components/ConnectCalendarDialog";
import type { IConnectorConnectButtonProps } from "@/features/settings/components/ConnectorRow/components/ConnectorConnectButton/ConnectorConnectButton.interfaces";

export function ConnectorConnectButton({
  identityId,
  provider,
  label,
}: IConnectorConnectButtonProps) {
  if (provider === EProvider.GOOGLE_CALENDAR) {
    return <ConnectCalendarDialog identityId={identityId} triggerLabel={label} />;
  }
  return <ConnectApiKeyDialog identityId={identityId} provider={provider} triggerLabel={label} />;
}
