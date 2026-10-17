import { ActivityIcon } from "lucide-react";

import { useActivitiesQuery } from "@/api/activity/activity.queries";
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
import { ACTIVITY_DESCRIPTION, ACTIVITY_TITLE } from "@/features/activity/activity.constants";
import {
  hasActiveFilters,
  toActivityFilters,
  withSearchPatch,
} from "@/features/activity/activity.helpers";
import type { IActivitySearch } from "@/features/activity/activity.interfaces";
import { ActivityFilters } from "@/features/activity/components/ActivityFilters";
import { ActivityPagination } from "@/features/activity/components/ActivityPagination";
import { ActivityTable } from "@/features/activity/components/ActivityTable";
import {
  ACTIVITY_CLEAR_FILTERS,
  ACTIVITY_ITEM_FILTER,
  ACTIVITY_ITEM_FILTER_CLEAR,
  ACTIVITY_LOAD_FAILED,
  ACTIVITY_LOADING,
  ACTIVITY_RETRY,
} from "@/features/activity/containers/ActivityContainer/ActivityContainer.constants";
import { emptyCopy } from "@/features/activity/containers/ActivityContainer/ActivityContainer.helpers";
import type { IActivityContainerProps } from "@/features/activity/containers/ActivityContainer/ActivityContainer.interfaces";
import { AppPage } from "@/features/app-shell/components/AppPage";

export function ActivityContainer({ search, onSearchChange }: IActivityContainerProps) {
  const activities = useActivitiesQuery(toActivityFilters(search));
  const identities = useIdentitiesQuery();
  const isFiltered = hasActiveFilters(search);
  const copy = emptyCopy(isFiltered);
  const rows = activities.data?.rows ?? [];
  const showEmpty = activities.data?.total === 0;
  const isPastLastPage =
    activities.data !== undefined && activities.data.total > 0 && rows.length === 0;

  function changeSearch(patch: IActivitySearch) {
    onSearchChange(withSearchPatch(search, patch));
  }

  return (
    <AppPage title={ACTIVITY_TITLE} description={ACTIVITY_DESCRIPTION}>
      <div className="flex min-w-0 flex-col gap-4">
        <ActivityFilters
          search={search}
          identities={identities.data ?? []}
          onChange={changeSearch}
        />
        {search.id && (
          <Alert>
            <AlertTitle>{ACTIVITY_ITEM_FILTER}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => changeSearch({ id: undefined })}>
                {ACTIVITY_ITEM_FILTER_CLEAR}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {activities.isPending && (
          <Skeleton aria-label={ACTIVITY_LOADING} className="h-24 w-full rounded-xl" />
        )}
        {activities.isError && (
          <Alert variant="destructive">
            <AlertTitle>{ACTIVITY_LOAD_FAILED}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => void activities.refetch()}>
                {ACTIVITY_RETRY}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {showEmpty && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>{copy.title}</EmptyTitle>
              <EmptyDescription>{copy.description}</EmptyDescription>
            </EmptyHeader>
            {isFiltered && (
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => onSearchChange({})}>
                  {ACTIVITY_CLEAR_FILTERS}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
        {rows.length > 0 && <ActivityTable rows={rows} />}
        {activities.data && (rows.length > 0 || isPastLastPage) && (
          <ActivityPagination page={activities.data.page} total={activities.data.total} />
        )}
      </div>
    </AppPage>
  );
}
