import { describe, expect, test } from "bun:test";

import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";
import {
  escapeLike,
  mapCalendarEvents,
  mapChatMessages,
  mapGmailMessages,
  mapJiraIssues,
  mapLinearIssues,
  nonEmpty,
  toIsoBound,
  withAuthUser,
} from "#api/modules/activity/activity.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import type {
  TGoogleCalendarEvent,
  TGoogleChatMessage,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
import { JIRA_MAX_ACTIVITIES_PER_PAGE } from "#api/shared/providers/jira/jira.constants";
import type { TJiraIssue } from "#api/shared/providers/jira/jira.types";
import type { ILinearIssue } from "#api/shared/providers/linear/linear.interfaces";
import { CALENDAR_EMAIL, LINEAR_LAST_PAGE } from "#api-tests/fixtures/fixtures.constants";

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

const JIRA_CONTEXT = { site: "acme.atlassian.net", since: "2026-10-16T00:00:00.000Z", offset: 0 };

function jiraIssue(overrides: Partial<TJiraIssue>): TJiraIssue {
  return {
    id: "10001",
    key: "ERP-1",
    fields: {
      summary: "Fix login",
      created: dayjs.utc("2026-10-16T01:00:00.000Z").toDate(),
      reporter: { emailAddress: "rep@employer.example" },
      comment: {
        comments: [
          {
            id: "501",
            created: dayjs.utc("2026-10-16T05:00:00.000Z").toDate(),
            author: { displayName: "Sam" },
            body: {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }],
            },
          },
        ],
      },
    },
    changelog: {
      histories: [
        {
          id: "9001",
          created: dayjs.utc("2026-10-16T03:00:00.000Z").toDate(),
          author: { emailAddress: "dev@employer.example" },
          items: [
            { field: "status", fromString: "To Do", toString: "In Progress" },
            { field: "assignee", fromString: null, toString: "Sam" },
            { field: "priority", fromString: "Low", toString: "High" },
          ],
        },
        {
          id: "9002",
          created: dayjs.utc("2026-10-16T04:00:00.000Z").toDate(),
          items: [{ field: "assignee", fromString: "Sam", toString: null }],
        },
      ],
    },
    ...overrides,
  };
}

const LINEAR_SINCE = "2026-10-10T00:00:00.000Z";
const LINEAR_USER = { name: "Dev One", email: "dev@employer.example" };

function linearIssue(overrides: Partial<ILinearIssue>): ILinearIssue {
  return {
    id: "issue-1",
    identifier: "ENG-1",
    title: "Fix login",
    url: "https://linear.app/acme/issue/ENG-1/fix-login",
    createdAt: "2026-10-01T00:00:00.000Z",
    creator: LINEAR_USER,
    history: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
    comments: { nodes: [], pageInfo: LINEAR_LAST_PAGE },
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

  test("leaves the actor empty when Google sends no display name", () => {
    const { drafts } = mapChatMessages(
      [chatMessage({ sender: { name: `users/${CHAT_USER_ID}` } })],
      CHAT_CONTEXT,
    );

    expect(drafts[0]?.actor).toBeNull();
  });
});

const HISTORY_COUNT = 250;

function bareItem(field: string) {
  return Object.assign(Object.create(Object.prototype), { field });
}

describe("mapJiraIssues", () => {
  test("maps creation, status, assignment and comments to separate Activities", () => {
    const { drafts, removedExternalIds } = mapJiraIssues([jiraIssue({})], JIRA_CONTEXT);

    expect(removedExternalIds).toEqual([]);
    const byId = Object.fromEntries(drafts.map((draft) => [draft.externalId, draft]));
    expect(Object.keys(byId).sort()).toEqual(
      ["501", "9001:assignee", "9001:status", "9002:assignee", "created:10001"].sort(),
    );
    expect(byId["created:10001"]).toMatchObject({
      source: ESource.JIRA,
      kind: EActivityKind.ISSUE_CREATED,
      title: "ERP-1: Fix login",
      actor: "rep@employer.example",
      occurredAt: "2026-10-16T01:00:00.000Z",
    });
    expect(byId["9001:status"]).toMatchObject({
      kind: EActivityKind.ISSUE_STATUS_CHANGED,
      detail: "To Do to In Progress",
      actor: "dev@employer.example",
    });
    expect(byId["9001:assignee"]).toMatchObject({
      kind: EActivityKind.ISSUE_ASSIGNED,
      detail: "Sam",
    });
    expect(byId["9002:assignee"]?.detail).toBe("Unassigned");
    expect(byId["501"]).toMatchObject({
      kind: EActivityKind.ISSUE_COMMENTED,
      detail: "Done",
      actor: "Sam",
    });
  });

  test("links every kind to the issue and a comment to its focused comment id", () => {
    const { drafts } = mapJiraIssues([jiraIssue({})], JIRA_CONTEXT);

    for (const draft of drafts) {
      expect(draft.url).toStartWith("https://acme.atlassian.net/browse/ERP-1");
    }
    const comment = drafts.find((draft) => draft.kind === EActivityKind.ISSUE_COMMENTED);
    expect(comment?.url).toBe("https://acme.atlassian.net/browse/ERP-1?focusedCommentId=501");
    const status = drafts.find((draft) => draft.kind === EActivityKind.ISSUE_STATUS_CHANGED);
    expect(status?.url).toBe("https://acme.atlassian.net/browse/ERP-1");
  });

  test("skips changes older than the since time with a short overlap", () => {
    const { drafts } = mapJiraIssues([jiraIssue({})], {
      site: "acme.atlassian.net",
      since: "2026-10-16T03:30:00.000Z",
      offset: 0,
    });

    expect(drafts.map((draft) => draft.externalId).sort()).toEqual(["501", "9002:assignee"]);
  });

  test("drops an issue with no id or key", () => {
    expect(mapJiraIssues([jiraIssue({ key: undefined })], JIRA_CONTEXT).drafts).toEqual([]);
  });

  test("reads every change across resume offsets when an issue has too many", () => {
    const histories = Array.from({ length: HISTORY_COUNT }, (_, index) => ({
      id: `h${index}`,
      created: dayjs.utc("2026-10-16T00:00:00.000Z").add(index, "minute").toDate(),
      items: [{ field: "status", fromString: "A", toString: "B" }],
    }));
    const issues = [jiraIssue({ changelog: { histories }, fields: {} })];

    const first = mapJiraIssues(issues, JIRA_CONTEXT);
    const second = mapJiraIssues(issues, { ...JIRA_CONTEXT, offset: JIRA_MAX_ACTIVITIES_PER_PAGE });

    expect(first.drafts.length).toBe(JIRA_MAX_ACTIVITIES_PER_PAGE);
    expect(first.overflow).toBe(true);
    expect(second.overflow).toBe(false);
    const ids = new Set([...first.drafts, ...second.drafts].map((draft) => draft.externalId));
    expect(ids.size).toBe(HISTORY_COUNT);
  });

  test("ignores a change item with no own toString or fromString", () => {
    const histories = [
      {
        id: "h1",
        created: dayjs.utc("2026-10-16T02:00:00.000Z").toDate(),
        items: [bareItem("assignee"), bareItem("status")],
      },
    ];

    const { drafts } = mapJiraIssues(
      [jiraIssue({ changelog: { histories }, fields: {} })],
      JIRA_CONTEXT,
    );

    const byId = Object.fromEntries(drafts.map((draft) => [draft.externalId, draft]));
    expect(byId["h1:assignee"]?.detail).toBe("Unassigned");
    expect(byId["h1:status"]?.detail).toBe("");
  });
});

describe("mapLinearIssues", () => {
  test("maps a created issue, a status change, an assignment and a comment to their own rows", () => {
    const issue = linearIssue({
      createdAt: "2026-10-12T00:00:00.000Z",
      history: {
        nodes: [
          {
            id: "h-state",
            createdAt: "2026-10-13T00:00:00.000Z",
            actor: LINEAR_USER,
            fromState: { name: "Todo" },
            toState: { name: "In Progress" },
            toAssignee: null,
          },
          {
            id: "h-assign",
            createdAt: "2026-10-14T00:00:00.000Z",
            actor: null,
            fromState: null,
            toState: null,
            toAssignee: { name: "Dev Two", email: null },
          },
        ],
        pageInfo: LINEAR_LAST_PAGE,
      },
      comments: {
        nodes: [
          {
            id: "c-1",
            createdAt: "2026-10-15T00:00:00.000Z",
            url: "https://linear.app/acme/issue/ENG-1/fix-login#comment-c1",
            body: "Looks good",
            user: { name: "Dev Two", email: null },
          },
        ],
        pageInfo: LINEAR_LAST_PAGE,
      },
    });

    const { drafts } = mapLinearIssues([issue], { since: LINEAR_SINCE });

    expect(drafts.map((draft) => [draft.kind, draft.externalId])).toEqual([
      [EActivityKind.ISSUE_CREATED, "issue-1:created"],
      [EActivityKind.ISSUE_STATUS_CHANGED, "h-state"],
      [EActivityKind.ISSUE_ASSIGNED, "h-assign"],
      [EActivityKind.ISSUE_COMMENTED, "c-1"],
    ]);
    expect(drafts.every((draft) => draft.source === ESource.LINEAR)).toBe(true);
    expect(drafts[0]?.url).toBe(issue.url);
    expect(drafts[0]?.title).toBe("ENG-1 Fix login");
    expect(drafts[0]?.actor).toBe(LINEAR_USER.email);
    expect(drafts[1]?.detail).toBe("Todo to In Progress");
    expect(drafts[2]?.detail).toBe("Dev Two");
    expect(drafts[3]?.url).toContain("#comment-c1");
    expect(drafts[3]?.actor).toBe("Dev Two");
    expect(drafts[3]?.detail).toBe("Looks good");
  });

  test("gives a state change and an assignment from one history entry separate ids", () => {
    const issue = linearIssue({
      history: {
        nodes: [
          {
            id: "h-both",
            createdAt: "2026-10-13T00:00:00.000Z",
            actor: LINEAR_USER,
            fromState: null,
            toState: { name: "Done" },
            toAssignee: LINEAR_USER,
          },
        ],
        pageInfo: LINEAR_LAST_PAGE,
      },
    });

    const { drafts } = mapLinearIssues([issue], { since: LINEAR_SINCE });

    expect(drafts.map((draft) => draft.externalId)).toEqual(["h-both", "h-both:assigned"]);
  });

  test("skips changes older than the cursor and issues with no link", () => {
    const old = linearIssue({
      history: {
        nodes: [
          {
            id: "h-old",
            createdAt: "2026-10-02T00:00:00.000Z",
            actor: null,
            fromState: null,
            toState: { name: "Done" },
            toAssignee: null,
          },
        ],
        pageInfo: LINEAR_LAST_PAGE,
      },
    });
    const noLink = linearIssue({ id: "issue-2", url: "", createdAt: "2026-10-12T00:00:00.000Z" });

    expect(mapLinearIssues([old, noLink], { since: LINEAR_SINCE }).drafts).toEqual([]);
  });
});
