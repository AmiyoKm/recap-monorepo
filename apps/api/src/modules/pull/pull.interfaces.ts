import type { ESource } from "#api/modules/activity/activity.enums";
import type { IActivityBatch } from "#api/modules/activity/activity.interfaces";
import type { TConnectionRow } from "#api/modules/pull/pull.types";

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
