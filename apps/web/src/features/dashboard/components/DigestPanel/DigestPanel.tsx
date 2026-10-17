import { useState } from "react";

import { useRegenerateDigestMutation } from "@/api/digest/digest.mutations";
import { useDigestListQuery, useDigestQuery } from "@/api/digest/digest.queries";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { DigestBody } from "@/features/dashboard/components/DigestPanel/components/DigestBody";
import { DigestDatePicker } from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker";
import {
  DIGEST_PANEL_REGENERATE,
  DIGEST_PANEL_TITLE,
  DIGEST_PANEL_TODAY,
} from "@/features/dashboard/components/DigestPanel/DigestPanel.constants";
import {
  digestView,
  isRegenerateDisabled,
} from "@/features/dashboard/components/DigestPanel/DigestPanel.helpers";

export function DigestPanel() {
  const [pickedDate, setPickedDate] = useState<string | undefined>(undefined);
  const list = useDigestListQuery();
  const regenerate = useRegenerateDigestMutation();
  const date = pickedDate ?? list.data?.today;
  const digest = useDigestQuery(date);
  const view = digestView({
    isPending: list.isPending || digest.isPending,
    isListError: list.isError,
    error: digest.error,
    digest: digest.data,
  });
  const isToday = date !== undefined && date === list.data?.today;

  function handleRegenerate() {
    setPickedDate(undefined);
    regenerate.mutate();
  }

  function handleRetry() {
    void list.refetch();
    void digest.refetch();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {DIGEST_PANEL_TITLE}
          </Heading>
        </CardTitle>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          {date && list.data && (
            <DigestDatePicker
              date={date}
              dates={list.data.dates}
              onSelect={(next) => setPickedDate(next)}
            />
          )}
          {!isToday && pickedDate && (
            <Button variant="ghost" size="sm" onClick={() => setPickedDate(undefined)}>
              {DIGEST_PANEL_TODAY}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isRegenerateDisabled(view, regenerate.isPending)}
            onClick={handleRegenerate}
          >
            {regenerate.isPending && <Spinner />}
            {DIGEST_PANEL_REGENERATE}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DigestBody
          view={view}
          digest={digest.data}
          isToday={isToday}
          isRegenerating={regenerate.isPending}
          regenerateError={regenerate.error}
          onRegenerate={handleRegenerate}
          onRetry={handleRetry}
        />
      </CardContent>
    </Card>
  );
}
