import type { TJiraComment, TJiraHistory, TJiraIssue } from "#api/shared/providers/jira/jira.types";

export interface IJiraSite {
  cloudId: string;
  host: string;
}

export interface IJiraSearchInput {
  accessToken: string;
  cloudId: string;
  since: string;
  pageToken: string | null;
}

export interface IJiraIssuePage {
  issues: TJiraIssue[];
  nextPageToken: string | null;
}

export interface IJiraPendingCursor {
  issueKey: string;
  summary: string | null;
  commentsStartAt: number | null;
  changelogStartAt: number | null;
}

export interface IJiraIssueReadInput extends IJiraPendingCursor {
  accessToken: string;
  cloudId: string;
}

export interface IJiraPartialPage<TItem> {
  items: TItem[];
  nextStartAt: number | null;
}

export interface IJiraIssuePages {
  comments: IJiraPartialPage<TJiraComment>;
  histories: IJiraPartialPage<TJiraHistory>;
}

export interface IJiraIssueRead {
  pages: IJiraIssuePages | null;
}
