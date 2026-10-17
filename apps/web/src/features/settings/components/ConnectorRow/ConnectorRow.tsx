import { providerLabel } from "@/api/identity/identity.helpers";
import { useDeleteConnectionMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  CONNECTOR_DISCONNECT,
  CONNECTOR_DISCONNECTING,
  CONNECTOR_DOT_CLASSES,
} from "@/features/settings/components/ConnectorRow/ConnectorRow.constants";
import { EConnectorState } from "@/features/settings/components/ConnectorRow/ConnectorRow.enums";
import {
  canStartConsent,
  connectorConnectLabel,
  connectorDetail,
  connectorState,
} from "@/features/settings/components/ConnectorRow/ConnectorRow.helpers";
import type { IConnectorRowProps } from "@/features/settings/components/ConnectorRow/ConnectorRow.interfaces";
import { ProviderLogo } from "@/features/settings/components/ConnectorRow/components/ProviderLogo";
import { SourceBadges } from "@/features/settings/components/ConnectorRow/components/SourceBadges";
import { ConnectProviderDialog } from "@/features/settings/components/ConnectProviderDialog";
import { cn } from "@/lib/utils";

export function ConnectorRow({ identityId, provider, connection }: IConnectorRowProps) {
  const disconnect = useDeleteConnectionMutation();
  const state = connectorState(connection);
  const needsReconnect = state === EConnectorState.NEEDS_RECONNECT;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <ProviderLogo provider={provider} />
      <div className="flex min-w-40 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{providerLabel(provider)}</p>
        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
            needsReconnect && "text-destructive",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", CONNECTOR_DOT_CLASSES[state])}
          />
          <span className="truncate">
            {connectorDetail(state, connection?.providerAccountEmail)}
          </span>
        </p>
        {connection && state === EConnectorState.ACTIVE && (
          <SourceBadges sources={connection.sources} />
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {connection && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(connection.id)}
          >
            {disconnect.isPending && CONNECTOR_DISCONNECTING}
            {!disconnect.isPending && CONNECTOR_DISCONNECT}
          </Button>
        )}
        {canStartConsent(provider, state) && (
          <ConnectProviderDialog
            identityId={identityId}
            provider={provider}
            connection={connection}
            triggerLabel={connectorConnectLabel(state)}
          />
        )}
      </div>
    </li>
  );
}
