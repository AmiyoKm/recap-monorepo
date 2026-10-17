import type { EActivityKind, ESource } from "@/api/activity/activity.enums";

export interface IActivitySearch {
  from?: string;
  to?: string;
  source?: ESource[];
  identityId?: string[];
  id?: string[];
  kind?: EActivityKind[];
  q?: string;
  page?: number;
}
