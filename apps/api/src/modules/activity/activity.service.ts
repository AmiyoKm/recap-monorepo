import {
  ACTIVITY_PAGE_DEFAULT,
  ACTIVITY_PAGE_SIZE_DEFAULT,
} from "#api/modules/activity/activity.constants";
import { nonEmpty, toActivityView } from "#api/modules/activity/activity.helpers";
import { ActivityRepository } from "#api/modules/activity/activity.repository";
import type {
  TActivityListQuery,
  TActivityListResponse,
} from "#api/modules/activity/activity.types";

export abstract class ActivityService {
  static async listActivities(
    userId: string,
    query: TActivityListQuery,
  ): Promise<TActivityListResponse> {
    const page = query.page ?? ACTIVITY_PAGE_DEFAULT;
    const pageSize = query.pageSize ?? ACTIVITY_PAGE_SIZE_DEFAULT;
    const filters = {
      userId,
      from: query.from,
      to: query.to,
      sources: nonEmpty(query.source),
      identityIds: nonEmpty(query.identityId),
      kinds: nonEmpty(query.kind),
      text: query.q?.trim() || undefined,
      page,
      pageSize,
    };
    const [rows, total] = await Promise.all([
      ActivityRepository.list(filters),
      ActivityRepository.count(filters),
    ]);
    return { rows: rows.map((row) => toActivityView(row)), total, page, pageSize };
  }
}
