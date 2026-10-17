import type { ESource } from "#api/modules/activity/activity.enums";
import type { IActivityBatch } from "#api/modules/activity/activity.interfaces";
import type { TConnectionRow } from "#api/modules/pull/pull.types";
import type { EGmailLabel } from "#api/shared/providers/google/google.enums";
import type { ILinearNestedCursor } from "#api/shared/providers/linear/linear.interfaces";

export interface IPullTarget {
  connection: TConnectionRow;
  identityEmail: string;
}

export interface ISourceCursor {
  value: string;
  isPending: boolean;
}

export interface ISourceReadInput {
  target: IPullTarget;
  accessToken: string;
  cursor: string | null;
  now: string;
}

export interface ISourcePage {
  batch: IActivityBatch;
  nextCursor: string;
  hasMore: boolean;
}

export interface ICalendarCursor {
  syncToken: string | null;
  pageToken: string | null;
  timeMin: string;
  timeMax: string;
  startedAt: string;
}

export interface IDriveCursor {
  timeMin: string;
  pageToken: string | null;
  startedAt: string;
}

export interface IJiraCursor {
  since: string;
  startedAt: string;
  pageToken: string | null;
  offset: number;
}

export interface ILinearCursor {
  since: string;
  after: string | null;
  startedAt: string;
  pending: ILinearNestedCursor[];
}

export interface ILinearStep {
  after: string | null;
  pending: ILinearNestedCursor[];
}

export interface IPullState {
  target: IPullTarget;
  accessToken: string;
  now: string;
  cursors: Map<ESource, ISourceCursor>;
  queue: ESource[];
  pagesLeft: number;
}

export interface IAccessToken {
  value: string;
  isCached: boolean;
}

export interface IGmailCursor {
  historyId: string | null;
  label: EGmailLabel | null;
  pageToken: string | null;
  cutoff: string;
}

export interface IGmailStep {
  cursor: IGmailCursor;
  hasMore: boolean;
}

export interface IChatCursor {
  since: string;
  sweepStartedAt: string;
  afterSpace: string | null;
  resumeSpace: string | null;
  pageToken: string | null;
  spacesPageToken: string | null;
}
