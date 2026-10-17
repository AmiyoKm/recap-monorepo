import { Elysia } from "elysia";

import { activityListQuery, activityListResponse } from "#api/modules/activity/activity.model";
import { ActivityService } from "#api/modules/activity/activity.service";
import { unauthorizedError } from "#api/modules/auth/auth.model";
import { authModule } from "#api/modules/auth/auth.module";

export const activityModule = new Elysia({ name: "activity" })
  .use(authModule)
  .get("/activities", ({ user, query }) => ActivityService.listActivities(user.id, query), {
    auth: true,
    query: activityListQuery,
    response: { 200: activityListResponse, 401: unauthorizedError },
  });
