import type { EActivityKind, ESource } from "@/api/activity/activity.enums";

export interface IActivityFilters {
  ids: string[];
  from: string | undefined;
  to: string | undefined;
  sources: ESource[];
  identityIds: string[];
  kinds: EActivityKind[];
  text: string | undefined;
  page: number;
}
