import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { toActivityQuery } from "@/api/activity/activity.helpers";
import type { IActivityFilters } from "@/api/activity/activity.interfaces";
import { activityKeys } from "@/api/activity/activity.keys";
import type { TActivitiesData, TActivitiesError } from "@/api/activity/activity.types";
import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";

function activitiesQueryOptions(filters: IActivityFilters) {
  return queryOptions<TActivitiesData, ApiError<TActivitiesError>>({
    queryKey: activityKeys.list(filters),
    queryFn: () => ensureOk(api.activities.get({ query: toActivityQuery(filters) })),
    placeholderData: keepPreviousData,
  });
}

export function useActivitiesQuery(filters: IActivityFilters) {
  return useQuery(activitiesQueryOptions(filters));
}
