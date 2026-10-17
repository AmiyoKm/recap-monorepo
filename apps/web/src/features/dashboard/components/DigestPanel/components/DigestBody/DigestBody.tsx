import { NewspaperIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  DIGEST_BODY_EMPTY_TITLE,
  DIGEST_BODY_FAILED_DESCRIPTION,
  DIGEST_BODY_FAILED_TITLE,
  DIGEST_BODY_LOAD_FAILED,
  DIGEST_BODY_LOADING,
  DIGEST_BODY_NOTHING_NEW_DESCRIPTION,
  DIGEST_BODY_NOTHING_NEW_TITLE,
  DIGEST_BODY_PROGRESS_DESCRIPTION,
  DIGEST_BODY_PROGRESS_TITLE,
  DIGEST_BODY_REGENERATE,
  DIGEST_BODY_REGENERATE_FAILED,
  DIGEST_BODY_RETRY,
  DIGEST_BODY_TRUNCATED_DESCRIPTION,
  DIGEST_BODY_TRUNCATED_TITLE,
} from "@/features/dashboard/components/DigestPanel/components/DigestBody/DigestBody.constants";
import { emptyDescription } from "@/features/dashboard/components/DigestPanel/components/DigestBody/DigestBody.helpers";
import type { IDigestBodyProps } from "@/features/dashboard/components/DigestPanel/components/DigestBody/DigestBody.interfaces";
import { DigestMissingSources } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources";
import { DigestSectionCard } from "@/features/dashboard/components/DigestPanel/components/DigestSectionCard";
import { EDigestView } from "@/features/dashboard/components/DigestPanel/DigestPanel.enums";

export function DigestBody({
  view,
  digest,
  isToday,
  isRegenerating,
  regenerateError,
  onRegenerate,
  onRetry,
}: IDigestBodyProps) {
  const content = digest?.content;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {regenerateError && (
        <Alert variant="destructive">
          <AlertTitle>{DIGEST_BODY_REGENERATE_FAILED}</AlertTitle>
        </Alert>
      )}
      {view === EDigestView.LOADING && (
        <Skeleton aria-label={DIGEST_BODY_LOADING} className="h-24 w-full rounded-xl" />
      )}
      {view === EDigestView.ERROR && (
        <Alert variant="destructive">
          <AlertTitle>{DIGEST_BODY_LOAD_FAILED}</AlertTitle>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {DIGEST_BODY_RETRY}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {view === EDigestView.NOT_FOUND && (
        <Empty className="p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NewspaperIcon />
            </EmptyMedia>
            <EmptyTitle>{DIGEST_BODY_EMPTY_TITLE}</EmptyTitle>
            <EmptyDescription>{emptyDescription(isToday)}</EmptyDescription>
          </EmptyHeader>
          {isToday && (
            <EmptyContent>
              <Button size="sm" disabled={isRegenerating} onClick={onRegenerate}>
                {DIGEST_BODY_REGENERATE}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
      {view === EDigestView.IN_PROGRESS && (
        <Empty className="p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>{DIGEST_BODY_PROGRESS_TITLE}</EmptyTitle>
            <EmptyDescription>{DIGEST_BODY_PROGRESS_DESCRIPTION}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {view === EDigestView.FAILED && (
        <Alert variant="destructive">
          <AlertTitle>{DIGEST_BODY_FAILED_TITLE}</AlertTitle>
          <AlertDescription>{DIGEST_BODY_FAILED_DESCRIPTION}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" disabled={isRegenerating} onClick={onRegenerate}>
              {DIGEST_BODY_REGENERATE}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {view === EDigestView.READY && digest && (
        <DigestMissingSources missingSources={digest.missingSources} />
      )}
      {view === EDigestView.READY && content?.truncated && (
        <Alert>
          <AlertTitle>{DIGEST_BODY_TRUNCATED_TITLE}</AlertTitle>
          <AlertDescription>{DIGEST_BODY_TRUNCATED_DESCRIPTION}</AlertDescription>
        </Alert>
      )}
      {view === EDigestView.READY && content?.nothingNew && (
        <Alert>
          <AlertTitle>{DIGEST_BODY_NOTHING_NEW_TITLE}</AlertTitle>
          <AlertDescription>{DIGEST_BODY_NOTHING_NEW_DESCRIPTION}</AlertDescription>
        </Alert>
      )}
      {view === EDigestView.READY &&
        content?.sections.map((section) => (
          <DigestSectionCard key={section.identityId} section={section} />
        ))}
    </div>
  );
}
