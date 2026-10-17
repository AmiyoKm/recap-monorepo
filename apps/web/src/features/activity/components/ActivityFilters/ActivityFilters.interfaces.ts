import type { TIdentity } from "@/api/identity/identity.types";
import type { IActivitySearch } from "@/features/activity/activity.interfaces";

export interface IActivityFiltersProps {
  search: IActivitySearch;
  identities: TIdentity[];
  onChange: (patch: IActivitySearch) => void;
}

export interface ISearchDraftInput {
  committed: string | undefined;
  onCommit: (text: string | undefined) => void;
}
