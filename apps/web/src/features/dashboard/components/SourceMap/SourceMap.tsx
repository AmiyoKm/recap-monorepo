import { Link } from "@tanstack/react-router";
import { WaypointsIcon } from "lucide-react";

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { SourceMapIdentity } from "@/features/dashboard/components/SourceMap/components/SourceMapIdentity";
import {
  SOURCE_MAP_DESCRIPTION,
  SOURCE_MAP_EMPTY_ACTION,
  SOURCE_MAP_EMPTY_DESCRIPTION,
  SOURCE_MAP_EMPTY_TITLE,
  SOURCE_MAP_FAILED,
  SOURCE_MAP_MANAGE,
  SOURCE_MAP_RETRY,
  SOURCE_MAP_TITLE,
} from "@/features/dashboard/components/SourceMap/SourceMap.constants";
import type { ISourceMapProps } from "@/features/dashboard/components/SourceMap/SourceMap.interfaces";

export function SourceMap({ identities, isPending, isError, onRetry }: ISourceMapProps) {
  const isEmpty = identities?.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {SOURCE_MAP_TITLE}
          </Heading>
        </CardTitle>
        <CardDescription className="max-w-prose">{SOURCE_MAP_DESCRIPTION}</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">{SOURCE_MAP_MANAGE}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {isPending && <Skeleton className="h-24 w-full" />}
        {isError && (
          <Alert variant="destructive">
            <AlertTitle>{SOURCE_MAP_FAILED}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={onRetry}>
                {SOURCE_MAP_RETRY}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {isEmpty && (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WaypointsIcon />
              </EmptyMedia>
              <EmptyTitle>{SOURCE_MAP_EMPTY_TITLE}</EmptyTitle>
              <EmptyDescription>{SOURCE_MAP_EMPTY_DESCRIPTION}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/settings">{SOURCE_MAP_EMPTY_ACTION}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}
        {identities?.map((identity, index) => (
          <SourceMapIdentity key={identity.id} identity={identity} order={index} />
        ))}
      </CardContent>
    </Card>
  );
}
