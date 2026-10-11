import { Skeleton } from "@/components/ui/skeleton";
import type { IWorkAccountCountProps } from "@/features/profile/components/ProfileDetails/components/WorkAccountCount/WorkAccountCount.interfaces";
import { PROFILE_DETAILS_WORK_ACCOUNTS_UNAVAILABLE } from "@/features/profile/components/ProfileDetails/ProfileDetails.constants";

export function WorkAccountCount({ count, isError }: IWorkAccountCountProps) {
  if (count !== undefined) {
    return <span className="tabular-nums">{count}</span>;
  }
  if (isError) {
    return (
      <span className="text-muted-foreground">{PROFILE_DETAILS_WORK_ACCOUNTS_UNAVAILABLE}</span>
    );
  }
  return <Skeleton className="h-4 w-8" />;
}
