import { CHAT_RESOURCE_SEPARATOR } from "#api/modules/activity/activity.constants";
import { ESource } from "#api/modules/activity/activity.enums";
import {
  ACCESS_TOKEN_EXPIRY_MARGIN_SECONDS,
  CALENDAR_CURSOR_MAX_AGE_DAYS,
  CALENDAR_LOOKAHEAD_DAYS,
  DRIVE_CURSOR_OVERLAP_MINUTES,
  GMAIL_BACKFILL_LABELS,
  GOOGLE_SOURCE_TO_SOURCE,
  PULL_FIRST_LOOKBACK_DAYS,
  PULLABLE_PROVIDERS,
  READABLE_SOURCES,
} from "#api/modules/pull/pull.constants";
import {
  ECalendarCursorKey,
  EChatCursorKey,
  EDriveCursorKey,
  EGmailCursorKey,
  EPullMessageKey,
} from "#api/modules/pull/pull.enums";
import type {
  ICalendarCursor,
  IChatCursor,
  IDriveCursor,
  IGmailCursor,
  IGmailStep,
  ISourceCursor,
  ISourcePage,
} from "#api/modules/pull/pull.interfaces";
import type { TConnectionRow } from "#api/modules/pull/pull.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { toStringRecord } from "#api/shared/json/json.helpers";
import { EGmailLabel } from "#api/shared/providers/google/google.enums";
import { grantedSources } from "#api/shared/providers/google/google.helpers";
import type {
  IGoogleCalendarPage,
  IGoogleChatSpace,
  IGoogleDrivePage,
  IGoogleGmailPage,
} from "#api/shared/providers/google/google.interfaces";
import type { TGoogleGmailMessage } from "#api/shared/providers/google/google.types";
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

export function startCycle(sources: ESource[], cursors: Map<ESource, ISourceCursor>): ESource[] {
  const isPending = (source: ESource) => cursors.get(source)?.isPending === true;
  if (!sources.some(isPending)) {
    for (const source of sources) {
      cursors.set(source, { value: cursors.get(source)?.value ?? "", isPending: true });
    }
  }
  return orderSources(sources, cursors).filter(isPending);
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

function readDriveCursor(stored: string): IDriveCursor | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    const record = toStringRecord(parsed);
    const timeMin = record?.[EDriveCursorKey.TIME_MIN];
    const startedAt = record?.[EDriveCursorKey.STARTED_AT];
    if (typeof timeMin !== "string" || typeof startedAt !== "string") {
      return null;
    }
    return { timeMin, startedAt, pageToken: stringOrNull(record?.[EDriveCursorKey.PAGE_TOKEN]) };
  } catch {
    return null;
  }
}

function freshDriveCursor(timeMin: string, now: string): IDriveCursor {
  return { timeMin, pageToken: null, startedAt: now };
}

export function parseDriveCursor(stored: string | null, now: string): IDriveCursor {
  const firstTimeMin = dayjs(now).subtract(PULL_FIRST_LOOKBACK_DAYS, "day").toISOString();
  if (!stored) {
    return freshDriveCursor(firstTimeMin, now);
  }
  const cursor = readDriveCursor(stored);
  if (!cursor) {
    return freshDriveCursor(firstTimeMin, now);
  }
  if (cursor.pageToken) {
    return cursor;
  }
  return freshDriveCursor(cursor.timeMin, now);
}

export function nextDriveCursor(cursor: IDriveCursor, page: IGoogleDrivePage): string {
  if (page.nextPageToken) {
    return JSON.stringify({ ...cursor, pageToken: page.nextPageToken });
  }
  const timeMin = dayjs(cursor.startedAt)
    .subtract(DRIVE_CURSOR_OVERLAP_MINUTES, "minute")
    .toISOString();
  return JSON.stringify({ timeMin, pageToken: null, startedAt: cursor.startedAt });
}

export function remainingSources(queue: ESource[], hasMore: boolean): ESource[] {
  if (hasMore) {
    return queue;
  }
  return queue.slice(1);
}

function freshGmailCursor(now: string): IGmailCursor {
  return {
    historyId: null,
    label: EGmailLabel.SENT,
    pageToken: null,
    cutoff: dayjs(now).subtract(PULL_FIRST_LOOKBACK_DAYS, "day").toISOString(),
  };
}

function readGmailCursor(stored: string): IGmailCursor | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    const record = toStringRecord(parsed);
    const cutoff = record?.[EGmailCursorKey.CUTOFF];
    if (!record || typeof cutoff !== "string") {
      return null;
    }
    return {
      historyId: stringOrNull(record[EGmailCursorKey.HISTORY_ID]),
      label: GMAIL_BACKFILL_LABELS.find((label) => label === record[EGmailCursorKey.LABEL]) ?? null,
      pageToken: stringOrNull(record[EGmailCursorKey.PAGE_TOKEN]),
      cutoff,
    };
  } catch {
    return null;
  }
}

function freshChatCursor(now: string): IChatCursor {
  return {
    since: dayjs(now).subtract(PULL_FIRST_LOOKBACK_DAYS, "day").toISOString(),
    sweepStartedAt: now,
    afterSpace: null,
    resumeSpace: null,
    pageToken: null,
    spacesPageToken: null,
  };
}

function readChatCursor(stored: string): IChatCursor | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    const record = toStringRecord(parsed);
    const since = record?.[EChatCursorKey.SINCE];
    const sweepStartedAt = record?.[EChatCursorKey.SWEEP_STARTED_AT];
    if (typeof since !== "string" || typeof sweepStartedAt !== "string") {
      return null;
    }
    if (!(dayjs(since).isValid() && dayjs(sweepStartedAt).isValid())) {
      return null;
    }
    return {
      since: dayjs(since).toISOString(),
      sweepStartedAt: dayjs(sweepStartedAt).toISOString(),
      afterSpace: stringOrNull(record?.[EChatCursorKey.AFTER_SPACE]),
      resumeSpace: stringOrNull(record?.[EChatCursorKey.RESUME_SPACE]),
      pageToken: stringOrNull(record?.[EChatCursorKey.PAGE_TOKEN]),
      spacesPageToken: stringOrNull(record?.[EChatCursorKey.SPACES_PAGE_TOKEN]),
    };
  } catch {
    return null;
  }
}

export function parseGmailCursor(stored: string | null, now: string): IGmailCursor {
  if (!stored) {
    return freshGmailCursor(now);
  }
  const cursor = readGmailCursor(stored);
  if (!cursor || (cursor.label === null && cursor.historyId === null)) {
    return freshGmailCursor(now);
  }
  return cursor;
}

function messageTime(message: TGoogleGmailMessage): number {
  return Number(message.internalDate ?? 0);
}

export function gmailMessagesSince(
  messages: TGoogleGmailMessage[],
  cutoff: string,
): TGoogleGmailMessage[] {
  return messages.filter((message) => messageTime(message) >= dayjs(cutoff).valueOf());
}

function nextBackfillLabel(label: EGmailLabel | null): EGmailLabel | null {
  const index = GMAIL_BACKFILL_LABELS.indexOf(label ?? EGmailLabel.SENT);
  return GMAIL_BACKFILL_LABELS[index + 1] ?? null;
}

export function nextGmailBackfillStep(cursor: IGmailCursor, page: IGoogleGmailPage): IGmailStep {
  const historyId = cursor.historyId ?? page.historyId;
  const reachedCutoff =
    gmailMessagesSince(page.messages, cursor.cutoff).length < page.messages.length;
  if (page.nextPageToken && !reachedCutoff) {
    return { cursor: { ...cursor, historyId, pageToken: page.nextPageToken }, hasMore: true };
  }
  const label = nextBackfillLabel(cursor.label);
  return { cursor: { ...cursor, historyId, label, pageToken: null }, hasMore: label !== null };
}

export function nextGmailHistoryStep(cursor: IGmailCursor, page: IGoogleGmailPage): IGmailStep {
  if (page.nextPageToken) {
    return { cursor: { ...cursor, pageToken: page.nextPageToken }, hasMore: true };
  }
  return {
    cursor: { ...cursor, historyId: page.historyId ?? cursor.historyId, pageToken: null },
    hasMore: false,
  };
}

export function restartGmailPage(now: string): ISourcePage {
  return {
    batch: { drafts: [], removedExternalIds: [] },
    nextCursor: JSON.stringify(freshGmailCursor(now)),
    hasMore: true,
  };
}

export function parseChatCursor(stored: string | null, now: string): IChatCursor {
  if (!stored) {
    return freshChatCursor(now);
  }
  const cursor = readChatCursor(stored);
  if (!cursor) {
    return freshChatCursor(now);
  }
  const isMidSweep =
    cursor.afterSpace !== null || cursor.resumeSpace !== null || cursor.spacesPageToken !== null;
  if (isMidSweep) {
    return cursor;
  }
  return { ...cursor, sweepStartedAt: now };
}

export function completedChatCursor(cursor: IChatCursor): IChatCursor {
  return {
    since: cursor.sweepStartedAt,
    sweepStartedAt: cursor.sweepStartedAt,
    afterSpace: null,
    resumeSpace: null,
    pageToken: null,
    spacesPageToken: null,
  };
}

export function chatSpacesToRead(
  spaces: IGoogleChatSpace[],
  cursor: IChatCursor,
): IGoogleChatSpace[] {
  const { resumeSpace, afterSpace } = cursor;
  if (resumeSpace) {
    return spaces.filter((space) => space.id >= resumeSpace);
  }
  if (afterSpace) {
    return spaces.filter((space) => space.id > afterSpace);
  }
  return spaces;
}

export function chatPageToken(cursor: IChatCursor, spaceId: string): string | null {
  if (cursor.resumeSpace !== spaceId) {
    return null;
  }
  return cursor.pageToken;
}

export function nextChatSpaceCursor(cursor: IChatCursor, lastReadSpaceId: string): IChatCursor {
  return { ...cursor, afterSpace: lastReadSpaceId, resumeSpace: null, pageToken: null };
}

export function nextChatSpacesPageCursor(
  cursor: IChatCursor,
  spacesPageToken: string,
): IChatCursor {
  return {
    ...cursor,
    afterSpace: null,
    resumeSpace: null,
    pageToken: null,
    spacesPageToken,
  };
}

export function chatSpaceId(spaceName: string): string {
  return spaceName.split(CHAT_RESOURCE_SEPARATOR).at(-1) ?? spaceName;
}
