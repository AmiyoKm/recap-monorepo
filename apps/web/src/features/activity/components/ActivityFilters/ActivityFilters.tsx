import { SearchIcon } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toggleValue } from "@/features/activity/activity.helpers";
import {
  FILTER_FROM_LABEL,
  FILTER_IDENTITY_LABEL,
  FILTER_KIND_LABEL,
  FILTER_SEARCH_LABEL,
  FILTER_SEARCH_PLACEHOLDER,
  FILTER_SOURCE_LABEL,
  FILTER_TO_LABEL,
  KIND_OPTIONS,
  SOURCE_OPTIONS,
} from "@/features/activity/components/ActivityFilters/ActivityFilters.constants";
import { useSearchDraft } from "@/features/activity/components/ActivityFilters/ActivityFilters.hooks";
import type { IActivityFiltersProps } from "@/features/activity/components/ActivityFilters/ActivityFilters.interfaces";
import { MultiSelectFilter } from "@/features/activity/components/ActivityFilters/components/MultiSelectFilter";

export function ActivityFilters({ search, identities, onChange }: IActivityFiltersProps) {
  const { draft, setDraft } = useSearchDraft({
    committed: search.q,
    onCommit: (q) => onChange({ q }),
  });
  const identityOptions = identities.map((identity) => ({
    value: identity.id,
    label: identity.email,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={FILTER_SEARCH_LABEL}
          placeholder={FILTER_SEARCH_PLACEHOLDER}
          value={draft}
          className="pl-8"
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label={FILTER_SOURCE_LABEL}
            options={SOURCE_OPTIONS}
            selected={search.source ?? []}
            onToggle={(value) => onChange({ source: toggleValue(search.source, value) })}
          />
          <MultiSelectFilter
            label={FILTER_IDENTITY_LABEL}
            options={identityOptions}
            selected={search.identityId ?? []}
            onToggle={(value) => onChange({ identityId: toggleValue(search.identityId, value) })}
          />
          <MultiSelectFilter
            label={FILTER_KIND_LABEL}
            options={KIND_OPTIONS}
            selected={search.kind ?? []}
            onToggle={(value) => onChange({ kind: toggleValue(search.kind, value) })}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Field>
            <FieldLabel>{FILTER_FROM_LABEL}</FieldLabel>
            <Input
              type="date"
              value={search.from ?? ""}
              max={search.to}
              onChange={(event) => onChange({ from: event.target.value || undefined })}
            />
          </Field>
          <Field>
            <FieldLabel>{FILTER_TO_LABEL}</FieldLabel>
            <Input
              type="date"
              value={search.to ?? ""}
              min={search.from}
              onChange={(event) => onChange({ to: event.target.value || undefined })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
