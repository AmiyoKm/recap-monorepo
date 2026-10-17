import { describe, expect, test } from "bun:test";

import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";
import {
  escapeLike,
  mapCalendarEvents,
  nonEmpty,
  toIsoBound,
  withAuthUser,
} from "#api/modules/activity/activity.helpers";
import type { TGoogleCalendarEvent } from "#api/shared/providers/google/google.types";
import { CALENDAR_EMAIL } from "#api-tests/fixtures/fixtures.constants";

const CONTEXT = { identityEmail: CALENDAR_EMAIL, timeZone: null };
const EVENT_LINK = "https://www.google.com/calendar/event?eid=abc123";

function event(overrides: TGoogleCalendarEvent): TGoogleCalendarEvent {
  return {
    id: "event-1",
    status: "confirmed",
    summary: "Planning",
    htmlLink: EVENT_LINK,
    start: { dateTime: "2026-10-16T09:00:00+06:00" },
    end: { dateTime: "2026-10-16T10:00:00+06:00" },
    organizer: { email: "boss@employer.example" },
    ...overrides,
  };
}

describe("mapCalendarEvents", () => {
  test("maps a confirmed event to a calendar Activity with an authuser link", () => {
    const { drafts, removedExternalIds } = mapCalendarEvents([event({})], CONTEXT);

    expect(removedExternalIds).toEqual([]);
    expect(drafts).toEqual([
      {
        source: ESource.CALENDAR,
        kind: EActivityKind.CALENDAR_EVENT,
        externalId: "event-1",
        occurredAt: "2026-10-16T03:00:00.000Z",
        endsAt: "2026-10-16T04:00:00.000Z",
        title: "Planning",
        url: `${EVENT_LINK}&authuser=${encodeURIComponent(CALENDAR_EMAIL)}`,
        actor: "boss@employer.example",
        detail: null,
      },
    ]);
  });

  test("maps an all-day event to midnight UTC", () => {
    const { drafts } = mapCalendarEvents(
      [event({ start: { date: "2026-10-17" }, end: { date: "2026-10-18" } })],
      CONTEXT,
    );

    expect(drafts[0]?.occurredAt).toBe("2026-10-17T00:00:00.000Z");
  });

  test("maps an all-day event to midnight in the calendar time zone", () => {
    const { drafts } = mapCalendarEvents(
      [event({ start: { date: "2026-10-17" }, end: { date: "2026-10-18" } })],
      { ...CONTEXT, timeZone: "Asia/Dhaka" },
    );

    expect(drafts[0]?.occurredAt).toBe("2026-10-16T18:00:00.000Z");
    expect(drafts[0]?.endsAt).toBe("2026-10-17T18:00:00.000Z");
  });

  test("keeps the instant of a timed event whatever the calendar time zone", () => {
    const { drafts } = mapCalendarEvents([event({})], { ...CONTEXT, timeZone: "America/New_York" });

    expect(drafts[0]?.occurredAt).toBe("2026-10-16T03:00:00.000Z");
  });

  test("skips an event that the user declined and marks it for removal", () => {
    const declined = event({
      attendees: [
        { email: "other@employer.example", responseStatus: "accepted" },
        { email: CALENDAR_EMAIL, self: true, responseStatus: "declined" },
      ],
    });

    const batch = mapCalendarEvents([declined], CONTEXT);

    expect(batch.drafts).toEqual([]);
    expect(batch.removedExternalIds).toEqual(["event-1"]);
  });

  test("marks a cancelled event for removal", () => {
    const batch = mapCalendarEvents([event({ status: "cancelled" })], CONTEXT);

    expect(batch.drafts).toEqual([]);
    expect(batch.removedExternalIds).toEqual(["event-1"]);
  });

  test("keeps the same external id when an event moves", () => {
    const moved = event({ start: { dateTime: "2026-10-17T09:00:00+06:00" } });

    const [first] = mapCalendarEvents([event({})], CONTEXT).drafts;
    const [second] = mapCalendarEvents([moved], CONTEXT).drafts;

    expect(second?.externalId).toBe(first?.externalId);
    expect(second?.occurredAt).toBe("2026-10-17T03:00:00.000Z");
  });

  test.each([
    { name: "has no link", overrides: { htmlLink: undefined } },
    { name: "has no start", overrides: { start: undefined } },
    { name: "has no id", overrides: { id: undefined } },
  ])("drops an event that $name", ({ overrides }) => {
    const batch = mapCalendarEvents([event(overrides)], CONTEXT);

    expect(batch.drafts).toEqual([]);
    expect(batch.removedExternalIds).toEqual([]);
  });
});

describe("withAuthUser", () => {
  test("adds the account email as authuser", () => {
    expect(withAuthUser("https://mail.google.com/mail/u/0/#inbox/1", "a@b.example")).toBe(
      "https://mail.google.com/mail/u/0/?authuser=a%40b.example#inbox/1",
    );
  });

  test.each([null, undefined, "not a url"])("returns null for %p", (link) => {
    expect(withAuthUser(link, "a@b.example")).toBeNull();
  });
});

describe("escapeLike", () => {
  test("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});

describe("nonEmpty", () => {
  test("turns an empty or missing list into undefined", () => {
    expect(nonEmpty(undefined)).toBeUndefined();
    expect(nonEmpty([])).toBeUndefined();
    expect(nonEmpty(["a"])).toEqual(["a"]);
  });
});

describe("toIsoBound", () => {
  test("normalizes an offset timestamp to UTC", () => {
    expect(toIsoBound("2026-10-16T09:00:00+06:00")).toBe("2026-10-16T03:00:00.000Z");
  });

  test("returns undefined when no bound is given", () => {
    expect(toIsoBound(undefined)).toBeUndefined();
  });
});
