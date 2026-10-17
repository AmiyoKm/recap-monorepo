import { randomUUID } from "node:crypto";

import { toKnownValue } from "#api/modules/activity/activity.helpers";
import type { TActivityListRow } from "#api/modules/activity/activity.types";
import {
  DIGEST_EXTRA_TIME_ZONES,
  DIGEST_ITEM_ACTIVITY_IDS_MAX,
  DIGEST_ITEM_TEXT_MAX_LENGTH,
  DIGEST_ITEMS_MAX,
  DIGEST_LOCAL_DATE_FORMAT,
  DIGEST_NO_PREVIOUS_WINDOW_HOURS,
  DIGEST_PROMPT_DETAIL_LENGTH,
  DIGEST_RUN_HOUR,
  DIGEST_SECTIONS_MAX,
  DIGEST_WEEKEND_BACK_DAYS,
  MONDAY,
  SATURDAY,
  SUNDAY,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages, EDigestStatus, EDigestStep } from "#api/modules/digest/digest.enums";
import type {
  IDigestCandidate,
  IDigestContentInput,
  IDigestDueInput,
  IDigestIdentity,
  IDigestPastRow,
  IDigestPromptInput,
  IDigestSectionDraft,
  IDigestStartInput,
  IDigestWindowCap,
} from "#api/modules/digest/digest.interfaces";
import {
  digestStoredContentSchema,
  digestStoredMissingSourcesSchema,
} from "#api/modules/digest/digest.model";
import type {
  TDigestAiOutput,
  TDigestContent,
  TDigestItem,
  TDigestMissingSource,
  TDigestResponse,
  TDigestRow,
  TDigestSection,
} from "#api/modules/digest/digest.types";
import { readableSources } from "#api/modules/pull/pull.helpers";
import type { IPullTarget } from "#api/modules/pull/pull.interfaces";
import { dayjs } from "#api/shared/date/date.helpers";

export function isSupportedTimeZone(timeZone: string): boolean {
  return (
    DIGEST_EXTRA_TIME_ZONES.includes(timeZone) ||
    Intl.supportedValuesOf("timeZone").includes(timeZone)
  );
}

function isWeekend(localDate: string): boolean {
  const weekday = dayjs.utc(localDate).day();
  return weekday === SATURDAY || weekday === SUNDAY;
}

function nextWorkday(localDate: string): string {
  const next = nextLocalDate(localDate);
  if (!isWeekend(next)) {
    return next;
  }
  return nextWorkday(next);
}

function nextLocalDate(localDate: string): string {
  return dayjs.utc(localDate).add(1, "day").format(DIGEST_LOCAL_DATE_FORMAT);
}

function runTimeText(localDate: string): string {
  const hour = String(DIGEST_RUN_HOUR).padStart(2, "0");
  return `${localDate} ${hour}:00`;
}

export function nextDigestRunAt(now: string, timeZone: string): string {
  const local = dayjs(now).tz(timeZone);
  const today = local.format(DIGEST_LOCAL_DATE_FORMAT);
  const runDate = resolveRunDate(today, local.hour());
  return dayjs.tz(runTimeText(runDate), timeZone).toISOString();
}

function resolveRunDate(today: string, hour: number): string {
  const isBeforeRun = hour < DIGEST_RUN_HOUR;
  if (isBeforeRun && !isWeekend(today)) {
    return today;
  }
  return nextWorkday(today);
}

export function localDigestDate(now: string, timeZone: string): string {
  return dayjs(now).tz(timeZone).format(DIGEST_LOCAL_DATE_FORMAT);
}

export function isDigestDue(input: IDigestDueInput): boolean {
  const local = dayjs(input.now).tz(input.timeZone);
  const date = local.format(DIGEST_LOCAL_DATE_FORMAT);
  if (local.hour() !== DIGEST_RUN_HOUR) {
    return false;
  }
  if (isWeekend(date)) {
    return false;
  }
  return !input.existingDates.includes(date);
}

export function defaultWindowStart(now: string, timeZone: string): string {
  const local = dayjs(now).tz(timeZone);
  if (local.day() !== MONDAY) {
    return dayjs(now).subtract(DIGEST_NO_PREVIOUS_WINDOW_HOURS, "hour").toISOString();
  }
  const friday = local.subtract(DIGEST_WEEKEND_BACK_DAYS, "day").format(DIGEST_LOCAL_DATE_FORMAT);
  return dayjs.tz(runTimeText(friday), timeZone).toISOString();
}

export function startOfNextLocalDay(localDate: string, timeZone: string): string {
  return dayjs.tz(`${nextLocalDate(localDate)} 00:00`, timeZone).toISOString();
}

function toDigestStatus(value: string): EDigestStatus {
  return toKnownValue(Object.values(EDigestStatus), value);
}

export function parseDigestContent(stored: string | null): TDigestContent | null {
  if (!stored) {
    return null;
  }
  const parsed: unknown = JSON.parse(stored);
  const result = digestStoredContentSchema.safeParse(parsed);
  if (!result.success) {
    return null;
  }
  return result.data;
}

export function parseMissingSources(stored: string): TDigestMissingSource[] {
  const parsed: unknown = JSON.parse(stored);
  const result = digestStoredMissingSourcesSchema.safeParse(parsed);
  if (!result.success) {
    return [];
  }
  return result.data;
}

export function toDigestView(row: TDigestRow): TDigestResponse {
  return {
    id: row.id,
    digestDate: row.digestDate,
    status: toDigestStatus(row.status),
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    content: parseDigestContent(row.content),
    missingSources: parseMissingSources(row.missingSources),
    error: row.error,
    updatedAt: row.updatedAt,
  };
}

export function newDigestId(): string {
  return randomUUID();
}

function activityLine(row: TActivityListRow, timeZone: string): string {
  const time = dayjs(row.occurredAt).tz(timeZone).format("YYYY-MM-DD HH:mm");
  const detail = (row.detail ?? "").slice(0, DIGEST_PROMPT_DETAIL_LENGTH);
  return `- [${row.id}] ${time} | ${row.source} ${row.kind} | ${row.title} | ${row.actor ?? ""} | ${detail}`;
}

function identityBlock(identity: IDigestIdentity, input: IDigestPromptInput): string {
  const ofIdentity = (row: TActivityListRow) => row.identityId === identity.id;
  const activities = input.windowRows
    .filter(ofIdentity)
    .map((row) => activityLine(row, input.timeZone));
  const meetings = input.aheadRows
    .filter(ofIdentity)
    .map((row) => activityLine(row, input.timeZone));
  return [
    `## Work Identity ${identity.email} (identityId: ${identity.id})`,
    "Activities in the window:",
    ...activities,
    "Meetings still ahead today:",
    ...meetings,
  ].join("\n");
}

export function buildDigestPrompt(input: IDigestPromptInput): string {
  const header = `Window: ${input.windowStart} to ${input.windowEnd}. Time zone: ${input.timeZone}.`;
  return [header, ...input.identities.map((identity) => identityBlock(identity, input))].join(
    "\n\n",
  );
}

function meetingItem(row: TActivityListRow, timeZone: string): TDigestItem {
  const time = dayjs(row.occurredAt).tz(timeZone).format("HH:mm");
  return { text: `${time} ${row.title}`, activityIds: [row.id] };
}

function limitItems(items: TDigestItem[] | undefined, allowedIds: Set<string>): TDigestItem[] {
  return (items ?? [])
    .map((item) => ({
      text: item.text.trim().slice(0, DIGEST_ITEM_TEXT_MAX_LENGTH).trim(),
      activityIds: [...new Set(item.activityIds.filter((id) => allowedIds.has(id)))].slice(
        0,
        DIGEST_ITEM_ACTIVITY_IDS_MAX,
      ),
    }))
    .filter((item) => item.text.length > 0 && item.activityIds.length > 0)
    .slice(0, DIGEST_ITEMS_MAX);
}

function idsOfIdentity(rows: TActivityListRow[], identityId: string): Set<string> {
  return new Set(rows.filter((row) => row.identityId === identityId).map((row) => row.id));
}

function buildSections(
  input: IDigestContentInput,
  draftOf: (identity: IDigestIdentity) => IDigestSectionDraft | undefined,
): TDigestSection[] {
  return input.identities.slice(0, DIGEST_SECTIONS_MAX).map((identity) => {
    const windowIds = idsOfIdentity(input.windowRows, identity.id);
    const aheadIds = idsOfIdentity(input.aheadRows, identity.id);
    const anyIds = new Set([...windowIds, ...aheadIds]);
    const draft = draftOf(identity);
    return {
      identityId: identity.id,
      identityEmail: identity.email,
      highlights: limitItems(draft?.highlights, anyIds),
      meetingsAhead: limitItems(draft?.meetingsAhead, aheadIds),
      needsYou: limitItems(draft?.needsYou, anyIds),
    };
  });
}

export function buildNothingNewContent(input: IDigestContentInput): TDigestContent {
  const sections = buildSections(input, (identity) => ({
    highlights: [],
    meetingsAhead: input.aheadRows
      .filter((row) => row.identityId === identity.id)
      .map((row) => meetingItem(row, input.timeZone)),
    needsYou: [],
  }));
  return { nothingNew: true, truncated: input.isTruncated, sections };
}

export function toDigestContent(
  output: TDigestAiOutput,
  input: IDigestContentInput,
): TDigestContent {
  const sections = buildSections(input, (identity) =>
    output.sections.find((section) => section.identityId === identity.id),
  );
  return { nothingNew: false, truncated: input.isTruncated, sections };
}

export function capWindowRows(
  fetchedNewestFirst: TActivityListRow[],
  limit: number,
): IDigestWindowCap {
  return {
    windowRows: fetchedNewestFirst.slice(0, limit).reverse(),
    isTruncated: fetchedNewestFirst.length > limit,
  };
}

export function toDigestStart(
  candidate: IDigestCandidate,
  now: string,
  past: IDigestPastRow[],
): IDigestStartInput | null {
  const ofUser = past.filter((row) => row.userId === candidate.userId);
  const existingDates = ofUser.map((row) => row.digestDate);
  if (!isDigestDue({ now, timeZone: candidate.timeZone, existingDates })) {
    return null;
  }
  const digestDate = localDigestDate(now, candidate.timeZone);
  const previous = ofUser
    .filter((row) => row.digestDate < digestDate)
    .sort((left, right) => right.digestDate.localeCompare(left.digestDate))[0];
  return {
    userId: candidate.userId,
    digestDate,
    windowStart: previous?.windowEnd ?? defaultWindowStart(now, candidate.timeZone),
    windowEnd: now,
  };
}

export function toMissingSource(target: IPullTarget): TDigestMissingSource {
  return {
    connectionId: target.connection.id,
    identityEmail: target.identityEmail,
    provider: target.connection.provider,
    sources: readableSources(target.connection),
  };
}

export function requireDigest(row: TDigestRow | undefined, digestId: string): TDigestRow {
  if (!row) {
    throw new Error(EDigestMessages.DIGEST_MISSING, { cause: digestId });
  }
  return row;
}

export function pullStepName(connectionId: string): string {
  return `${EDigestStep.PULL_CONNECTION}:${connectionId}`;
}
