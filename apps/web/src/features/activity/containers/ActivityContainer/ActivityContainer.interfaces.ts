import type { IActivitySearch } from "@/features/activity/activity.interfaces";

export interface IActivityContainerProps {
  search: IActivitySearch;
  onSearchChange: (search: IActivitySearch) => void;
}

export interface IActivityEmptyCopy {
  title: string;
  description: string;
}
