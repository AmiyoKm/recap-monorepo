import type { schema } from "@recap/db";

import type {
  activityListQuery,
  activityListResponse,
  activityResponse,
} from "#api/modules/activity/activity.model";

export type TActivityInsert = typeof schema.activity.$inferInsert;
export type TActivityListQuery = typeof activityListQuery.static;
export type TActivityResponse = typeof activityResponse.static;
export type TActivityListResponse = typeof activityListResponse.static;
export type TActivityListRow = Omit<TActivityResponse, "source" | "kind"> & {
  source: string;
  kind: string;
};
