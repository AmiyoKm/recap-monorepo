import { useDeleteIdentityMutation } from "@/api/identity/identity.mutations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectApiKeyDialog } from "@/features/settings/components/ConnectApiKeyDialog";
import { ConnectionRow } from "@/features/settings/components/ConnectionRow";
import {
  IDENTITY_CONNECT_CALENDAR,
  IDENTITY_CONNECT_NOTE,
  IDENTITY_CONNECTIONS_HEADING,
  IDENTITY_NO_CONNECTIONS,
  IDENTITY_REMOVE,
  IDENTITY_REMOVING,
} from "@/features/settings/components/IdentityCard/IdentityCard.constants";
import { identityInitials } from "@/features/settings/components/IdentityCard/IdentityCard.helpers";
import type { IIdentityCardProps } from "@/features/settings/components/IdentityCard/IdentityCard.interfaces";

export function IdentityCard({ identity }: IIdentityCardProps) {
  const removeIdentity = useDeleteIdentityMutation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              {identity.avatarUrl ? (
                <AvatarImage
                  src={identity.avatarUrl}
                  alt={identity.displayName ?? identity.email}
                />
              ) : null}
              <AvatarFallback>
                {identityInitials(identity.displayName, identity.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <CardTitle>{identity.displayName ?? identity.email}</CardTitle>
              <CardDescription>{identity.email}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={removeIdentity.isPending}
            onClick={() => removeIdentity.mutate(identity.id)}
          >
            {removeIdentity.isPending ? IDENTITY_REMOVING : IDENTITY_REMOVE}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{IDENTITY_CONNECTIONS_HEADING}</h2>
        {identity.connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{IDENTITY_NO_CONNECTIONS}</p>
        ) : null}
        {identity.connections.map((connection) => (
          <ConnectionRow key={connection.id} connection={connection} />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            {IDENTITY_CONNECT_CALENDAR}
          </Button>
          <ConnectApiKeyDialog identityId={identity.id} provider="jira" />
          <ConnectApiKeyDialog identityId={identity.id} provider="linear" />
        </div>
        <p className="text-sm text-muted-foreground">{IDENTITY_CONNECT_NOTE}</p>
      </CardContent>
    </Card>
  );
}
