import { describe, expect, test } from "bun:test";

import { ACTIVITY_PAGE_MAX, ACTIVITY_PAGE_SIZE } from "@/api/activity/activity.constants";
import { EActivityKind, ESource } from "@/api/activity/activity.enums";
import { pageCount, toActivityQuery } from "@/api/activity/activity.helpers";
import {
  hasActiveFilters,
  readActivitySearch,
  toActivityFilters,
  toggleValue,
  withSearchPatch,
} from "@/features/activity/activity.helpers";
import { emptyCopy } from "@/features/activity/containers/ActivityContainer/ActivityContainer.helpers";
import { dayjs } from "@/shared/date/date.helpers";

const SECOND_PAGE = 2;
const THIRD_PAGE = 3;
const MANY_ACTIVITIES = 51;

describe("readActivitySearch", () => {
  test("drops a page above the API maximum", () => {
    expect(readActivitySearch({ page: String(ACTIVITY_PAGE_MAX + 1) }).page).toBeUndefined();
  });

  test("keeps valid filters from the URL", () => {
    const search = readActivitySearch({
      from: "2026-10-10",
      to: "2026-10-17",
      source: ["calendar"],
      identityId: ["identity-1"],
      kind: ["calendar_event"],
      q: " planning ",
      page: "3",
    });

    expect(search).toEqual({
      from: "2026-10-10",
      to: "2026-10-17",
      source: [ESource.CALENDAR],
      identityId: ["identity-1"],
      kind: [EActivityKind.CALENDAR_EVENT],
      q: "planning",
      page: THIRD_PAGE,
    });
  });

  test("keeps Activity ids from a Digest link", () => {
    expect(readActivitySearch({ id: ["a-1", "a-2"] }).id).toEqual(["a-1", "a-2"]);
    expect(hasActiveFilters({ id: ["a-1"] })).toBe(true);
    expect(toActivityFilters({ id: ["a-1"] }).ids).toEqual(["a-1"]);
  });

  test("drops unknown values, bad dates and a first or invalid page", () => {
    const search = readActivitySearch({
      from: "yesterday",
      source: ["zoom"],
      kind: 7,
      q: "   ",
      page: "1",
    });

    expect(search).toEqual({
      from: undefined,
      to: undefined,
      source: undefined,
      identityId: undefined,
      kind: undefined,
      q: undefined,
      page: undefined,
    });
  });

  test("accepts a single value where an array is expected", () => {
    expect(readActivitySearch({ source: "gmail" }).source).toEqual([ESource.GMAIL]);
  });
});

describe("withSearchPatch", () => {
  test("goes back to the first page when a filter changes", () => {
    const next = withSearchPatch({ page: THIRD_PAGE, q: "a" }, { q: "b" });

    expect(next.q).toBe("b");
    expect(next.page).toBeUndefined();
  });

  test("keeps the page when the patch sets it", () => {
    expect(withSearchPatch({ q: "a" }, { page: SECOND_PAGE }).page).toBe(SECOND_PAGE);
  });

  test("clears a filter with undefined", () => {
    expect(withSearchPatch({ q: "a" }, { q: undefined }).q).toBeUndefined();
  });
});

describe("toggleValue", () => {
  test("adds a missing value and removes a present one", () => {
    expect(toggleValue(undefined, ESource.GMAIL)).toEqual([ESource.GMAIL]);
    expect(toggleValue([ESource.GMAIL, ESource.CHAT], ESource.GMAIL)).toEqual([ESource.CHAT]);
  });

  test("returns undefined when the last value goes", () => {
    expect(toggleValue([ESource.GMAIL], ESource.GMAIL)).toBeUndefined();
  });
});

describe("filters and query", () => {
  test("turns the search into API filters on page one by default", () => {
    const filters = toActivityFilters({ q: "plan" });

    expect(filters).toMatchObject({
      sources: [],
      identityIds: [],
      ids: [],
      kinds: [],
      text: "plan",
      page: 1,
    });
  });

  test("sends whole local days as ISO times and omits empty filters", () => {
    const query = toActivityQuery({
      from: "2026-10-10",
      to: "2026-10-10",
      sources: [],
      identityIds: [],
      ids: [],
      kinds: [],
      text: undefined,
      page: 1,
    });

    expect(query.source).toBeUndefined();
    expect(query.id).toBeUndefined();
    expect(query.pageSize).toBe(ACTIVITY_PAGE_SIZE);
    expect(dayjs(query.to).isAfter(dayjs(query.from))).toBe(true);
  });

  test("counts pages and always shows at least one", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(ACTIVITY_PAGE_SIZE)).toBe(1);
    expect(pageCount(MANY_ACTIVITIES)).toBe(THIRD_PAGE);
  });
});

describe("filter state", () => {
  test("knows when a filter is active", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ page: SECOND_PAGE })).toBe(false);
    expect(hasActiveFilters({ q: "a" })).toBe(true);
  });

  test("words the empty state by whether filters are on", () => {
    expect(emptyCopy(true).title).not.toBe(emptyCopy(false).title);
  });
});
