import type { IActivityFilters } from "@/api/activity/activity.interfaces";

export const activityKeys = {
  all: ["activity"] as const,
  list: (filters: IActivityFilters) => [...activityKeys.all, "list", filters] as const,
};
