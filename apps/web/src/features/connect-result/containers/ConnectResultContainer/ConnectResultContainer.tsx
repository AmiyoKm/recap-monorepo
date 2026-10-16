import { Link } from "@tanstack/react-router";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { useEffect } from "react";

import { publishConnectResult, toKnownConnected } from "@/api/identity/identity.helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/features/app-shell/components/Container";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Wordmark } from "@/features/app-shell/components/Wordmark";
import {
  CONNECT_RESULT_CLOSE_NOTE,
  CONNECT_RESULT_OPEN_SETTINGS,
} from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.constants";
import {
  connectResultDescription,
  connectResultTitle,
  settingsButtonVariant,
} from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.helpers";
import type { IConnectResultContainerProps } from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.interfaces";

export function ConnectResultContainer({ email, error, ...search }: IConnectResultContainerProps) {
  const connected = toKnownConnected(search.connected);
  const isSuccess = !error && Boolean(connected);
  const title = connectResultTitle(connected, error);
  const description = connectResultDescription(connected, error);

  useEffect(() => {
    publishConnectResult({ connected, email, error });
  }, [connected, email, error]);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <Container className="flex h-14 items-center">
          <Wordmark to="/" />
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-start gap-6">
            {isSuccess && <CircleCheckIcon aria-hidden className="size-10 text-success" />}
            {!isSuccess && <CircleAlertIcon aria-hidden className="size-10 text-destructive" />}
            <div className="flex w-full min-w-0 flex-col gap-2">
              <Heading as={EHeadingTag.H1} variant={EHeadingVariant.TITLE}>
                {title}
              </Heading>
              {isSuccess && email && <p className="truncate text-sm font-medium">{email}</p>}
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {isSuccess && (
              <p className="text-sm text-muted-foreground">{CONNECT_RESULT_CLOSE_NOTE}</p>
            )}
            <Button asChild variant={settingsButtonVariant(isSuccess)}>
              <Link to="/settings">{CONNECT_RESULT_OPEN_SETTINGS}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
