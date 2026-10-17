import type { TActivityListRow } from "#api/modules/activity/activity.types";
import type { TDigestItem } from "#api/modules/digest/digest.types";

export interface IDigestCandidate {
  userId: string;
  timeZone: string;
}

export interface IDigestDueInput {
  now: string;
  timeZone: string;
  existingDates: readonly string[];
}

export interface IDigestStartInput {
  userId: string;
  digestDate: string;
  windowStart: string;
  windowEnd: string;
}

export interface IDigestSaveReadyInput {
  digestId: string;
  content: string;
  model: string | null;
}

export interface IDigestIdentity {
  id: string;
  email: string;
}

export interface IDigestPromptInput {
  identities: IDigestIdentity[];
  windowRows: TActivityListRow[];
  aheadRows: TActivityListRow[];
  windowStart: string;
  windowEnd: string;
  timeZone: string;
}

export interface IDigestPastRow {
  userId: string;
  digestDate: string;
  windowEnd: string;
}

export interface IDigestStarted {
  id: string;
  userId: string;
}

export interface IDigestLaunchFailure {
  digestIds: string[];
  error: unknown;
}

export interface IDigestContentInput {
  identities: IDigestIdentity[];
  windowRows: TActivityListRow[];
  aheadRows: TActivityListRow[];
  timeZone: string;
  isTruncated: boolean;
}

export interface IDigestSectionDraft {
  highlights: TDigestItem[];
  meetingsAhead: TDigestItem[];
  needsYou: TDigestItem[];
}

export interface IDigestWindowCap {
  windowRows: TActivityListRow[];
  isTruncated: boolean;
}
