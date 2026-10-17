import { randomUUID } from "node:crypto";

import {
  ACTIVITY_NO_TITLE,
  AUTHUSER_PARAM,
  CALENDAR_FALLBACK_TIME_ZONE,
  LIKE_ESCAPE_CHARACTER,
  LIKE_WILDCARDS,
} from "#api/modules/activity/activity.constants";
import {
  EActivityKind,
  EActivityMessages,
  ECalendarEventStatus,
  ECalendarResponseStatus,
  ESource,
} from "#api/modules/activity/activity.enums";
import type {
  IActivityBatch,
  IActivityDraft,
  IActivityWriteInput,
  ICalendarMapContext,
} from "#api/modules/activity/activity.interfaces";
import type {
  TActivityInsert,
  TActivityListRow,
  TActivityResponse,
} from "#api/modules/activity/activity.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { logError } from "#api/shared/logger/logger.helpers";
import type { TGoogleCalendarEvent } from "#api/shared/providers/google/google.types";

export function withAuthUser(link: string | null | undefined, email: string): string | null {
  if (!link) {
    return null;
  }
  try {
    const url = new URL(link);
    url.searchParams.set(AUTHUSER_PARAM, email);
    return url.toString();
  } catch {
    return null;
  }
}

export function escapeLike(text: string): string {
  return text.replace(LIKE_WILDCARDS, (character) => `${LIKE_ESCAPE_CHARACTER}${character}`);
}

function calendarTimeToIso(
  time: TGoogleCalendarEvent["start"],
  timeZone: string | null,
): string | null {
  if (time?.dateTime) {
    return dayjs.utc(time.dateTime).toISOString();
  }
  if (!time?.date) {
    return null;
  }
  return dayjs.tz(time.date, timeZone ?? CALENDAR_FALLBACK_TIME_ZONE).toISOString();
}

function isRemovedCalendarEvent(event: TGoogleCalendarEvent): boolean {
  if (event.status === ECalendarEventStatus.CANCELLED) {
    return true;
  }
  return (event.attendees ?? []).some(
    (attendee) =>
      attendee.self === true && attendee.responseStatus === ECalendarResponseStatus.DECLINED,
  );
}

function toCalendarDraft(
  event: TGoogleCalendarEvent,
  externalId: string,
  context: ICalendarMapContext,
): IActivityDraft | null {
  const occurredAt = calendarTimeToIso(event.start, context.timeZone);
  const url = withAuthUser(event.htmlLink, context.identityEmail);
  if (!(occurredAt && url)) {
    return null;
  }
  return {
    source: ESource.CALENDAR,
    kind: EActivityKind.CALENDAR_EVENT,
    externalId,
    occurredAt,
    endsAt: calendarTimeToIso(event.end, context.timeZone),
    title: event.summary ?? ACTIVITY_NO_TITLE,
    url,
    actor: event.organizer?.email ?? null,
    detail: event.location ?? null,
  };
}

export function mapCalendarEvents(
  events: TGoogleCalendarEvent[],
  context: ICalendarMapContext,
): IActivityBatch {
  const batch: IActivityBatch = { drafts: [], removedExternalIds: [] };
  for (const event of events) {
    if (!event.id) {
      continue;
    }
    if (isRemovedCalendarEvent(event)) {
      batch.removedExternalIds.push(event.id);
      continue;
    }
    const draft = toCalendarDraft(event, event.id, context);
    if (!draft) {
      logError(EActivityMessages.ITEM_WITHOUT_URL_DROPPED, new Error(event.id));
      continue;
    }
    batch.drafts.push(draft);
  }
  return batch;
}

function toKnownValue<TValue extends string>(values: TValue[], value: string): TValue {
  const match = values.find((entry) => entry === value);
  if (match === undefined) {
    throw new Error(EActivityMessages.UNKNOWN_ACTIVITY_VALUE, { cause: value });
  }
  return match;
}

export function toActivityView(row: TActivityListRow): TActivityResponse {
  return {
    id: row.id,
    identityId: row.identityId,
    identityEmail: row.identityEmail,
    source: toKnownValue(Object.values(ESource), row.source),
    kind: toKnownValue(Object.values(EActivityKind), row.kind),
    occurredAt: row.occurredAt,
    endsAt: row.endsAt,
    title: row.title,
    url: row.url,
    actor: row.actor,
    detail: row.detail,
  };
}

export function nonEmpty(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  return values;
}

export function toInsert(
  draft: IActivityDraft,
  input: Pick<IActivityWriteInput, "identityId" | "connectionId">,
  now: string,
): TActivityInsert {
  return { id: randomUUID(), ...input, ...draft, createdAt: now, updatedAt: now };
}

export function toIsoBound(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return dayjs(value).toISOString();
}
