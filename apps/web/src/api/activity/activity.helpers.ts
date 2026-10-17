import { ACTIVITY_PAGE_SIZE } from "@/api/activity/activity.constants";
import type { IActivityFilters } from "@/api/activity/activity.interfaces";
import { dayjs } from "@/shared/date/date.helpers";

function startOfLocalDay(date: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  return dayjs(date).startOf("day").toISOString();
}

function endOfLocalDay(date: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  return dayjs(date).endOf("day").toISOString();
}

function nonEmpty<TValue>(values: TValue[]): TValue[] | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values;
}

export function toActivityQuery(filters: IActivityFilters) {
  return {
    from: startOfLocalDay(filters.from),
    to: endOfLocalDay(filters.to),
    source: nonEmpty(filters.sources),
    identityId: nonEmpty(filters.identityIds),
    kind: nonEmpty(filters.kinds),
    q: filters.text,
    page: filters.page,
    pageSize: ACTIVITY_PAGE_SIZE,
  };
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
}
