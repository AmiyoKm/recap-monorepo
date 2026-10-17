import {
  ACTIVITY_FIRST_PAGE,
  ACTIVITY_PAGE_MAX,
  ACTIVITY_SEARCH_MAX_LENGTH,
} from "@/api/activity/activity.constants";
import { EActivityKind, ESource } from "@/api/activity/activity.enums";
import type { IActivityFilters } from "@/api/activity/activity.interfaces";
import type { IActivitySearch } from "@/features/activity/activity.interfaces";
import { dayjs } from "@/shared/date/date.helpers";
import { readSearchString } from "@/shared/search/search.helpers";

function readStrings(search: Record<string, unknown>, key: string): string[] {
  const value = search[key];
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readKnown<TValue extends string>(
  values: TValue[],
  search: Record<string, unknown>,
  key: string,
): TValue[] | undefined {
  const known = values.filter((value) => readStrings(search, key).includes(value));
  if (known.length === 0) {
    return undefined;
  }
  return known;
}

function readDate(search: Record<string, unknown>, key: string): string | undefined {
  const value = readSearchString(search, key);
  if (!(value && dayjs(value, "YYYY-MM-DD", true).isValid())) {
    return undefined;
  }
  return value;
}

function readPage(search: Record<string, unknown>): number | undefined {
  const value = Number(search["page"]);
  if (!Number.isInteger(value) || value <= ACTIVITY_FIRST_PAGE || value > ACTIVITY_PAGE_MAX) {
    return undefined;
  }
  return value;
}

function readText(search: Record<string, unknown>): string | undefined {
  const value = readSearchString(search, "q")?.trim().slice(0, ACTIVITY_SEARCH_MAX_LENGTH);
  if (!value) {
    return undefined;
  }
  return value;
}

function readIdentityIds(search: Record<string, unknown>): string[] | undefined {
  const ids = readStrings(search, "identityId");
  if (ids.length === 0) {
    return undefined;
  }
  return ids;
}

export function readActivitySearch(search: Record<string, unknown>): IActivitySearch {
  return {
    from: readDate(search, "from"),
    to: readDate(search, "to"),
    source: readKnown(Object.values(ESource), search, "source"),
    identityId: readIdentityIds(search),
    kind: readKnown(Object.values(EActivityKind), search, "kind"),
    q: readText(search),
    page: readPage(search),
  };
}

export function toActivityFilters(search: IActivitySearch): IActivityFilters {
  return {
    from: search.from,
    to: search.to,
    sources: search.source ?? [],
    identityIds: search.identityId ?? [],
    kinds: search.kind ?? [],
    text: search.q,
    page: search.page ?? ACTIVITY_FIRST_PAGE,
  };
}

export function withSearchPatch(search: IActivitySearch, patch: IActivitySearch): IActivitySearch {
  return readActivitySearch({ ...search, page: undefined, ...patch });
}

export function hasActiveFilters(search: IActivitySearch): boolean {
  return Boolean(
    search.from || search.to || search.source || search.identityId || search.kind || search.q,
  );
}

export function toggleValue<TValue extends string>(
  selected: TValue[] | undefined,
  value: TValue,
): TValue[] | undefined {
  const current = selected ?? [];
  if (!current.includes(value)) {
    return [...current, value];
  }
  const rest = current.filter((entry) => entry !== value);
  if (rest.length === 0) {
    return undefined;
  }
  return rest;
}
