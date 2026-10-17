import {
  PAGINATION_TOTAL,
  PAGINATION_TOTAL_ONE,
} from "@/features/activity/components/ActivityPagination/ActivityPagination.constants";

export function totalLabel(total: number): string {
  if (total === 1) {
    return PAGINATION_TOTAL_ONE;
  }
  return PAGINATION_TOTAL;
}
