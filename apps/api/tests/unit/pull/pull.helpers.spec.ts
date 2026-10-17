import { describe, expect, test } from "bun:test";

import { ESource } from "#api/modules/activity/activity.enums";
import {
  isPullableProvider,
  nextCalendarCursor,
  nextGmailBackfillStep,
  nextGmailHistoryStep,
  orderSources,
  parseCalendarCursor,
  parseCursorMap,
  parseGmailCursor,
  readableSources,
  remainingSources,
  serializeCursorMap,
  startCycle,
} from "#api/modules/pull/pull.helpers";
import type { TConnectionRow } from "#api/modules/pull/pull.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { EGmailLabel } from "#api/shared/providers/google/google.enums";
import type {
  IGoogleCalendarPage,
  IGoogleGmailPage,
} from "#api/shared/providers/google/google.interfaces";
import { ALL_SOURCES_GRANTED_SCOPES } from "#api-tests/fixtures/fixtures.constants";

const NOW = "2026-10-17T08:00:00.000Z";

const PAGE: IGoogleCalendarPage = {
  events: [],
  nextPageToken: null,
  nextSyncToken: "sync-2",
  usedSyncToken: true,
  timeZone: null,
};

function connection(overrides: Partial<TConnectionRow>): TConnectionRow {
  return {
    id: "c1",
    identityId: "i1",
    provider: "google",
    status: "active",
    scopes: ALL_SOURCES_GRANTED_SCOPES.join(" "),
    refreshTokenEnc: "enc",
    accessTokenExpiresAt: null,
    providerAccountId: null,
    providerAccountEmail: null,
    providerSite: null,
    providerResourceId: null,
    pullCursor: null,
    lastPulledAt: null,
    lastPullError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("parseCalendarCursor", () => {
  test("starts 7 days back with no sync token when nothing is stored", () => {
    const cursor = parseCalendarCursor(null, NOW);

    expect(cursor.syncToken).toBeNull();
    expect(cursor.timeMin).toBe("2026-10-10T08:00:00.000Z");
    expect(cursor.timeMax).toBe("2026-11-16T08:00:00.000Z");
  });

  test("keeps a stored cursor that is fresh", () => {
    const stored = JSON.stringify({
      syncToken: "sync-1",
      pageToken: null,
      timeMin: "2026-10-10T08:00:00.000Z",
      timeMax: "2026-11-16T08:00:00.000Z",
      startedAt: "2026-10-16T08:00:00.000Z",
    });

    expect(parseCalendarCursor(stored, NOW).syncToken).toBe("sync-1");
  });

  test.each([
    { name: "is not json", stored: "{" },
    { name: "lacks the time window", stored: JSON.stringify({ syncToken: "x" }) },
    {
      name: "is older than 14 days",
      stored: JSON.stringify({
        syncToken: "old",
        timeMin: "a",
        timeMax: "b",
        startedAt: "2026-09-01T00:00:00.000Z",
      }),
    },
  ])("restarts when the stored cursor $name", ({ stored }) => {
    const cursor = parseCalendarCursor(stored, NOW);

    expect(cursor.syncToken).toBeNull();
    expect(cursor.startedAt).toBe(NOW);
  });
});

describe("nextCalendarCursor", () => {
  const cursor = parseCalendarCursor(null, NOW);

  test("stores the new sync token on the last page", () => {
    const next = JSON.parse(nextCalendarCursor(cursor, PAGE));

    expect(next.syncToken).toBe("sync-2");
    expect(next.pageToken).toBeNull();
  });

  test("keeps the page token while pages remain", () => {
    const next = JSON.parse(
      nextCalendarCursor(cursor, { ...PAGE, nextPageToken: "page-2", usedSyncToken: false }),
    );

    expect(next.pageToken).toBe("page-2");
    expect(next.syncToken).toBeNull();
  });
});

describe("cursor map", () => {
  test("round-trips and ignores unknown or invalid entries", () => {
    const cursors = new Map([[ESource.CALENDAR, { value: "v", isPending: true }]]);

    expect(parseCursorMap(serializeCursorMap(cursors))).toEqual(cursors);
    expect(parseCursorMap("not json").size).toBe(0);
    expect(parseCursorMap(JSON.stringify({ calendar: { value: 1 } })).size).toBe(0);
    expect(parseCursorMap(null).size).toBe(0);
  });
});

describe("source selection", () => {
  test("reads only the granted Sources that have a reader", () => {
    expect(readableSources(connection({}))).toEqual([ESource.CALENDAR, ESource.GMAIL]);
    expect(readableSources(connection({ scopes: "openid email" }))).toEqual([]);
    expect(readableSources(connection({ provider: "jira", scopes: null }))).toEqual([]);
  });

  test("puts Sources with pending pages first", () => {
    const cursors = new Map([[ESource.CHAT, { value: "v", isPending: true }]]);

    expect(orderSources([ESource.CALENDAR, ESource.CHAT], cursors)).toEqual([
      ESource.CHAT,
      ESource.CALENDAR,
    ]);
  });

  test("keeps the current Source while it has more pages", () => {
    expect(remainingSources([ESource.CALENDAR, ESource.CHAT], true)).toEqual([
      ESource.CALENDAR,
      ESource.CHAT,
    ]);
    expect(remainingSources([ESource.CALENDAR, ESource.CHAT], false)).toEqual([ESource.CHAT]);
  });

  test("knows which providers have a pull reader", () => {
    expect(isPullableProvider("google")).toBe(true);
    expect(isPullableProvider("jira")).toBe(false);
  });
});

describe("startCycle", () => {
  test("marks every Source pending when none is pending", () => {
    const cursors = new Map([[ESource.CALENDAR, { value: "sync", isPending: false }]]);

    const queue = startCycle([ESource.CALENDAR, ESource.GMAIL], cursors);

    expect(queue).toEqual([ESource.CALENDAR, ESource.GMAIL]);
    expect(cursors.get(ESource.CALENDAR)).toEqual({ value: "sync", isPending: true });
    expect(cursors.get(ESource.GMAIL)).toEqual({ value: "", isPending: true });
  });

  test("reads Gmail after Calendar, then starts a new cycle", () => {
    const sources = [ESource.CALENDAR, ESource.GMAIL];
    const cursors = new Map<ESource, { value: string; isPending: boolean }>();

    expect(startCycle(sources, cursors)).toEqual([ESource.CALENDAR, ESource.GMAIL]);
    cursors.set(ESource.CALENDAR, { value: "sync", isPending: false });

    expect(startCycle(sources, cursors)).toEqual([ESource.GMAIL]);
    cursors.set(ESource.GMAIL, { value: "h1", isPending: false });

    expect(startCycle(sources, cursors)).toEqual([ESource.CALENDAR, ESource.GMAIL]);
    expect(cursors.get(ESource.CALENDAR)).toEqual({ value: "sync", isPending: true });
  });
});

describe("Gmail cursor", () => {
  const cursor = {
    historyId: "h-1",
    label: EGmailLabel.SENT,
    pageToken: null,
    cutoff: "2026-10-10T00:00:00.000Z",
  };
  const messageAt = (iso: string) => ({ id: iso, internalDate: String(dayjs(iso).valueOf()) });
  const gmailPage = (overrides: Partial<IGoogleGmailPage>): IGoogleGmailPage => ({
    messages: [],
    nextPageToken: null,
    historyId: "h-2",
    isHistoryExpired: false,
    ...overrides,
  });

  test("starts a 7 day SENT backfill when there is no usable cursor", () => {
    const fresh = {
      historyId: null,
      label: EGmailLabel.SENT,
      pageToken: null,
      cutoff: "2026-10-10T08:00:00.000Z",
    };

    expect(parseGmailCursor(null, NOW)).toEqual(fresh);
    expect(parseGmailCursor("not json", NOW)).toEqual(fresh);
    expect(
      parseGmailCursor(JSON.stringify({ ...cursor, label: null, historyId: null }), NOW),
    ).toEqual(fresh);
  });

  test("keeps the next page of a label while mail is inside the cutoff", () => {
    const step = nextGmailBackfillStep(
      cursor,
      gmailPage({ messages: [messageAt("2026-10-12T00:00:00.000Z")], nextPageToken: "p2" }),
    );

    expect(step).toEqual({ cursor: { ...cursor, pageToken: "p2" }, hasMore: true });
  });

  test("moves to INBOX when SENT runs out or crosses the cutoff", () => {
    const crossed = nextGmailBackfillStep(
      cursor,
      gmailPage({ messages: [messageAt("2026-10-01T00:00:00.000Z")], nextPageToken: "p2" }),
    );

    expect(crossed).toEqual({
      cursor: { ...cursor, label: EGmailLabel.INBOX, pageToken: null },
      hasMore: true,
    });
  });

  test("ends the backfill after INBOX and keeps the first baseline history id", () => {
    const step = nextGmailBackfillStep({ ...cursor, label: EGmailLabel.INBOX }, gmailPage({}));

    expect(step).toEqual({
      cursor: { ...cursor, label: null, pageToken: null },
      hasMore: false,
    });
  });

  test("moves the history id only when the history pages end", () => {
    const history = { ...cursor, label: null };

    expect(nextGmailHistoryStep(history, gmailPage({ nextPageToken: "p2" }))).toEqual({
      cursor: { ...history, pageToken: "p2" },
      hasMore: true,
    });
    expect(nextGmailHistoryStep(history, gmailPage({}))).toEqual({
      cursor: { ...history, historyId: "h-2" },
      hasMore: false,
    });
  });
});
