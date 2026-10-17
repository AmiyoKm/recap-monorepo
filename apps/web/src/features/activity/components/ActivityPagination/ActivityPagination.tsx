import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { pageCount } from "@/api/activity/activity.helpers";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import {
  PAGINATION_NEXT,
  PAGINATION_OF,
  PAGINATION_PAGE_OF,
  PAGINATION_PREVIOUS,
} from "@/features/activity/components/ActivityPagination/ActivityPagination.constants";
import { totalLabel } from "@/features/activity/components/ActivityPagination/ActivityPagination.helpers";
import type { IActivityPaginationProps } from "@/features/activity/components/ActivityPagination/ActivityPagination.interfaces";

export function ActivityPagination({ page, total }: IActivityPaginationProps) {
  const pages = pageCount(total);
  const hasPrevious = page > 1;
  const hasNext = page < pages;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {PAGINATION_PAGE_OF} {page} {PAGINATION_OF} {pages}, {total} {totalLabel(total)}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            {hasPrevious && (
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/activity"
                  search={(previous) => ({ ...previous, page: Math.min(page - 1, pages) })}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  {PAGINATION_PREVIOUS}
                </Link>
              </Button>
            )}
            {!hasPrevious && (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeftIcon data-icon="inline-start" />
                {PAGINATION_PREVIOUS}
              </Button>
            )}
          </PaginationItem>
          <PaginationItem>
            {hasNext && (
              <Button asChild variant="outline" size="sm">
                <Link to="/activity" search={(previous) => ({ ...previous, page: page + 1 })}>
                  {PAGINATION_NEXT}
                  <ChevronRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            )}
            {!hasNext && (
              <Button variant="outline" size="sm" disabled>
                {PAGINATION_NEXT}
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
