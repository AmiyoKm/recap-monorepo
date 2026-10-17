import { ACTIVITY_KIND_LABELS, SOURCE_LABELS } from "@/api/activity/activity.constants";
import { EActivityKind, ESource } from "@/api/activity/activity.enums";
import type { IFilterOption } from "@/features/activity/components/ActivityFilters/components/MultiSelectFilter/MultiSelectFilter.interfaces";

export const FILTER_SEARCH_LABEL = "Search";
export const FILTER_SEARCH_PLACEHOLDER = "Search title, person or detail";
export const FILTER_FROM_LABEL = "From";
export const FILTER_TO_LABEL = "To";
export const FILTER_SOURCE_LABEL = "Source";
export const FILTER_IDENTITY_LABEL = "Work Identity";
export const FILTER_KIND_LABEL = "Kind";

export const SOURCE_OPTIONS: IFilterOption<ESource>[] = Object.values(ESource).map((value) => ({
  value,
  label: SOURCE_LABELS[value],
}));

export const KIND_OPTIONS: IFilterOption<EActivityKind>[] = Object.values(EActivityKind).map(
  (value) => ({ value, label: ACTIVITY_KIND_LABELS[value] }),
);
