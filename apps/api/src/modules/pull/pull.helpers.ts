import { ESource } from "#api/modules/activity/activity.enums";
import {
  ACCESS_TOKEN_EXPIRY_MARGIN_SECONDS,
  CALENDAR_CURSOR_MAX_AGE_DAYS,
  CALENDAR_LOOKAHEAD_DAYS,
  GOOGLE_SOURCE_TO_SOURCE,
  PULL_FIRST_LOOKBACK_DAYS,
  PULLABLE_PROVIDERS,
  READABLE_SOURCES,
} from "#api/modules/pull/pull.constants";
import { ECalendarCursorKey, EPullMessageKey } from "#api/modules/pull/pull.enums";
import type { ICalendarCursor, ISourceCursor } from "#api/modules/pull/pull.interfaces";
import type { TConnectionRow } from "#api/modules/pull/pull.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { toStringRecord } from "#api/shared/json/json.helpers";
import { grantedSources } from "#api/shared/providers/google/google.helpers";
import type { IGoogleCalendarPage } from "#api/shared/providers/google/google.interfaces";
import { OAUTH_SCOPE_SEPARATOR } from "#api/shared/providers/providers.constants";
import { EProvider } from "#api/shared/providers/providers.enums";

export function isPullableProvider(provider: string): boolean {
  return PULLABLE_PROVIDERS.some((entry) => entry === provider);
}

export function readableSources(connection: TConnectionRow): ESource[] {
  if (connection.provider !== EProvider.GOOGLE || !connection.scopes) {
    return [];
  }
  return grantedSources(connection.scopes.split(OAUTH_SCOPE_SEPARATOR))
    .map((source) => GOOGLE_SOURCE_TO_SOURCE[source])
    .filter((source) => READABLE_SOURCES.includes(source));
}

export function orderSources(sources: ESource[], cursors: Map<ESource, ISourceCursor>): ESource[] {
  const isPending = (source: ESource) => cursors.get(source)?.isPending === true;
  return [...sources.filter(isPending), ...sources.filter((source) => !isPending(source))];
}

function readCursorEntry(value: unknown): ISourceCursor | null {
  const record = toStringRecord(value);
  if (!record) {
    return null;
  }
  const { value: cursorValue, isPending } = record;
  if (typeof cursorValue !== "string" || typeof isPending !== "boolean") {
    return null;
  }
  return { value: cursorValue, isPending };
}

export function parseCursorMap(stored: string | null): Map<ESource, ISourceCursor> {
  const cursors = new Map<ESource, ISourceCursor>();
  if (!stored) {
    return cursors;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    const record = toStringRecord(parsed) ?? {};
    for (const source of Object.values(ESource)) {
      const entry = readCursorEntry(record[source]);
      if (entry) {
        cursors.set(source, entry);
      }
    }
  } catch {
    return new Map();
  }
  return cursors;
}

export function serializeCursorMap(cursors: Map<ESource, ISourceCursor>): string {
  return JSON.stringify(Object.fromEntries(cursors));
}

export function accessTokenTtlSeconds(expiresInSeconds: number | undefined): number {
  if (expiresInSeconds === undefined) {
    return 0;
  }
  return expiresInSeconds - ACCESS_TOKEN_EXPIRY_MARGIN_SECONDS;
}

function freshCalendarCursor(now: string): ICalendarCursor {
  return {
    syncToken: null,
    pageToken: null,
    timeMin: dayjs(now).subtract(PULL_FIRST_LOOKBACK_DAYS, "day").toISOString(),
    timeMax: dayjs(now).add(CALENDAR_LOOKAHEAD_DAYS, "day").toISOString(),
    startedAt: now,
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value;
}

function readCalendarCursor(stored: string): ICalendarCursor | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    const record = toStringRecord(parsed);
    if (!record) {
      return null;
    }
    const syncToken = record[ECalendarCursorKey.SYNC_TOKEN];
    const pageToken = record[ECalendarCursorKey.PAGE_TOKEN];
    const timeMin = record[ECalendarCursorKey.TIME_MIN];
    const timeMax = record[ECalendarCursorKey.TIME_MAX];
    const startedAt = record[ECalendarCursorKey.STARTED_AT];
    if (typeof timeMin !== "string" || typeof timeMax !== "string") {
      return null;
    }
    if (typeof startedAt !== "string") {
      return null;
    }
    return {
      syncToken: stringOrNull(syncToken),
      pageToken: stringOrNull(pageToken),
      timeMin,
      timeMax,
      startedAt,
    };
  } catch {
    return null;
  }
}

export function parseCalendarCursor(stored: string | null, now: string): ICalendarCursor {
  if (!stored) {
    return freshCalendarCursor(now);
  }
  const cursor = readCalendarCursor(stored);
  if (!cursor) {
    return freshCalendarCursor(now);
  }
  const ageDays = dayjs(now).diff(dayjs(cursor.startedAt), "day");
  if (ageDays >= CALENDAR_CURSOR_MAX_AGE_DAYS) {
    return freshCalendarCursor(now);
  }
  return cursor;
}

function pageSyncToken(cursor: ICalendarCursor, page: IGoogleCalendarPage): string | null {
  if (!page.usedSyncToken) {
    return null;
  }
  return cursor.syncToken;
}

export function readConnectionId(body: unknown): string | null {
  const record = toStringRecord(body);
  return stringOrNull(record?.[EPullMessageKey.CONNECTION_ID]);
}

export function nextCalendarCursor(cursor: ICalendarCursor, page: IGoogleCalendarPage): string {
  if (page.nextPageToken) {
    const syncToken = pageSyncToken(cursor, page);
    return JSON.stringify({ ...cursor, syncToken, pageToken: page.nextPageToken });
  }
  return JSON.stringify({ ...cursor, syncToken: page.nextSyncToken, pageToken: null });
}

export function remainingSources(queue: ESource[], hasMore: boolean): ESource[] {
  if (hasMore) {
    return queue;
  }
  return queue.slice(1);
}
