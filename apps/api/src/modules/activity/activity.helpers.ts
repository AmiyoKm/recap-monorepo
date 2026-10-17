import { randomUUID } from "node:crypto";

import {
  ACTIVITY_ACTOR_MAX_LENGTH,
  ACTIVITY_DETAIL_MAX_LENGTH,
  ACTIVITY_NO_PREVIOUS_STATE,
  ACTIVITY_NO_SUBJECT,
  ACTIVITY_NO_TITLE,
  ACTIVITY_TITLE_MAX_LENGTH,
  CALENDAR_FALLBACK_TIME_ZONE,
  CHAT_RESOURCE_SEPARATOR,
  CHAT_USER_PREFIX,
  DRIVE_COMMENT_SUBTYPE_DETAIL,
  DRIVE_EXTERNAL_ID_SEPARATOR,
  DRIVE_FILE_PREFIX,
  DRIVE_UNKNOWN_ACTOR,
  GMAIL_EXCLUDED_LABELS,
  GMAIL_RECIPIENT_SEPARATOR,
  JIRA_STATUS_CHANGE_DETAIL_SEPARATOR,
  LIKE_ESCAPE_CHARACTER,
  LIKE_WILDCARDS,
} from "#api/modules/activity/activity.constants";
import {
  EActivityKind,
  EActivityMessages,
  ECalendarEventStatus,
  ECalendarResponseStatus,
  EChatAnnotationType,
  EChatMentionType,
  EChatWebPath,
  EDriveCommentDetail,
  EDriveExternalIdPrefix,
  ESource,
} from "#api/modules/activity/activity.enums";
import type {
  IActivityBatch,
  IActivityDraft,
  IActivityWriteInput,
  ICalendarMapContext,
  IChatMapContext,
  IDriveMapContext,
  IGmailMapContext,
  IJiraAuthor,
  IJiraBatch,
  IJiraIssueBase,
  IJiraMapContext,
  ILinearMapContext,
} from "#api/modules/activity/activity.interfaces";
import type {
  TActivityInsert,
  TActivityListRow,
  TActivityResponse,
  TDateInput,
} from "#api/modules/activity/activity.types";
import { dayjs } from "#api/shared/date/date.helpers";
import { logError } from "#api/shared/logger/logger.helpers";
import { GOOGLE_DRIVE_ITEM_PREFIX } from "#api/shared/providers/google/google.constants";
import {
  EGmailHeader,
  EGmailLabel,
  EGoogleDriveCommentSubtype,
  EGoogleUrlParam,
} from "#api/shared/providers/google/google.enums";
import type {
  TGoogleCalendarEvent,
  TGoogleChatMessage,
  TGoogleDriveActivity,
  TGoogleDriveActor,
  TGoogleDriveItem,
  TGoogleDriveUser,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
import {
  JIRA_MAX_ACTIVITIES_PER_PAGE,
  JIRA_OVERLAP_MINUTES,
  JIRA_UNASSIGNED_LABEL,
} from "#api/shared/providers/jira/jira.constants";
import { EJiraChangeField } from "#api/shared/providers/jira/jira.enums";
import { adfToText } from "#api/shared/providers/jira/jira.helpers";
import type { IJiraIssuePages } from "#api/shared/providers/jira/jira.interfaces";
import type { TJiraComment, TJiraHistory, TJiraIssue } from "#api/shared/providers/jira/jira.types";
import type {
  ILinearComment,
  ILinearHistoryEntry,
  ILinearIssue,
  ILinearUser,
} from "#api/shared/providers/linear/linear.interfaces";
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

function resourceId(name: string | null | undefined): string | null {
  return name?.split(CHAT_RESOURCE_SEPARATOR).at(-1) || null;
}

function isChatMentionOf(message: TGoogleChatMessage, userId: string): boolean {
  return (message.annotations ?? []).some(
    (annotation) =>
      annotation.type === EChatAnnotationType.USER_MENTION &&
      annotation.userMention?.type === EChatMentionType.MENTION &&
      annotation.userMention.user?.name === `${CHAT_USER_PREFIX}${userId}`,
  );
}

function chatKind(message: TGoogleChatMessage, context: IChatMapContext): EActivityKind | null {
  if (message.sender?.name === `${CHAT_USER_PREFIX}${context.userId}`) {
    return EActivityKind.CHAT_MESSAGE;
  }
  if (isChatMentionOf(message, context.userId)) {
    return EActivityKind.CHAT_MENTION;
  }
  if (context.isDirectMessage) {
    return EActivityKind.CHAT_MESSAGE;
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

function chatWebArea(context: IChatMapContext): EChatWebPath {
  if (context.isDirectMessage) {
    return EChatWebPath.DM;
  }
  return EChatWebPath.ROOM;
}

function chatUrl(message: TGoogleChatMessage, context: IChatMapContext): string | null {
  const threadId = resourceId(message.thread?.name);
  const messageId = resourceId(message.name);
  if (!(threadId && messageId)) {
    return null;
  }
  const link = ROUTES.GOOGLE.CHAT_WEB([chatWebArea(context), context.spaceId, threadId, messageId]);
  return withAuthUser(link, context.identityEmail);
}

function toChatDraft(message: TGoogleChatMessage, context: IChatMapContext): IActivityDraft | null {
  const kind = chatKind(message, context);
  if (!kind) {
    return null;
  }
  const url = chatUrl(message, context);
  if (!(message.name && message.createTime && url)) {
    logError(
      EActivityMessages.ITEM_WITHOUT_URL_DROPPED,
      new Error(message.name ?? context.spaceId),
    );
    return null;
  }
  return {
    source: ESource.CHAT,
    kind,
    externalId: message.name,
    occurredAt: dayjs.utc(message.createTime).toISOString(),
    endsAt: null,
    title: (message.text || ACTIVITY_NO_TITLE).slice(0, ACTIVITY_TITLE_MAX_LENGTH),
    url,
    actor: message.sender?.displayName ?? null,
    detail: null,
  };
}

function isCurrentUserRef(user: TGoogleDriveUser | undefined): boolean {
  return user?.knownUser?.isCurrentUser === true;
}

function isCurrentUser(actor: TGoogleDriveActor | undefined): boolean {
  return isCurrentUserRef(actor?.user);
}

function isOwnedByCurrentUser(item: TGoogleDriveItem | undefined): boolean {
  return isCurrentUserRef(item?.owner?.user);
}

function driveActorId(actor: TGoogleDriveActor | undefined): string {
  return actor?.user?.knownUser?.personName ?? DRIVE_UNKNOWN_ACTOR;
}

function driveFileId(item: TGoogleDriveItem | undefined): string | null {
  const name = item?.name;
  if (!name?.startsWith(GOOGLE_DRIVE_ITEM_PREFIX)) {
    return null;
  }
  return name.slice(GOOGLE_DRIVE_ITEM_PREFIX.length);
}

function driveExternalId(prefix: EDriveExternalIdPrefix, parts: string[]): string {
  return [prefix, ...parts].join(DRIVE_EXTERNAL_ID_SEPARATOR);
}

function driveActorEmail(
  actor: TGoogleDriveActor | undefined,
  context: IDriveMapContext,
): string | null {
  if (!isCurrentUser(actor)) {
    return null;
  }
  return context.identityEmail;
}

function driveEventTime(activity: TGoogleDriveActivity): string | null {
  return activity.timestamp ?? activity.timeRange?.endTime ?? null;
}

export function driveFileIdFromExternalId(externalId: string): string | null {
  const [, fileId] = externalId.split(DRIVE_EXTERNAL_ID_SEPARATOR);
  return fileId || null;
}

function toDriveFileDraft(
  activity: TGoogleDriveActivity,
  context: IDriveMapContext,
  kind: EActivityKind.DRIVE_FILE_CREATED | EActivityKind.DRIVE_FILE_EDITED,
): IActivityDraft | null {
  const item = activity.targets?.[0]?.driveItem;
  const actor = activity.actors?.[0];
  const fileId = driveFileId(item);
  const isCreated = kind === EActivityKind.DRIVE_FILE_CREATED;
  const eventTime = driveEventTime(activity);
  if (!(fileId && eventTime && isOwnedByCurrentUser(item))) {
    return null;
  }
  if (isCreated !== isCurrentUser(actor)) {
    return null;
  }
  const url = withAuthUser(ROUTES.GOOGLE.DRIVE_OPEN(fileId), context.identityEmail);
  if (!url) {
    return null;
  }
  const prefix = DRIVE_FILE_PREFIX[kind];
  return {
    source: ESource.DRIVE,
    kind,
    externalId: driveExternalId(prefix, [fileId, eventTime, driveActorId(actor)]),
    occurredAt: dayjs.utc(eventTime).toISOString(),
    endsAt: null,
    title: item?.title ?? ACTIVITY_NO_TITLE,
    url,
    actor: driveActorEmail(actor, context),
    detail: null,
  };
}

export function mapChatMessages(
  messages: TGoogleChatMessage[],
  context: IChatMapContext,
): IActivityBatch {
  const drafts = messages.flatMap((message) => toChatDraft(message, context) ?? []);
  return { drafts, removedExternalIds: [] };
}

function driveCommentDetail(
  activity: TGoogleDriveActivity,
  subtype: EGoogleDriveCommentSubtype,
): EDriveCommentDetail {
  const mentioned = activity.primaryActionDetail?.comment?.mentionedUsers ?? [];
  if (mentioned.some(isCurrentUserRef)) {
    return EDriveCommentDetail.MENTION;
  }
  return DRIVE_COMMENT_SUBTYPE_DETAIL[subtype];
}

function toDriveCommentDraft(
  activity: TGoogleDriveActivity,
  context: IDriveMapContext,
  commentedFileIds: Set<string>,
): IActivityDraft | null {
  const comment = activity.primaryActionDetail?.comment;
  const subtype = Object.values(EGoogleDriveCommentSubtype).find(
    (entry) => entry === comment?.post?.subtype,
  );
  const target = activity.targets?.[0]?.fileComment;
  const actor = activity.actors?.[0];
  const fileId = driveFileId(target?.parent);
  const eventTime = driveEventTime(activity);
  if (!(subtype && fileId && eventTime)) {
    return null;
  }
  const detail = driveCommentDetail(activity, subtype);
  const isRelevant =
    detail === EDriveCommentDetail.MENTION ||
    isCurrentUser(actor) ||
    isOwnedByCurrentUser(target?.parent) ||
    commentedFileIds.has(fileId);
  if (!isRelevant) {
    return null;
  }
  const url = withAuthUser(target?.linkToDiscussion, context.identityEmail);
  if (!url) {
    logError(
      EActivityMessages.ITEM_WITHOUT_URL_DROPPED,
      new Error(EActivityMessages.ITEM_WITHOUT_URL_DROPPED, { cause: fileId }),
    );
    return null;
  }
  return {
    source: ESource.DRIVE,
    kind: EActivityKind.DRIVE_COMMENT,
    externalId: driveExternalId(EDriveExternalIdPrefix.COMMENT, [
      fileId,
      eventTime,
      driveActorId(actor),
    ]),
    occurredAt: dayjs.utc(eventTime).toISOString(),
    endsAt: null,
    title: target?.parent?.title ?? ACTIVITY_NO_TITLE,
    url,
    actor: driveActorEmail(actor, context),
    detail,
  };
}

function toDriveDraft(
  activity: TGoogleDriveActivity,
  context: IDriveMapContext,
  commentedFileIds: Set<string>,
): IActivityDraft | null {
  const detail = activity.primaryActionDetail;
  if (detail?.create) {
    return toDriveFileDraft(activity, context, EActivityKind.DRIVE_FILE_CREATED);
  }
  if (detail?.edit) {
    return toDriveFileDraft(activity, context, EActivityKind.DRIVE_FILE_EDITED);
  }
  if (detail?.comment) {
    return toDriveCommentDraft(activity, context, commentedFileIds);
  }
  return null;
}

function pageCommentedFileIds(activities: TGoogleDriveActivity[]): string[] {
  return activities.flatMap((activity) => {
    const comment = activity.primaryActionDetail?.comment;
    const isPost = Object.values(EGoogleDriveCommentSubtype).some(
      (subtype) => subtype === comment?.post?.subtype,
    );
    const fileId = driveFileId(activity.targets?.[0]?.fileComment?.parent);
    if (!(isPost && fileId && isCurrentUser(activity.actors?.[0]))) {
      return [];
    }
    return [fileId];
  });
}

export function mapDriveActivities(
  activities: TGoogleDriveActivity[],
  context: IDriveMapContext,
): IActivityBatch {
  const commentedFileIds = new Set([
    ...context.commentedFileIds,
    ...pageCommentedFileIds(activities),
  ]);
  const drafts = new Map<string, IActivityDraft>();
  for (const activity of activities) {
    const draft = toDriveDraft(activity, context, commentedFileIds);
    if (draft) {
      drafts.set(draft.externalId, draft);
    }
  }
  return { drafts: [...drafts.values()], removedExternalIds: [] };
}

function linearActor(user: ILinearUser | null | undefined): string | null {
  if (!user) {
    return null;
  }
  return user.email ?? user.name;
}

function linearTitle(issue: ILinearIssue): string {
  return `${issue.identifier} ${issue.title}`.slice(0, ACTIVITY_TITLE_MAX_LENGTH);
}

function linearDraft(
  issue: ILinearIssue,
  fields: Pick<IActivityDraft, "kind" | "externalId" | "occurredAt" | "actor" | "detail"> &
    Partial<Pick<IActivityDraft, "url">>,
): IActivityDraft {
  return {
    source: ESource.LINEAR,
    endsAt: null,
    title: linearTitle(issue),
    url: issue.url,
    ...fields,
  };
}

function assignedExternalId(entry: ILinearHistoryEntry): string {
  if (!entry.toState) {
    return entry.id;
  }
  return `${entry.id}:assigned`;
}

function linearHistoryDrafts(issue: ILinearIssue, entry: ILinearHistoryEntry): IActivityDraft[] {
  const drafts: IActivityDraft[] = [];
  const occurredAt = dayjs(entry.createdAt).toISOString();
  const actor = linearActor(entry.actor);
  if (entry.toState) {
    const from = entry.fromState?.name ?? ACTIVITY_NO_PREVIOUS_STATE;
    drafts.push(
      linearDraft(issue, {
        kind: EActivityKind.ISSUE_STATUS_CHANGED,
        externalId: entry.id,
        occurredAt,
        actor,
        detail: `${from} to ${entry.toState.name}`,
      }),
    );
  }
  if (!entry.toAssignee) {
    return drafts;
  }
  drafts.push(
    linearDraft(issue, {
      kind: EActivityKind.ISSUE_ASSIGNED,
      externalId: assignedExternalId(entry),
      occurredAt,
      actor,
      detail: entry.toAssignee.name,
    }),
  );
  return drafts;
}

function linearCommentDraft(issue: ILinearIssue, comment: ILinearComment): IActivityDraft | null {
  if (!comment.url) {
    logError(EActivityMessages.ITEM_WITHOUT_URL_DROPPED, new Error(comment.id));
    return null;
  }
  return linearDraft(issue, {
    kind: EActivityKind.ISSUE_COMMENTED,
    externalId: comment.id,
    occurredAt: dayjs(comment.createdAt).toISOString(),
    actor: linearActor(comment.user),
    detail: comment.body.slice(0, ACTIVITY_DETAIL_MAX_LENGTH),
    url: comment.url,
  });
}

function linearIssueDrafts(issue: ILinearIssue, since: string): IActivityDraft[] {
  const drafts: IActivityDraft[] = [];
  if (!dayjs(issue.createdAt).isBefore(since)) {
    drafts.push(
      linearDraft(issue, {
        kind: EActivityKind.ISSUE_CREATED,
        externalId: `${issue.id}:created`,
        occurredAt: dayjs(issue.createdAt).toISOString(),
        actor: linearActor(issue.creator),
        detail: null,
      }),
    );
  }
  for (const entry of issue.history.nodes) {
    if (dayjs(entry.createdAt).isBefore(since)) {
      continue;
    }
    drafts.push(...linearHistoryDrafts(issue, entry));
  }
  for (const comment of issue.comments.nodes) {
    const draft = linearCommentDraft(issue, comment);
    if (!draft) {
      continue;
    }
    drafts.push(draft);
  }
  return drafts;
}

export function mapLinearIssues(
  issues: ILinearIssue[],
  context: ILinearMapContext,
): IActivityBatch {
  const batch: IActivityBatch = { drafts: [], removedExternalIds: [] };
  for (const issue of issues) {
    if (!issue.url) {
      logError(EActivityMessages.ITEM_WITHOUT_URL_DROPPED, new Error(issue.id));
      continue;
    }
    batch.drafts.push(...linearIssueDrafts(issue, context.since));
  }
  return batch;
}

export function toKnownValue<TValue extends string>(values: TValue[], value: string): TValue {
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

function toOptionalIso(value: TDateInput): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.toISOString();
}

function jiraActor(author: IJiraAuthor | null | undefined): string | null {
  return author?.emailAddress ?? author?.displayName ?? null;
}

function jiraChangeDraft(
  issue: IJiraIssueBase,
  change: { externalId: string; kind: EActivityKind; occurredAt: string; detail: string | null },
  actor: string | null,
): IActivityDraft {
  return {
    source: ESource.JIRA,
    kind: change.kind,
    externalId: change.externalId,
    occurredAt: change.occurredAt,
    endsAt: null,
    title: issue.title,
    url: ROUTES.JIRA.ISSUE(issue.context.site, issue.key),
    actor,
    detail: change.detail,
  };
}

function jiraHistoryItemDrafts(history: TJiraHistory, base: IJiraIssueBase): IActivityDraft[] {
  const occurredAt = toOptionalIso(history.created);
  if (!(history.id && occurredAt)) {
    return [];
  }
  return (history.items ?? []).flatMap((item) => {
    const kind = jiraChangeKind(item.field);
    if (!kind) {
      return [];
    }
    return [
      jiraChangeDraft(
        base,
        {
          externalId: `${history.id}:${item.field}`,
          kind,
          occurredAt,
          detail: jiraChangeDetail(kind, item),
        },
        jiraActor(history.author),
      ),
    ];
  });
}

function jiraHistoryDrafts(histories: TJiraHistory[], base: IJiraIssueBase): IActivityDraft[] {
  return histories.flatMap((history) => jiraHistoryItemDrafts(history, base));
}

function jiraChangeKind(field: string | undefined): EActivityKind | null {
  if (field === EJiraChangeField.STATUS) {
    return EActivityKind.ISSUE_STATUS_CHANGED;
  }
  if (field === EJiraChangeField.ASSIGNEE) {
    return EActivityKind.ISSUE_ASSIGNED;
  }
  return null;
}

function ownString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value;
}

function jiraChangeDetail(
  kind: EActivityKind,
  item: { fromString?: string | null; toString?: string | null },
): string | null {
  const to = ownString(item.toString);
  if (kind === EActivityKind.ISSUE_ASSIGNED) {
    return to ?? JIRA_UNASSIGNED_LABEL;
  }
  return [ownString(item.fromString), to].filter(Boolean).join(JIRA_STATUS_CHANGE_DETAIL_SEPARATOR);
}

function jiraCommentDrafts(comments: TJiraComment[], base: IJiraIssueBase): IActivityDraft[] {
  const drafts: IActivityDraft[] = [];
  for (const comment of comments) {
    const occurredAt = toOptionalIso(comment.created);
    if (!(comment.id && occurredAt)) {
      continue;
    }
    drafts.push({
      ...jiraChangeDraft(
        base,
        {
          externalId: comment.id,
          kind: EActivityKind.ISSUE_COMMENTED,
          occurredAt,
          detail: adfToText(comment.body).slice(0, ACTIVITY_DETAIL_MAX_LENGTH),
        },
        jiraActor(comment.author),
      ),
      url: ROUTES.JIRA.COMMENT(base.context.site, base.key, comment.id),
    });
  }
  return drafts;
}

function jiraCreatedDraft(issue: TJiraIssue, base: IJiraIssueBase): IActivityDraft[] {
  const occurredAt = toOptionalIso(issue.fields?.created);
  if (!(issue.id && occurredAt)) {
    return [];
  }
  return [
    jiraChangeDraft(
      base,
      {
        externalId: `created:${issue.id}`,
        kind: EActivityKind.ISSUE_CREATED,
        occurredAt,
        detail: null,
      },
      jiraActor(issue.fields?.reporter),
    ),
  ];
}

function mapJiraIssue(issue: TJiraIssue, context: IJiraMapContext): IActivityDraft[] {
  if (!(issue.id && issue.key)) {
    logError(
      EActivityMessages.JIRA_ISSUE_INCOMPLETE,
      new Error(EActivityMessages.JIRA_ISSUE_INCOMPLETE, {
        cause: { id: issue.id, key: issue.key },
      }),
    );
    return [];
  }
  const summary = issue.fields?.summary ?? ACTIVITY_NO_TITLE;
  const base = { key: issue.key, title: `${issue.key}: ${summary}`, context };
  return jiraDraftsSince(
    [
      ...jiraCreatedDraft(issue, base),
      ...jiraHistoryDrafts(issue.changelog?.histories ?? [], base),
      ...jiraCommentDrafts(issue.fields?.comment?.comments ?? [], base),
    ],
    context.since,
  );
}

function jiraDraftsSince(drafts: IActivityDraft[], since: string): IActivityDraft[] {
  const floor = dayjs(since).subtract(JIRA_OVERLAP_MINUTES, "minute");
  return drafts.filter((draft) => !dayjs(draft.occurredAt).isBefore(floor));
}

export function mapJiraIssuePages(
  pages: IJiraIssuePages,
  pending: { issueKey: string; summary: string | null },
  context: IJiraMapContext,
): IActivityBatch {
  const base = {
    key: pending.issueKey,
    title: `${pending.issueKey}: ${pending.summary ?? ACTIVITY_NO_TITLE}`,
    context,
  };
  const drafts = jiraDraftsSince(
    [
      ...jiraHistoryDrafts(pages.histories.items, base),
      ...jiraCommentDrafts(pages.comments.items, base),
    ],
    context.since,
  );
  return { drafts: drafts.sort(compareNewestFirst), removedExternalIds: [] };
}

function compareNewestFirst(left: IActivityDraft, right: IActivityDraft): number {
  return (
    right.occurredAt.localeCompare(left.occurredAt) ||
    left.externalId.localeCompare(right.externalId)
  );
}

export function mapJiraIssues(issues: TJiraIssue[], context: IJiraMapContext): IJiraBatch {
  const sorted = issues.flatMap((issue) => mapJiraIssue(issue, context)).sort(compareNewestFirst);
  const end = context.offset + JIRA_MAX_ACTIVITIES_PER_PAGE;
  return {
    drafts: sorted.slice(context.offset, end),
    removedExternalIds: [],
    overflow: sorted.length > end,
  };
}
