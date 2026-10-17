import type { EActivityKind, ESource } from "#api/modules/activity/activity.enums";

export interface IActivityDraft {
  source: ESource;
  kind: EActivityKind;
  externalId: string;
  occurredAt: string;
  endsAt: string | null;
  title: string;
  url: string;
  actor: string | null;
  detail: string | null;
}

export interface IActivityBatch {
  drafts: IActivityDraft[];
  removedExternalIds: string[];
}

export interface IActivityWriteInput extends IActivityBatch {
  identityId: string;
  connectionId: string;
}

export interface IActivityListFilters {
  userId: string;
  from: string | undefined;
  to: string | undefined;
  sources: string[] | undefined;
  identityIds: string[] | undefined;
  kinds: string[] | undefined;
  text: string | undefined;
  page: number;
  pageSize: number;
}

export interface IDriveMapContext {
  identityEmail: string;
  commentedFileIds: Set<string>;
}

export interface ICalendarMapContext {
  identityEmail: string;
  timeZone: string | null;
}

export interface IGmailMapContext {
  identityEmail: string;
}

export interface IChatMapContext {
  identityEmail: string;
  userId: string;
  spaceId: string;
  isDirectMessage: boolean;
}

export interface IJiraMapContext {
  site: string;
  since: string;
  offset: number;
}

export interface IJiraBatch extends IActivityBatch {
  overflow: boolean;
}

export interface IJiraAuthor {
  displayName?: string | undefined;
  emailAddress?: string | undefined;
}

export interface IJiraIssueBase {
  key: string;
  title: string;
  context: IJiraMapContext;
}
