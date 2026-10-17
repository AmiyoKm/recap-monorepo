import type { IProviderCodeExchangeInput } from "#api/shared/providers/providers.interfaces";

export interface ILinearCodeExchangeInput extends IProviderCodeExchangeInput {
  codeVerifier: string;
}

export interface ILinearUser {
  name: string;
  email: string | null;
}

export interface ILinearHistoryEntry {
  id: string;
  createdAt: string;
  actor: ILinearUser | null;
  fromState: { name: string } | null;
  toState: { name: string } | null;
  toAssignee: ILinearUser | null;
}

export interface ILinearComment {
  id: string;
  createdAt: string;
  url: string;
  body: string;
  user: ILinearUser | null;
}

export interface ILinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  createdAt: string;
  creator: ILinearUser | null;
  history: ILinearConnection<ILinearHistoryEntry>;
  comments: ILinearConnection<ILinearComment>;
}

export interface ILinearPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ILinearConnection<TNode> {
  nodes: TNode[];
  pageInfo: ILinearPageInfo;
}

export interface ILinearNestedCursor {
  issueId: string;
  historyAfter: string | null;
  commentsAfter: string | null;
}

export interface ILinearIssueReadInput extends ILinearNestedCursor {
  accessToken: string;
  since: string;
}

export interface ILinearIssueRead {
  issue: ILinearIssue | null;
}

export interface ILinearIssuesData {
  issues: { nodes: ILinearIssue[]; pageInfo: ILinearPageInfo };
}

export interface ILinearIssuesReadInput {
  accessToken: string;
  since: string;
  after: string | null;
}

export interface ILinearIssuesPage {
  issues: ILinearIssue[];
  nextPageCursor: string | null;
}
