import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { connectionTokenKey } from "#api/modules/identity/identity.helpers";
import { PullService } from "#api/modules/pull/pull.service";
import { bindings } from "#api/shared/bindings/bindings.client";
import type { IPullMessage } from "#api/shared/bindings/bindings.interfaces";
import { cache } from "#api/shared/cache/cache.client";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { EGmailLabel } from "#api/shared/providers/google/google.enums";
import type {
  IGoogleCalendarPage,
  IGoogleCalendarReadInput,
  IGoogleChatMessagesPage,
  IGoogleChatSpace,
  IGoogleChatSpacesPage,
  IGoogleGmailPage,
} from "#api/shared/providers/google/google.interfaces";
import { GoogleService } from "#api/shared/providers/google/google.service";
import type {
  TGoogleCalendarEvent,
  TGoogleChatMessage,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
import {
  CALENDAR_EMAIL,
  CALENDAR_READ_SCOPE,
  CHAT_MESSAGES_SCOPE,
  CHAT_SPACES_SCOPE,
  GMAIL_METADATA_SCOPE,
} from "#api-tests/fixtures/fixtures.constants";
import {
  createUser,
  seedGoogleConnection,
  uniqueEmail,
  wipeCache,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const QUEUE_METRICS = { backlogCount: 0, backlogBytes: 0 };
const QUEUE_RESPONSE = { metadata: { metrics: QUEUE_METRICS } };
const QUEUE_BATCH_RESPONSE = { metadata: { metrics: QUEUE_METRICS } };
class FakeQueue implements Queue<IPullMessage> {
  readonly sent: IPullMessage[] = [];

  metrics(): Promise<QueueMetrics> {
    return Promise.resolve({ backlogCount: 0, backlogBytes: 0 });
  }

  send(message: IPullMessage): Promise<QueueSendResponse> {
    this.sent.push(message);
    return Promise.resolve(QUEUE_RESPONSE);
  }

  sendBatch(messages: Iterable<MessageSendRequest<IPullMessage>>): Promise<QueueSendBatchResponse> {
    this.sent.push(...Array.from(messages, (message) => message.body));
    return Promise.resolve(QUEUE_BATCH_RESPONSE);
  }
}

const MINUTES_TOLERANCE = 2;
const LOOKBACK_DAYS = 7;

const REFRESHED_TOKEN = {
  accessToken: "fresh-access",
  refreshToken: undefined,
  expiresInSeconds: 3600,
  scopes: [],
};

function event(id: string, start: string, overrides: TGoogleCalendarEvent = {}) {
  return {
    id,
    status: "confirmed",
    summary: `Event ${id}`,
    htmlLink: `https://www.google.com/calendar/event?eid=${id}`,
    start: { dateTime: start },
    end: { dateTime: dayjs(start).add(1, "hour").toISOString() },
    ...overrides,
  };
}

function page(
  events: TGoogleCalendarEvent[],
  overrides: Partial<IGoogleCalendarPage> = {},
): IGoogleCalendarPage {
  return {
    events,
    nextPageToken: null,
    nextSyncToken: "sync-next",
    usedSyncToken: false,
    timeZone: null,
    ...overrides,
  };
}

async function activityRows(connectionId: string) {
  return await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.connectionId, connectionId));
}

async function grantOnly(connectionId: string, scope: string) {
  await db
    .update(schema.connection)
    .set({ scopes: scope })
    .where(eq(schema.connection.id, connectionId));
}

function gmailMessage(id: string, labelIds: string[], internalDate: string): TGoogleGmailMessage {
  return {
    id,
    threadId: `thread-${id}`,
    labelIds,
    internalDate,
    payload: {
      headers: [
        { name: "Subject", value: `Mail ${id}` },
        { name: "From", value: "boss@employer.example" },
        { name: "To", value: CALENDAR_EMAIL },
      ],
    },
  };
}

function gmailPage(
  messages: TGoogleGmailMessage[],
  overrides: Partial<IGoogleGmailPage> = {},
): IGoogleGmailPage {
  return {
    messages,
    nextPageToken: null,
    historyId: "h-100",
    isHistoryExpired: false,
    ...overrides,
  };
}

async function pullBackfillAndHistory() {
  await PullService.pullConnection(seeded.connectionId);
  await PullService.pullConnection(seeded.connectionId);
  await PullService.pullConnection(seeded.connectionId);
}

async function connectionRow(connectionId: string) {
  const rows = await db
    .select()
    .from(schema.connection)
    .where(eq(schema.connection.id, connectionId));
  return rows[0];
}

let seeded: Awaited<ReturnType<typeof seedGoogleConnection>>;
let queue: FakeQueue;
const queueDescriptor = Object.getOwnPropertyDescriptor(bindings, "PULL_QUEUE") ?? {};

beforeEach(async () => {
  await wipeDatabase();
  await wipeCache();
  seeded = await seedGoogleConnection(await createUser(uniqueEmail()), [CALENDAR_READ_SCOPE]);
  spyOn(GoogleService, "refreshAccessToken").mockResolvedValue(REFRESHED_TOKEN);
  queue = new FakeQueue();
  Object.defineProperty(bindings, "PULL_QUEUE", { get: () => queue, configurable: true });
});

afterEach(() => {
  mock.restore();
  Object.defineProperty(bindings, "PULL_QUEUE", queueDescriptor);
});

describe("PullService.pullConnection", () => {
  test("first pull reads 7 days back and saves the events with authuser links", async () => {
    const list = spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(
      page([event("e1", dayjs().subtract(1, "day").toISOString())]),
    );

    await PullService.pullConnection(seeded.connectionId);

    const input: IGoogleCalendarReadInput | undefined = list.mock.calls[0]?.[0];
    expect(input?.syncToken).toBeNull();
    expect(input?.accessToken).toBe("fresh-access");
    expect(
      dayjs().subtract(LOOKBACK_DAYS, "day").diff(dayjs(input?.timeMin), "minute"),
    ).toBeLessThan(MINUTES_TOLERANCE);
    const rows = await activityRows(seeded.connectionId);
    expect(rows.length).toBe(1);
    expect(rows[0]?.url).toContain(`authuser=${encodeURIComponent(CALENDAR_EMAIL)}`);
    expect(rows[0]?.identityId).toBe(seeded.identityId);
  });

  test("moves the cursor and reads from the sync token on the next pull", async () => {
    const list = spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(page([]));
    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(list.mock.calls[1]?.[0].syncToken).toBe("sync-next");
    const row = await connectionRow(seeded.connectionId);
    expect(row?.lastPulledAt).not.toBeNull();
    expect(row?.lastPullError).toBeNull();
  });

  test("upserts a moved event in place and does not duplicate", async () => {
    const first = dayjs().subtract(2, "day").toISOString();
    const moved = dayjs().subtract(1, "day").toISOString();
    spyOn(GoogleService, "listCalendarEvents")
      .mockResolvedValueOnce(page([event("e1", first)]))
      .mockResolvedValueOnce(page([event("e1", moved, { summary: "Renamed" })]));

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    const rows = await activityRows(seeded.connectionId);
    expect(rows.length).toBe(1);
    expect(rows[0]?.occurredAt).toBe(moved);
    expect(rows[0]?.title).toBe("Renamed");
  });

  test("removes the row of an event that the user declines later", async () => {
    const start = dayjs().subtract(1, "day").toISOString();
    spyOn(GoogleService, "listCalendarEvents")
      .mockResolvedValueOnce(page([event("e1", start)]))
      .mockResolvedValueOnce(
        page([
          event("e1", start, {
            attendees: [{ email: CALENDAR_EMAIL, self: true, responseStatus: "declined" }],
          }),
        ]),
      );

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(await activityRows(seeded.connectionId)).toEqual([]);
  });

  test("sends a follow-up message when pages remain after the page budget", async () => {
    spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(
      page([], { nextPageToken: "more", nextSyncToken: null }),
    );

    await PullService.pullConnection(seeded.connectionId);

    expect(queue.sent).toEqual([{ connectionId: seeded.connectionId }]);
    const row = await connectionRow(seeded.connectionId);
    expect(row?.lastPulledAt).toBeNull();
  });

  test("marks the Connection needs_reconnect when Google rejects the refresh token", async () => {
    spyOn(GoogleService, "refreshAccessToken").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);

    expect((await connectionRow(seeded.connectionId))?.status).toBe(
      EConnectionStatus.NEEDS_RECONNECT,
    );
  });

  test("marks the Connection needs_reconnect when Google rejects a fresh access token", async () => {
    spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);

    expect((await connectionRow(seeded.connectionId))?.status).toBe(
      EConnectionStatus.NEEDS_RECONNECT,
    );
  });

  test("throws and keeps the Connection active when a cached token is rejected", async () => {
    await cache.put(connectionTokenKey(seeded.connectionId), "stale-access");
    spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(null);

    const pull = PullService.pullConnection(seeded.connectionId);

    await expect(pull).rejects.toThrow();
    expect((await connectionRow(seeded.connectionId))?.status).toBe(EConnectionStatus.ACTIVE);
    expect(await cache.get(connectionTokenKey(seeded.connectionId))).toBeNull();
  });

  test("saves lastPullError and throws on other failures", async () => {
    spyOn(GoogleService, "listCalendarEvents").mockRejectedValue(new Error("boom"));

    const pull = PullService.pullConnection(seeded.connectionId);

    await expect(pull).rejects.toThrow("boom");
    const row = await connectionRow(seeded.connectionId);
    expect(row?.lastPullError).toContain("boom");
    expect(row?.status).toBe(EConnectionStatus.ACTIVE);
  });

  test("ignores a Connection that needs to reconnect", async () => {
    await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT })
      .where(eq(schema.connection.id, seeded.connectionId));
    const list = spyOn(GoogleService, "listCalendarEvents");

    await PullService.pullConnection(seeded.connectionId);

    expect(list).not.toHaveBeenCalled();
  });
});

describe("PullService.pullConnection for Gmail", () => {
  const recent = () => String(dayjs().subtract(1, "day").valueOf());

  beforeEach(async () => {
    await grantOnly(seeded.connectionId, GMAIL_METADATA_SCOPE);
  });

  test("first pull reads SENT, then INBOX, then moves to the history cursor", async () => {
    const list = spyOn(GoogleService, "listGmailMessages")
      .mockResolvedValueOnce(gmailPage([gmailMessage("s1", ["SENT"], recent())]))
      .mockResolvedValueOnce(
        gmailPage([gmailMessage("i1", ["INBOX"], recent())], { historyId: null }),
      );
    const history = spyOn(GoogleService, "listGmailHistory").mockResolvedValue(
      gmailPage([], { historyId: "h-200" }),
    );

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(list.mock.calls.map(([input]) => input.label)).toEqual([
      EGmailLabel.SENT,
      EGmailLabel.INBOX,
    ]);
    expect(history.mock.calls[0]?.[0].startHistoryId).toBe("h-100");
    const rows = await activityRows(seeded.connectionId);
    expect(rows.map((row) => row.kind).sort()).toEqual(["email_received", "email_sent"]);
    expect(rows[0]?.url).toContain(`authuser=${encodeURIComponent(CALENDAR_EMAIL)}`);
    expect(queue.sent.length).toBe(1);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("stops a label at the 7 day cutoff and ignores older mail", async () => {
    const old = String(dayjs().subtract(10, "day").valueOf());
    const list = spyOn(GoogleService, "listGmailMessages").mockResolvedValue(
      gmailPage([gmailMessage("new", ["SENT"], recent()), gmailMessage("old", ["SENT"], old)], {
        nextPageToken: "more",
      }),
    );

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(list.mock.calls[1]?.[0].label).toBe(EGmailLabel.INBOX);
    expect((await activityRows(seeded.connectionId)).map((row) => row.externalId)).toEqual(["new"]);
  });

  test("reads new mail from the history id and keeps the Promotions out", async () => {
    spyOn(GoogleService, "listGmailMessages").mockResolvedValue(gmailPage([]));
    const history = spyOn(GoogleService, "listGmailHistory").mockResolvedValue(
      gmailPage(
        [
          gmailMessage("n1", ["INBOX"], recent()),
          gmailMessage("n2", ["INBOX", "CATEGORY_PROMOTIONS"], recent()),
        ],
        { historyId: "h-300" },
      ),
    );
    await pullBackfillAndHistory();
    await PullService.pullConnection(seeded.connectionId);

    expect(history.mock.calls[1]?.[0].startHistoryId).toBe("h-300");
    expect((await activityRows(seeded.connectionId)).map((row) => row.externalId)).toEqual(["n1"]);
  });

  test("starts a new backfill when the history id has expired", async () => {
    spyOn(GoogleService, "listGmailMessages").mockResolvedValue(gmailPage([]));
    spyOn(GoogleService, "listGmailHistory").mockResolvedValue(
      gmailPage([], { historyId: null, isHistoryExpired: true }),
    );
    await pullBackfillAndHistory();

    expect(queue.sent.length).toBe(2);
    expect((await connectionRow(seeded.connectionId))?.pullCursor).toContain("SENT");
  });

  test("marks the Connection needs_reconnect when Google rejects the access token", async () => {
    spyOn(GoogleService, "listGmailMessages").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);

    expect((await connectionRow(seeded.connectionId))?.status).toBe(
      EConnectionStatus.NEEDS_RECONNECT,
    );
  });
});

describe("PullService.enqueueActiveConnections", () => {
  test("sends one message for each active pullable Connection", async () => {
    const second = await seedGoogleConnection(await createUser(uniqueEmail()));
    await db
      .update(schema.connection)
      .set({ status: EConnectionStatus.NEEDS_RECONNECT })
      .where(eq(schema.connection.id, second.connectionId));

    await PullService.enqueueActiveConnections();

    expect(queue.sent).toEqual([{ connectionId: seeded.connectionId }]);
  });
});

const CHAT_SCOPES = [CHAT_SPACES_SCOPE, CHAT_MESSAGES_SCOPE];
const CHAT_NOW_TOLERANCE_MINUTES = 2;
const PULL_TURN_LIMIT = 3;

function chatSpace(id: string, isDirectMessage = false): IGoogleChatSpace {
  return { id: `spaces/${id}`, isDirectMessage };
}

function spacesPage(
  spaces: IGoogleChatSpace[],
  nextPageToken: string | null = null,
): IGoogleChatSpacesPage {
  return { spaces, nextPageToken };
}

function chatMessage(spaceId: string, id: string, overrides: TGoogleChatMessage = {}) {
  return {
    name: `spaces/${spaceId}/messages/${id}`,
    createTime: dayjs().subtract(1, "hour").toISOString(),
    text: `Message ${id}`,
    sender: { name: "users/other", displayName: "Sam" },
    thread: { name: `spaces/${spaceId}/threads/${id}` },
    ...overrides,
  };
}

function chatPage(
  messages: TGoogleChatMessage[],
  nextPageToken: string | null = null,
): IGoogleChatMessagesPage {
  return { messages, nextPageToken };
}

async function seedChat(): Promise<string> {
  const chat = await seedGoogleConnection(await createUser(uniqueEmail()), CHAT_SCOPES);
  return chat.connectionId;
}

async function chatSender(connectionId: string): Promise<string> {
  const row = await connectionRow(connectionId);
  return `users/${row?.providerAccountId}`;
}

describe("PullService.pullConnection for Chat", () => {
  test("saves sent messages, mentions and DM messages and skips other space messages", async () => {
    const connectionId = await seedChat();
    const me = await chatSender(connectionId);
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(
      spacesPage([chatSpace("DM1", true), chatSpace("ROOM1")]),
    );
    spyOn(GoogleService, "listChatMessages")
      .mockResolvedValueOnce(chatPage([chatMessage("DM1", "dm-in")]))
      .mockResolvedValueOnce(
        chatPage([
          chatMessage("ROOM1", "sent", { sender: { name: me } }),
          chatMessage("ROOM1", "mention", {
            annotations: [
              { type: "USER_MENTION", userMention: { type: "MENTION", user: { name: me } } },
            ],
          }),
          chatMessage("ROOM1", "noise"),
        ]),
      );

    await PullService.pullConnection(connectionId);

    const rows = await activityRows(connectionId);
    expect(rows.map((row) => [row.externalId, row.kind]).sort()).toEqual([
      ["spaces/DM1/messages/dm-in", "chat_message"],
      ["spaces/ROOM1/messages/mention", "chat_mention"],
      ["spaces/ROOM1/messages/sent", "chat_message"],
    ]);
    expect(rows.find((row) => row.externalId.endsWith("dm-in"))?.url).toStartWith(
      "https://chat.google.com/dm/DM1/dm-in/dm-in?",
    );
    expect((await connectionRow(connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("reads 7 days back first, then from the start of the last sweep", async () => {
    const connectionId = await seedChat();
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(spacesPage([chatSpace("ROOM1")]));
    const list = spyOn(GoogleService, "listChatMessages").mockResolvedValue(chatPage([]));

    await PullService.pullConnection(connectionId);
    const before = dayjs();
    await PullService.pullConnection(connectionId);

    const first = list.mock.calls[0]?.[0].since;
    const second = list.mock.calls[1]?.[0].since;
    expect(dayjs().subtract(LOOKBACK_DAYS, "day").diff(dayjs(first), "minute")).toBeLessThan(
      CHAT_NOW_TOLERANCE_MINUTES,
    );
    expect(before.diff(dayjs(second), "minute")).toBeLessThan(CHAT_NOW_TOLERANCE_MINUTES);
    expect(dayjs(second).isAfter(dayjs(first))).toBe(true);
  });

  test("reads at most five spaces for each message and continues after the last one", async () => {
    const connectionId = await seedChat();
    const spaces = ["A", "B", "C", "D", "E", "F", "G"].map((id) => chatSpace(id));
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(spacesPage(spaces));
    const list = spyOn(GoogleService, "listChatMessages").mockResolvedValue(chatPage([]));

    await PullService.pullConnection(connectionId);

    expect(list.mock.calls.map((call) => call[0].spaceId)).toEqual([
      "spaces/A",
      "spaces/B",
      "spaces/C",
      "spaces/D",
      "spaces/E",
    ]);
    expect(queue.sent).toEqual([{ connectionId }]);

    list.mockClear();
    await PullService.pullConnection(connectionId);

    expect(list.mock.calls.map((call) => call[0].spaceId)).toEqual(["spaces/F", "spaces/G"]);
    expect((await connectionRow(connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("resumes a space with more messages from its page token", async () => {
    const connectionId = await seedChat();
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(
      spacesPage([chatSpace("A"), chatSpace("B")]),
    );
    const list = spyOn(GoogleService, "listChatMessages")
      .mockResolvedValueOnce(chatPage([], "more"))
      .mockResolvedValue(chatPage([]));

    await PullService.pullConnection(connectionId);
    await PullService.pullConnection(connectionId);

    expect(list.mock.calls.map((call) => [call[0].spaceId, call[0].pageToken])).toEqual([
      ["spaces/A", null],
      ["spaces/A", "more"],
      ["spaces/B", null],
    ]);
  });

  test("reads every spaces page before the sweep completes", async () => {
    const connectionId = await seedChat();
    const listSpaces = spyOn(GoogleService, "listChatSpaces")
      .mockResolvedValueOnce(spacesPage([chatSpace("A")], "spaces-2"))
      .mockResolvedValueOnce(spacesPage([chatSpace("B")], "spaces-3"))
      .mockResolvedValueOnce(spacesPage([chatSpace("C")]));
    const list = spyOn(GoogleService, "listChatMessages").mockResolvedValue(chatPage([]));

    await PullService.pullConnection(connectionId);
    await PullService.pullConnection(connectionId);
    expect((await connectionRow(connectionId))?.lastPulledAt).toBeNull();
    await PullService.pullConnection(connectionId);

    expect(listSpaces.mock.calls.map((call) => call[0].pageToken)).toEqual([
      null,
      "spaces-2",
      "spaces-3",
    ]);
    expect(list.mock.calls.map((call) => call[0].spaceId)).toEqual([
      "spaces/A",
      "spaces/B",
      "spaces/C",
    ]);
    expect((await connectionRow(connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("moves on from Chat when Google rejects it for the account", async () => {
    const connectionId = (
      await seedGoogleConnection(await createUser(uniqueEmail()), [
        CALENDAR_READ_SCOPE,
        CHAT_SPACES_SCOPE,
        CHAT_MESSAGES_SCOPE,
      ])
    ).connectionId;
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(spacesPage([]));
    const calendar = spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(page([]));

    for (let turn = 0; turn < PULL_TURN_LIMIT; turn++) {
      await PullService.pullConnection(connectionId);
    }

    expect(calendar).toHaveBeenCalled();
    expect((await connectionRow(connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("fails loudly when the Connection has no provider account id", async () => {
    const connectionId = await seedChat();
    await db
      .update(schema.connection)
      .set({ providerAccountId: null })
      .where(eq(schema.connection.id, connectionId));
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(spacesPage([]));

    await expect(PullService.pullConnection(connectionId)).rejects.toThrow();
  });

  test("marks the Connection needs_reconnect when Google rejects the access token", async () => {
    const connectionId = await seedChat();
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(null);

    await PullService.pullConnection(connectionId);

    expect((await connectionRow(connectionId))?.status).toBe(EConnectionStatus.NEEDS_RECONNECT);
  });
});

describe("PullService.pullConnection for Calendar and Chat", () => {
  test("reads each Source in turn across messages", async () => {
    const connectionId = (
      await seedGoogleConnection(await createUser(uniqueEmail()), [
        CALENDAR_READ_SCOPE,
        CHAT_SPACES_SCOPE,
        CHAT_MESSAGES_SCOPE,
      ])
    ).connectionId;
    const calendar = spyOn(GoogleService, "listCalendarEvents").mockResolvedValue(page([]));
    const chatList = spyOn(GoogleService, "listChatMessages").mockResolvedValue(chatPage([]));
    spyOn(GoogleService, "listChatSpaces").mockResolvedValue(spacesPage([chatSpace("A")]));

    await PullService.pullConnection(connectionId);

    expect(calendar).toHaveBeenCalledTimes(1);
    expect(chatList).not.toHaveBeenCalled();
    expect(queue.sent).toEqual([{ connectionId }]);

    await PullService.pullConnection(connectionId);

    expect(calendar).toHaveBeenCalledTimes(1);
    expect(chatList).toHaveBeenCalledTimes(1);
    expect((await connectionRow(connectionId))?.lastPulledAt).not.toBeNull();
  });
});
