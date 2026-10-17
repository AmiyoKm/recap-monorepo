import { describe, expect, test } from "bun:test";

import type { TActivityListRow } from "#api/modules/activity/activity.types";
import {
  DIGEST_ITEM_ACTIVITY_IDS_MAX,
  DIGEST_ITEM_TEXT_MAX_LENGTH,
  DIGEST_ITEMS_MAX,
  DIGEST_SECTIONS_MAX,
} from "#api/modules/digest/digest.constants";
import {
  buildNothingNewContent,
  capWindowRows,
  defaultWindowStart,
  isDigestDue,
  isSupportedTimeZone,
  localDigestDate,
  nextDigestRunAt,
  parseDigestContent,
  startOfNextLocalDay,
  toDigestContent,
  toDigestStart,
} from "#api/modules/digest/digest.helpers";
import type { IDigestContentInput } from "#api/modules/digest/digest.interfaces";

const OVERFLOW = 5;

describe("nextDigestRunAt", () => {
  test.each([
    {
      name: "Dhaka Wednesday before 8:00",
      now: "2026-10-14T01:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-14T02:00:00.000Z",
    },
    {
      name: "Dhaka Wednesday after 8:00",
      now: "2026-10-14T03:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-15T02:00:00.000Z",
    },
    {
      name: "exactly 8:00 goes to the next day",
      now: "2026-10-14T02:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-15T02:00:00.000Z",
    },
    {
      name: "Friday after 8:00 goes to Monday",
      now: "2026-10-16T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Saturday goes to Monday",
      now: "2026-10-17T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Sunday goes to Monday",
      now: "2026-10-18T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Monday before 8:00 stays on Monday",
      now: "2026-10-18T20:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "UTC Thursday before 8:00",
      now: "2026-10-15T06:30:00.000Z",
      zone: "UTC",
      expected: "2026-10-15T08:00:00.000Z",
    },
    {
      name: "New York in daylight time",
      now: "2026-10-14T15:00:00.000Z",
      zone: "America/New_York",
      expected: "2026-10-15T12:00:00.000Z",
    },
    {
      name: "New York after the clocks change",
      now: "2026-11-05T15:00:00.000Z",
      zone: "America/New_York",
      expected: "2026-11-06T13:00:00.000Z",
    },
    {
      name: "Tokyo is already Friday while UTC is Thursday",
      now: "2026-10-15T20:00:00.000Z",
      zone: "Asia/Tokyo",
      expected: "2026-10-15T23:00:00.000Z",
    },
    {
      name: "Los Angeles Friday evening goes to Monday",
      now: "2026-10-17T02:00:00.000Z",
      zone: "America/Los_Angeles",
      expected: "2026-10-19T15:00:00.000Z",
    },
  ])("$name", ({ now, zone, expected }) => {
    expect(nextDigestRunAt(now, zone)).toBe(expected);
  });
});

describe("isSupportedTimeZone", () => {
  test.each([
    { zone: "Asia/Dhaka", expected: true },
    { zone: "UTC", expected: true },
    { zone: "America/New_York", expected: true },
    { zone: "Mars/Olympus", expected: false },
    { zone: "", expected: false },
    { zone: "asia/dhaka", expected: false },
  ])("$zone is $expected", ({ zone, expected }) => {
    expect(isSupportedTimeZone(zone)).toBe(expected);
  });
});

const DHAKA = "Asia/Dhaka";
const NEW_YORK = "America/New_York";

describe("isDigestDue", () => {
  test.each([
    {
      name: "8:00 on a Wednesday",
      now: "2026-10-14T02:00:00.000Z",
      zone: DHAKA,
      done: [],
      due: true,
    },
    {
      name: "8:59 on a Wednesday",
      now: "2026-10-14T02:59:00.000Z",
      zone: DHAKA,
      done: [],
      due: true,
    },
    { name: "7:59", now: "2026-10-14T01:59:00.000Z", zone: DHAKA, done: [], due: false },
    { name: "9:00", now: "2026-10-14T03:00:00.000Z", zone: DHAKA, done: [], due: false },
    {
      name: "8:00 on a Saturday",
      now: "2026-10-17T02:00:00.000Z",
      zone: DHAKA,
      done: [],
      due: false,
    },
    {
      name: "8:00 on a Sunday",
      now: "2026-10-18T02:00:00.000Z",
      zone: DHAKA,
      done: [],
      due: false,
    },
    { name: "8:00 on a Monday", now: "2026-10-19T02:00:00.000Z", zone: DHAKA, done: [], due: true },
    {
      name: "a Digest row exists for the local date",
      now: "2026-10-14T02:00:00.000Z",
      zone: DHAKA,
      done: ["2026-10-14"],
      due: false,
    },
    {
      name: "a Digest row exists for another date only",
      now: "2026-10-14T02:00:00.000Z",
      zone: DHAKA,
      done: ["2026-10-13"],
      due: true,
    },
    {
      name: "8:00 in New York",
      now: "2026-10-14T12:00:00.000Z",
      zone: NEW_YORK,
      done: [],
      due: true,
    },
    {
      name: "Dhaka 8:00 is 22:00 in New York",
      now: "2026-10-14T02:00:00.000Z",
      zone: NEW_YORK,
      done: [],
      due: false,
    },
  ])("$name", ({ now, zone, done, due }) => {
    expect(isDigestDue({ now, timeZone: zone, existingDates: done })).toBe(due);
  });
});

describe("defaultWindowStart", () => {
  test.each([
    {
      name: "24 hours before on a Wednesday",
      now: "2026-10-14T02:00:00.000Z",
      expected: "2026-10-13T02:00:00.000Z",
    },
    {
      name: "Friday 8:00 local on a Monday",
      now: "2026-10-19T02:00:00.000Z",
      expected: "2026-10-16T02:00:00.000Z",
    },
    {
      name: "24 hours before on a Saturday",
      now: "2026-10-17T05:00:00.000Z",
      expected: "2026-10-16T05:00:00.000Z",
    },
  ])("starts $name", ({ now, expected }) => {
    expect(defaultWindowStart(now, DHAKA)).toBe(expected);
  });
});

describe("local date helpers", () => {
  test("localDigestDate uses the user's zone", () => {
    expect(localDigestDate("2026-10-13T20:30:00.000Z", DHAKA)).toBe("2026-10-14");
    expect(localDigestDate("2026-10-13T20:30:00.000Z", NEW_YORK)).toBe("2026-10-13");
  });

  test("startOfNextLocalDay is local midnight", () => {
    expect(startOfNextLocalDay("2026-10-14", DHAKA)).toBe("2026-10-14T18:00:00.000Z");
  });
});

const IDENTITIES = [
  { id: "ident-work", email: "work@example.test" },
  { id: "ident-side", email: "side@example.test" },
];

function row(id: string, identityId: string, title: string): TActivityListRow {
  return {
    id,
    identityId,
    identityEmail: "work@example.test",
    source: "calendar",
    kind: "calendar_event",
    occurredAt: "2026-10-14T05:30:00.000Z",
    endsAt: null,
    title,
    url: "https://calendar.example.test/e",
    actor: null,
    detail: null,
  };
}

function contentInput(overrides: Partial<IDigestContentInput> = {}): IDigestContentInput {
  return {
    identities: IDENTITIES,
    windowRows: [],
    aheadRows: [],
    timeZone: DHAKA,
    isTruncated: false,
    ...overrides,
  };
}

const EMPTY_AI_SECTION = { highlights: [], meetingsAhead: [], needsYou: [] };

describe("buildNothingNewContent", () => {
  test("keeps one section per identity and lists the meetings ahead with their local time", () => {
    const content = buildNothingNewContent(
      contentInput({ aheadRows: [row("m1", "ident-work", "Standup")] }),
    );

    expect(content.nothingNew).toBe(true);
    expect(content.sections.map((section) => section.identityId)).toEqual([
      "ident-work",
      "ident-side",
    ]);
    expect(content.sections[0]?.meetingsAhead).toEqual([
      { text: "11:30 Standup", activityIds: ["m1"] },
    ]);
    expect(content.sections[0]?.highlights).toEqual([]);
    expect(content.sections[1]?.meetingsAhead).toEqual([]);
  });

  test("keeps the meeting text under the item limit after the time prefix", () => {
    const title = "x".repeat(DIGEST_ITEM_TEXT_MAX_LENGTH);

    const content = buildNothingNewContent(
      contentInput({ aheadRows: [row("m1", "ident-work", title)] }),
    );

    const [item] = content.sections[0]?.meetingsAhead ?? [];
    expect(item?.text).toHaveLength(DIGEST_ITEM_TEXT_MAX_LENGTH);
    expect(item?.text.startsWith("11:30 ")).toBe(true);
  });

  test("caps the meetings at the item limit and the sections at the section limit", () => {
    const meetings = Array.from({ length: DIGEST_ITEMS_MAX + OVERFLOW }, (_, index) =>
      row(`m${index}`, "ident-0", `Meeting ${index}`),
    );
    const identities = Array.from({ length: DIGEST_SECTIONS_MAX + OVERFLOW }, (_, index) => ({
      id: `ident-${index}`,
      email: `user${index}@example.test`,
    }));

    const content = buildNothingNewContent(contentInput({ identities, aheadRows: meetings }));

    expect(content.sections).toHaveLength(DIGEST_SECTIONS_MAX);
    expect(content.sections[0]?.meetingsAhead).toHaveLength(DIGEST_ITEMS_MAX);
  });
});

describe("toDigestContent", () => {
  test("drops items without a known Activity id, unknown identities and keeps one section per identity", () => {
    const content = toDigestContent(
      {
        sections: [
          {
            identityId: "ident-work",
            highlights: [
              { text: " Shipped the fix ", activityIds: ["a1", "a1", "ghost"] },
              { text: "Invented", activityIds: ["ghost"] },
              { text: "   ", activityIds: ["a1"] },
            ],
            meetingsAhead: [],
            needsYou: [{ text: "Reply to Sam", activityIds: ["a2"] }],
          },
          {
            identityId: "ident-other",
            highlights: [{ text: "x", activityIds: ["a1"] }],
            meetingsAhead: [],
            needsYou: [],
          },
        ],
      },
      contentInput({ windowRows: [row("a1", "ident-work", "A"), row("a2", "ident-work", "B")] }),
    );

    expect(content.nothingNew).toBe(false);
    expect(content.sections).toEqual([
      {
        identityId: "ident-work",
        identityEmail: "work@example.test",
        highlights: [{ text: "Shipped the fix", activityIds: ["a1"] }],
        meetingsAhead: [],
        needsYou: [{ text: "Reply to Sam", activityIds: ["a2"] }],
      },
      {
        identityId: "ident-side",
        identityEmail: "side@example.test",
        highlights: [],
        meetingsAhead: [],
        needsYou: [],
      },
    ]);
  });

  test("allows only the identity's own Activities and its own upcoming meetings", () => {
    const content = toDigestContent(
      {
        sections: [
          {
            identityId: "ident-work",
            highlights: [{ text: "Side thing", activityIds: ["side-a"] }],
            meetingsAhead: [
              { text: "Past work", activityIds: ["work-a"] },
              { text: "Side meeting", activityIds: ["side-m"] },
              { text: "Work meeting", activityIds: ["work-m"] },
            ],
            needsYou: [{ text: "Work meeting prep", activityIds: ["work-m"] }],
          },
          { identityId: "ident-side", ...EMPTY_AI_SECTION },
        ],
      },
      contentInput({
        windowRows: [row("work-a", "ident-work", "W"), row("side-a", "ident-side", "S")],
        aheadRows: [row("work-m", "ident-work", "WM"), row("side-m", "ident-side", "SM")],
      }),
    );

    expect(content.sections[0]).toMatchObject({
      highlights: [],
      meetingsAhead: [{ text: "Work meeting", activityIds: ["work-m"] }],
      needsYou: [{ text: "Work meeting prep", activityIds: ["work-m"] }],
    });
  });

  test("cuts an over-long item text and carries the truncation flag", () => {
    const content = toDigestContent(
      {
        sections: [
          {
            identityId: "ident-work",
            highlights: [
              { text: "y".repeat(DIGEST_ITEM_TEXT_MAX_LENGTH + OVERFLOW), activityIds: ["a1"] },
            ],
            meetingsAhead: [],
            needsYou: [],
          },
        ],
      },
      contentInput({ windowRows: [row("a1", "ident-work", "A")], isTruncated: true }),
    );

    expect(content.truncated).toBe(true);
    expect(content.sections[0]?.highlights[0]?.text).toHaveLength(DIGEST_ITEM_TEXT_MAX_LENGTH);
  });
});

describe("toDigestContent caps", () => {
  test("caps over-long lists, activityIds and sections", () => {
    const ids = Array.from(
      { length: DIGEST_ITEM_ACTIVITY_IDS_MAX + OVERFLOW },
      (_, index) => `a${index}`,
    );
    const items = Array.from({ length: DIGEST_ITEMS_MAX + OVERFLOW }, (_, index) => ({
      text: `item ${index}`,
      activityIds: ids,
    }));
    const identities = Array.from({ length: DIGEST_SECTIONS_MAX + OVERFLOW }, (_, index) => ({
      id: `ident-${index}`,
      email: `user${index}@example.test`,
    }));
    const windowRows = ids.map((id) => row(id, "ident-0", id));
    const content = toDigestContent(
      {
        sections: [
          { identityId: "ident-0", highlights: items, meetingsAhead: items, needsYou: items },
        ],
      },
      contentInput({ identities, windowRows, aheadRows: windowRows }),
    );

    expect(content.sections).toHaveLength(DIGEST_SECTIONS_MAX);
    expect(content.sections[0]?.highlights).toHaveLength(DIGEST_ITEMS_MAX);
    expect(content.sections[0]?.meetingsAhead).toHaveLength(DIGEST_ITEMS_MAX);
    expect(content.sections[0]?.needsYou).toHaveLength(DIGEST_ITEMS_MAX);
    expect(content.sections[0]?.highlights[0]?.activityIds).toHaveLength(
      DIGEST_ITEM_ACTIVITY_IDS_MAX,
    );
  });
});

describe("parseDigestContent", () => {
  test("returns null for no content and for content of the wrong shape", () => {
    expect(parseDigestContent(null)).toBeNull();
    expect(parseDigestContent(JSON.stringify({ sections: "x" }))).toBeNull();
  });
});

const KEPT = 3;

describe("capWindowRows", () => {
  test("keeps the newest rows in time order and flags the cut", () => {
    const newestFirst = ["d", "c", "b", "a"].map((id) => row(id, "ident-work", id));

    const cut = capWindowRows(newestFirst, KEPT);

    expect(cut.windowRows.map((entry) => entry.id)).toEqual(["b", "c", "d"]);
    expect(cut.isTruncated).toBe(true);
    expect(capWindowRows(newestFirst, newestFirst.length).isTruncated).toBe(false);
  });
});

describe("toDigestStart", () => {
  const candidate = { userId: "u1", timeZone: DHAKA };
  const now = "2026-10-14T02:00:00.000Z";

  test("starts at the latest earlier window end of that user only", () => {
    const start = toDigestStart(candidate, now, [
      { userId: "u1", digestDate: "2026-10-12", windowEnd: "2026-10-12T02:00:00.000Z" },
      { userId: "u1", digestDate: "2026-10-13", windowEnd: "2026-10-13T02:00:00.000Z" },
      { userId: "u2", digestDate: "2026-10-13", windowEnd: "2026-10-13T09:00:00.000Z" },
    ]);

    expect(start).toEqual({
      userId: "u1",
      digestDate: "2026-10-14",
      windowStart: "2026-10-13T02:00:00.000Z",
      windowEnd: now,
    });
  });

  test("falls back to the default window and returns null when a Digest exists", () => {
    expect(toDigestStart(candidate, now, [])?.windowStart).toBe("2026-10-13T02:00:00.000Z");
    expect(
      toDigestStart(candidate, now, [{ userId: "u1", digestDate: "2026-10-14", windowEnd: now }]),
    ).toBeNull();
  });
});
