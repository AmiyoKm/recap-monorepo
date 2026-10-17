import { createFileRoute } from "@tanstack/react-router";

import { readActivitySearch } from "@/features/activity/activity.helpers";
import type { IActivitySearch } from "@/features/activity/activity.interfaces";
import { ActivityContainer } from "@/features/activity/containers/ActivityContainer";

export const Route = createFileRoute("/_app/activity")({
  validateSearch: (search: Record<string, unknown>): IActivitySearch => readActivitySearch(search),
  component: ActivityRoute,
});

function ActivityRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ActivityContainer
      search={search}
      onSearchChange={(next) => void navigate({ search: next, replace: true })}
    />
  );
}
