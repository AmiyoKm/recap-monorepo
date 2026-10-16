import { Link } from "@tanstack/react-router";

import { providerLabel, statusLabel } from "@/api/identity/identity.helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SOURCE_MAP_IDENTITY_CONNECT,
  SOURCE_MAP_IDENTITY_NO_CONNECTIONS,
  SOURCE_MAP_IDENTITY_STAGGER_MS,
  SOURCE_MAP_STATUS_BADGE_VARIANTS,
  SOURCE_MAP_STATUS_DOT_CLASSES,
} from "@/features/dashboard/components/SourceMap/components/SourceMapIdentity/SourceMapIdentity.constants";
import type { ISourceMapIdentityProps } from "@/features/dashboard/components/SourceMap/components/SourceMapIdentity/SourceMapIdentity.interfaces";
import { cn } from "@/lib/utils";

export function SourceMapIdentity({ identity, order }: ISourceMapIdentityProps) {
  const label = identity.displayName ?? identity.email;
  const delay = { animationDelay: `${order * SOURCE_MAP_IDENTITY_STAGGER_MS}ms` };

  return (
    <section aria-label={identity.email} className="grid gap-4 sm:grid-cols-5 sm:gap-0">
      <div className="flex items-center gap-3 sm:col-span-2">
        <Avatar size="lg">
          {identity.avatarUrl && <AvatarImage src={identity.avatarUrl} alt={label} />}
          <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{identity.email}</p>
        </div>
        <span
          aria-hidden="true"
          style={delay}
          className="hidden h-px flex-1 origin-left bg-border motion-safe:animate-draw sm:ml-3 sm:block"
        />
      </div>
      <ul className="ml-5 flex flex-col gap-2 border-l pl-6 sm:col-span-3 sm:ml-0">
        {identity.connections.length === 0 && (
          <li className="relative flex items-center justify-between gap-3 py-1">
            <span aria-hidden="true" className="absolute top-1/2 -left-6 h-px w-4 bg-border" />
            <p className="text-sm text-muted-foreground">{SOURCE_MAP_IDENTITY_NO_CONNECTIONS}</p>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/settings">{SOURCE_MAP_IDENTITY_CONNECT}</Link>
            </Button>
          </li>
        )}
        {identity.connections.map((connection) => {
          return (
            <li
              key={connection.id}
              className="relative flex items-center justify-between gap-3 py-1"
            >
              <span
                aria-hidden="true"
                style={delay}
                className="absolute top-1/2 -left-6 h-px w-4 origin-left bg-border motion-safe:animate-draw"
              />
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    SOURCE_MAP_STATUS_DOT_CLASSES[connection.status],
                  )}
                />
                <span className="text-sm font-medium">{providerLabel(connection.provider)}</span>
                {connection.providerAccountEmail && (
                  <span className="truncate text-xs text-muted-foreground">
                    {connection.providerAccountEmail}
                  </span>
                )}
              </span>
              <Badge variant={SOURCE_MAP_STATUS_BADGE_VARIANTS[connection.status]}>
                {statusLabel(connection.status)}
              </Badge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
