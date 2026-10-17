import type { TJiraIssue } from "#api/shared/providers/jira/jira.types";

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
