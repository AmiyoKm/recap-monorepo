import { describe, expect, test } from "bun:test";

import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";
import {
  escapeLike,
  mapCalendarEvents,
  mapChatMessages,
  mapGmailMessages,
  nonEmpty,
  toIsoBound,
  withAuthUser,
} from "#api/modules/activity/activity.helpers";
import type {
  TGoogleCalendarEvent,
  TGoogleChatMessage,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
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

function mail(overrides: TGoogleGmailMessage): TGoogleGmailMessage {
  return {
    id: "m1",
    threadId: "t1",
    labelIds: ["INBOX", "UNREAD"],
    internalDate: "1792000000000",
    payload: {
      headers: [
        { name: "Subject", value: "Quarterly plan" },
        { name: "From", value: "Boss <boss@employer.example>" },
        { name: "To", value: "work@employer.example" },
        { name: "Cc", value: "peer@employer.example" },
      ],
    },
    ...overrides,
  };
}

const CHAT_USER_ID = "1001";
const OTHER_USER_ID = "2002";
const CHAT_CONTEXT = {
  identityEmail: CALENDAR_EMAIL,
  userId: CHAT_USER_ID,
  spaceId: "AAAA",
  isDirectMessage: false,
};

function chatMessage(overrides: TGoogleChatMessage): TGoogleChatMessage {
  return {
    name: "spaces/AAAA/messages/TTTT.MMMM",
    createTime: "2026-10-16T09:00:00.000Z",
    text: "Lunch?",
    sender: { name: `users/${OTHER_USER_ID}`, displayName: "Sam" },
    thread: { name: "spaces/AAAA/threads/TTTT" },
    ...overrides,
  };
}

describe("mapGmailMessages", () => {
  test("maps an Inbox message to email_received with a thread link in the right account", () => {
    const { drafts } = mapGmailMessages([mail({})], CONTEXT);

    expect(drafts).toEqual([
      {
        source: ESource.GMAIL,
        kind: EActivityKind.EMAIL_RECEIVED,
        externalId: "m1",
        occurredAt: "2026-10-14T17:46:40.000Z",
        endsAt: null,
        title: "Quarterly plan",
        url: `https://mail.google.com/mail/?authuser=${encodeURIComponent(CALENDAR_EMAIL)}#all/t1`,
        actor: "Boss <boss@employer.example>",
        detail: "work@employer.example, peer@employer.example",
      },
    ]);
  });

  test("maps a sent message to email_sent even when it is also in the Inbox", () => {
    const { drafts } = mapGmailMessages([mail({ labelIds: ["SENT", "INBOX"] })], CONTEXT);

    expect(drafts[0]?.kind).toBe(EActivityKind.EMAIL_SENT);
  });

  test.each(["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "SPAM", "TRASH"])(
    "skips a message labelled %s",
    (label) => {
      const { drafts } = mapGmailMessages([mail({ labelIds: ["INBOX", label] })], CONTEXT);

      expect(drafts).toEqual([]);
    },
  );

  test("skips a message that is neither sent nor in the Inbox", () => {
    expect(mapGmailMessages([mail({ labelIds: ["DRAFT"] })], CONTEXT).drafts).toEqual([]);
  });

  test("drops a message with no thread id", () => {
    expect(mapGmailMessages([mail({ threadId: undefined })], CONTEXT).drafts).toEqual([]);
  });

  test("uses a placeholder for a missing subject and never reads the snippet", () => {
    const { drafts } = mapGmailMessages(
      [mail({ snippet: "secret body", payload: { headers: [] } })],
      CONTEXT,
    );

    expect(drafts[0]?.title).toBe("(No subject)");
    expect(JSON.stringify(drafts)).not.toContain("secret body");
  });
});

function mentionOf(userId: string, type = "MENTION"): TGoogleChatMessage {
  return {
    annotations: [
      { type: "USER_MENTION", userMention: { type, user: { name: `users/${userId}` } } },
    ],
  };
}

describe("mapChatMessages", () => {
  test("maps a message that the user sent to chat_message with a room link", () => {
    const { drafts } = mapChatMessages(
      [chatMessage({ sender: { name: `users/${CHAT_USER_ID}`, displayName: "Me" } })],
      CHAT_CONTEXT,
    );

    expect(drafts).toEqual([
      {
        source: ESource.CHAT,
        kind: EActivityKind.CHAT_MESSAGE,
        externalId: "spaces/AAAA/messages/TTTT.MMMM",
        occurredAt: "2026-10-16T09:00:00.000Z",
        endsAt: null,
        title: "Lunch?",
        url: `https://chat.google.com/room/AAAA/TTTT/TTTT.MMMM?authuser=${encodeURIComponent(CALENDAR_EMAIL)}`,
        actor: "Me",
        detail: null,
      },
    ]);
  });

  test("maps a message that mentions the user to chat_mention", () => {
    const { drafts } = mapChatMessages([chatMessage(mentionOf(CHAT_USER_ID))], CHAT_CONTEXT);

    expect(drafts.map((draft) => draft.kind)).toEqual([EActivityKind.CHAT_MENTION]);
  });

  test("skips a space message that only mentions someone else", () => {
    const batch = mapChatMessages([chatMessage(mentionOf(OTHER_USER_ID))], CHAT_CONTEXT);

    expect(batch.drafts).toEqual([]);
  });

  test("skips a space message from someone else without a mention", () => {
    expect(mapChatMessages([chatMessage({})], CHAT_CONTEXT).drafts).toEqual([]);
  });

  test("ignores a mention that only adds a user to the space", () => {
    const batch = mapChatMessages([chatMessage(mentionOf(CHAT_USER_ID, "ADD"))], CHAT_CONTEXT);

    expect(batch.drafts).toEqual([]);
  });

  test("keeps every message of a DM with a dm link", () => {
    const { drafts } = mapChatMessages([chatMessage({})], {
      ...CHAT_CONTEXT,
      isDirectMessage: true,
    });

    expect(drafts[0]?.kind).toBe(EActivityKind.CHAT_MESSAGE);
    expect(drafts[0]?.url).toStartWith("https://chat.google.com/dm/AAAA/TTTT/TTTT.MMMM?");
  });

  test("drops a message without a thread and does not add a row", () => {
    const batch = mapChatMessages(
      [chatMessage({ thread: undefined, sender: { name: `users/${CHAT_USER_ID}` } })],
      CHAT_CONTEXT,
    );

    expect(batch.drafts).toEqual([]);
  });

  test("uses a placeholder title for a message without text", () => {
    const { drafts } = mapChatMessages(
      [chatMessage({ text: undefined, sender: { name: `users/${CHAT_USER_ID}` } })],
      CHAT_CONTEXT,
    );

    expect(drafts[0]?.title).toBe("(No title)");
  });
});
