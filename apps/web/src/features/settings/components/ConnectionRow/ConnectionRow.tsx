import { useDeleteConnectionMutation } from "@/api/identity/identity.mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CONNECTION_ACTIVE_LABEL,
  CONNECTION_ACTIVE_STATUS,
  CONNECTION_DISCONNECT,
  CONNECTION_DISCONNECTING,
  CONNECTION_NEEDS_RECONNECT_LABEL,
  CONNECTION_PROVIDER_LABELS,
} from "@/features/settings/components/ConnectionRow/ConnectionRow.constants";
import type { IConnectionRowProps } from "@/features/settings/components/ConnectionRow/ConnectionRow.interfaces";

export function ConnectionRow({ connection }: IConnectionRowProps) {
  const disconnect = useDeleteConnectionMutation();
  const isActive = connection.status === CONNECTION_ACTIVE_STATUS;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col">
        <p className="text-sm font-medium">
          {CONNECTION_PROVIDER_LABELS[connection.provider] ?? connection.provider}
        </p>
        {connection.providerAccountEmail ? (
          <p className="text-sm text-muted-foreground">{connection.providerAccountEmail}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isActive ? "secondary" : "destructive"}>
          {isActive ? CONNECTION_ACTIVE_LABEL : CONNECTION_NEEDS_RECONNECT_LABEL}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate(connection.id)}
        >
          {disconnect.isPending ? CONNECTION_DISCONNECTING : CONNECTION_DISCONNECT}
        </Button>
      </div>
    </div>
  );
}
