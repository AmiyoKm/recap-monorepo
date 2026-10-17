import { WaypointsIcon } from "lucide-react";

import { useIdentitiesQuery } from "@/api/identity/identity.queries";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
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
import { AppPage } from "@/features/app-shell/components/AppPage";
import { AddIdentityDialog } from "@/features/settings/components/AddIdentityDialog";
import { DigestCard } from "@/features/settings/components/DigestCard";
import { IdentityCard } from "@/features/settings/components/IdentityCard";
import {
  SETTINGS_DESCRIPTION,
  SETTINGS_EMPTY,
  SETTINGS_EMPTY_TITLE,
  SETTINGS_LOAD_FAILED,
  SETTINGS_LOADING,
  SETTINGS_RETRY,
  SETTINGS_TITLE,
} from "@/features/settings/containers/SettingsContainer/SettingsContainer.constants";

export function SettingsContainer() {
  const identities = useIdentitiesQuery();

  return (
    <AppPage
      title={SETTINGS_TITLE}
      description={SETTINGS_DESCRIPTION}
      actions={<AddIdentityDialog />}
    >
      <div className="flex w-full flex-col gap-6">
        {identities.isPending && (
          <Skeleton aria-label={SETTINGS_LOADING} className="h-24 w-full rounded-xl" />
        )}
        {identities.isError && (
          <Alert variant="destructive">
            <AlertTitle>{SETTINGS_LOAD_FAILED}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => void identities.refetch()}>
                {SETTINGS_RETRY}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {identities.data && identities.data.length === 0 && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WaypointsIcon />
              </EmptyMedia>
              <EmptyTitle>{SETTINGS_EMPTY_TITLE}</EmptyTitle>
              <EmptyDescription>{SETTINGS_EMPTY}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <AddIdentityDialog />
            </EmptyContent>
          </Empty>
        )}
        {identities.data?.map((identity) => (
          <IdentityCard key={identity.id} identity={identity} />
        ))}
        <DigestCard />
      </div>
    </AppPage>
  );
}
