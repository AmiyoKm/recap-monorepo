import { randomUUID } from "node:crypto";

import {
  ACTIVITY_ACTOR_MAX_LENGTH,
  ACTIVITY_DETAIL_MAX_LENGTH,
  ACTIVITY_NO_SUBJECT,
  ACTIVITY_NO_TITLE,
  ACTIVITY_TITLE_MAX_LENGTH,
  CALENDAR_FALLBACK_TIME_ZONE,
  GMAIL_EXCLUDED_LABELS,
  GMAIL_RECIPIENT_SEPARATOR,
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
  IGmailMapContext,
} from "#api/modules/activity/activity.interfaces";
import type {
  TActivityInsert,
  TActivityListRow,
  TActivityResponse,
} from "#api/modules/activity/activity.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { logError } from "#api/shared/logger/logger.helpers";
import {
  EGmailHeader,
  EGmailLabel,
  EGoogleUrlParam,
} from "#api/shared/providers/google/google.enums";
import type {
  TGoogleCalendarEvent,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
import { ROUTES } from "#api/shared/routes/routes.constants";

export function withAuthUser(link: string | null | undefined, email: string): string | null {
  if (!link) {
    return null;
  }
  try {
    const url = new URL(link);
    url.searchParams.set(EGoogleUrlParam.AUTHUSER, email);
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

function gmailHeader(message: TGoogleGmailMessage, name: EGmailHeader): string | null {
  const header = message.payload?.headers?.find(
    (entry) => entry.name?.toLowerCase() === name.toLowerCase(),
  );
  return header?.value || null;
}

function gmailKind(labels: string[]): EActivityKind | null {
  if (GMAIL_EXCLUDED_LABELS.some((label) => labels.includes(label))) {
    return null;
  }
  if (labels.includes(EGmailLabel.SENT)) {
    return EActivityKind.EMAIL_SENT;
  }
  if (labels.includes(EGmailLabel.INBOX)) {
    return EActivityKind.EMAIL_RECEIVED;
  }
  return null;
}

function gmailRecipients(message: TGoogleGmailMessage): string | null {
  const recipients = [EGmailHeader.TO, EGmailHeader.CC]
    .map((name) => gmailHeader(message, name))
    .filter((value) => value !== null);
  if (recipients.length === 0) {
    return null;
  }
  return recipients.join(GMAIL_RECIPIENT_SEPARATOR).slice(0, ACTIVITY_DETAIL_MAX_LENGTH);
}

function toGmailDraft(
  message: TGoogleGmailMessage,
  kind: EActivityKind,
  context: IGmailMapContext,
): IActivityDraft | null {
  if (!(message.id && message.threadId && message.internalDate)) {
    return null;
  }
  return {
    source: ESource.GMAIL,
    kind,
    externalId: message.id,
    occurredAt: dayjs(Number(message.internalDate)).toISOString(),
    endsAt: null,
    title: (gmailHeader(message, EGmailHeader.SUBJECT) ?? ACTIVITY_NO_SUBJECT).slice(
      0,
      ACTIVITY_TITLE_MAX_LENGTH,
    ),
    url: ROUTES.GOOGLE.GMAIL_THREAD(context.identityEmail, message.threadId),
    actor: gmailHeader(message, EGmailHeader.FROM)?.slice(0, ACTIVITY_ACTOR_MAX_LENGTH) ?? null,
    detail: gmailRecipients(message),
  };
}

export function mapGmailMessages(
  messages: TGoogleGmailMessage[],
  context: IGmailMapContext,
): IActivityBatch {
  const batch: IActivityBatch = { drafts: [], removedExternalIds: [] };
  for (const message of messages) {
    const kind = gmailKind(message.labelIds ?? []);
    if (!kind) {
      continue;
    }
    const draft = toGmailDraft(message, kind, context);
    if (!draft) {
      logError(
        EActivityMessages.ITEM_INCOMPLETE_DROPPED,
        new Error(EActivityMessages.ITEM_INCOMPLETE_DROPPED, {
          cause: message.id ?? message.threadId ?? undefined,
        }),
      );
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
