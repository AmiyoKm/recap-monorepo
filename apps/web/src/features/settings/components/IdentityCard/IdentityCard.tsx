import { userInitial } from "@/api/auth/auth.helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { ConnectorRow } from "@/features/settings/components/ConnectorRow";
import { IdentityMenu } from "@/features/settings/components/IdentityCard/components/IdentityMenu";
import {
  IDENTITY_CONNECTORS,
  IDENTITY_TOOLS_LABEL,
} from "@/features/settings/components/IdentityCard/IdentityCard.constants";
import type { IIdentityCardProps } from "@/features/settings/components/IdentityCard/IdentityCard.interfaces";

export function IdentityCard({ identity }: IIdentityCardProps) {
  const name = identity.displayName ?? identity.email;

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9 rounded-lg after:rounded-lg">
            {identity.avatarUrl ? (
              <AvatarImage src={identity.avatarUrl} alt={name} className="rounded-lg" />
            ) : null}
            <AvatarFallback className="rounded-lg font-medium text-foreground">
              {userInitial(identity.displayName ?? "", identity.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="min-w-0">
              <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD} className="truncate">
                {name}
              </Heading>
            </CardTitle>
            {identity.displayName ? (
              <CardDescription className="truncate">{identity.email}</CardDescription>
            ) : null}
          </div>
        </div>
        <CardAction>
          <IdentityMenu identityId={identity.id} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul aria-label={IDENTITY_TOOLS_LABEL} className="flex flex-col divide-y border-t">
          {IDENTITY_CONNECTORS.map((provider) => (
            <ConnectorRow
              key={provider}
              identityId={identity.id}
              provider={provider}
              connection={identity.connections.find(
                (connection) => connection.provider === provider,
              )}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
