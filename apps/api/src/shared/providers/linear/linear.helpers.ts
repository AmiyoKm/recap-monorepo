import type { OAuth2Tokens } from "arctic";

import { dayjs } from "#api/shared/date/date.helpers";
import { toStringRecord } from "#api/shared/json/json.helpers";
import {
  LINEAR_COMMENT_PAGE_SIZE,
  LINEAR_HISTORY_PAGE_SIZE,
  LINEAR_ISSUE_PAGE_SIZE,
} from "#api/shared/providers/linear/linear.constants";
import { ELinearMessages } from "#api/shared/providers/linear/linear.enums";
import type {
  ILinearComment,
  ILinearConnection,
  ILinearHistoryEntry,
  ILinearIssue,
  ILinearIssueReadInput,
  ILinearIssuesData,
  ILinearIssuesReadInput,
  ILinearNestedCursor,
  ILinearPageInfo,
  ILinearUser,
} from "#api/shared/providers/linear/linear.interfaces";
import type { TLinearIssueFilter } from "#api/shared/providers/linear/linear.types";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

function linearRefreshToken(tokens: OAuth2Tokens): string | undefined {
  if (!tokens.hasRefreshToken()) {
    return undefined;
  }
  return tokens.refreshToken();
}

function linearScopes(tokens: OAuth2Tokens): string[] {
  if (!tokens.hasScopes()) {
    return [];
  }
  return tokens.scopes();
}

export function toLinearTokens(tokens: OAuth2Tokens): IProviderTokens {
  return {
    accessToken: tokens.accessToken(),
    refreshToken: linearRefreshToken(tokens),
    expiresInSeconds: tokens.accessTokenExpiresInSeconds(),
    scopes: linearScopes(tokens),
  };
}

export function buildIssuesVariables(input: ILinearIssuesReadInput) {
  return {
    first: LINEAR_ISSUE_PAGE_SIZE,
    after: input.after,
    filter: buildIssueFilter(input.since),
    since: input.since,
    historyFirst: LINEAR_HISTORY_PAGE_SIZE,
    commentsFirst: LINEAR_COMMENT_PAGE_SIZE,
    historyAfter: null,
    commentsAfter: null,
    withHistory: true,
    withComments: true,
  };
}

export function buildIssueVariables(input: ILinearIssueReadInput) {
  return {
    id: input.issueId,
    since: input.since,
    historyFirst: LINEAR_HISTORY_PAGE_SIZE,
    commentsFirst: LINEAR_COMMENT_PAGE_SIZE,
    historyAfter: input.historyAfter,
    commentsAfter: input.commentsAfter,
    withHistory: input.historyAfter !== null,
    withComments: input.commentsAfter !== null,
  };
}

export function nextPageCursor(pageInfo: ILinearPageInfo, after: string | null): string | null {
  if (!pageInfo.hasNextPage) {
    return null;
  }
  if (pageInfo.endCursor === null || pageInfo.endCursor === after) {
    throw new Error(ELinearMessages.PAGE_CURSOR_STUCK, { cause: after });
  }
  return pageInfo.endCursor;
}

function historyContinuation(
  issue: ILinearIssue,
  since: string,
  after: string | null,
): string | null {
  const last = issue.history.nodes.at(-1);
  if (!last || dayjs(last.createdAt).isBefore(since)) {
    return null;
  }
  return nextPageCursor(issue.history.pageInfo, after);
}

export function nestedContinuation(
  issue: ILinearIssue,
  since: string,
  previous: ILinearNestedCursor | null,
): ILinearNestedCursor | null {
  const historyAfter = historyContinuation(issue, since, previous?.historyAfter ?? null);
  const commentsAfter = nextPageCursor(issue.comments.pageInfo, previous?.commentsAfter ?? null);
  if (historyAfter === null && commentsAfter === null) {
    return null;
  }
  return { issueId: issue.id, historyAfter, commentsAfter };
}

function buildIssueFilter(since: string): TLinearIssueFilter {
  return {
    updatedAt: { gte: since },
    or: [
      { assignee: { isMe: { eq: true } } },
      { creator: { isMe: { eq: true } } },
      { comments: { some: { user: { isMe: { eq: true } } } } },
    ],
  };
}

function invalidResponse(field: string): Error {
  return new Error(ELinearMessages.ISSUES_RESPONSE_INVALID, { cause: field });
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  const record = toStringRecord(value);
  if (!record) {
    throw invalidResponse(field);
  }
  return record;
}

function readField(record: Record<string, unknown>, field: string): unknown {
  return record[field];
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw invalidResponse(field);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (value === null || value === undefined) {
    return null;
  }
  return requireString(record, field);
}

function parseUser(value: unknown, field: string): ILinearUser | null {
  if (value === null || value === undefined) {
    return null;
  }
  const record = requireRecord(value, field);
  return { name: requireString(record, "name"), email: optionalString(record, "email") };
}

function parseStateName(value: unknown, field: string): { name: string } | null {
  if (value === null || value === undefined) {
    return null;
  }
  return { name: requireString(requireRecord(value, field), "name") };
}

function parseNodes<TNode>(
  value: unknown,
  field: string,
  parseNode: (node: unknown) => TNode,
): TNode[] {
  const nodes = readField(requireRecord(value, field), "nodes");
  if (!Array.isArray(nodes)) {
    throw invalidResponse(field);
  }
  return nodes.map((node) => parseNode(node));
}

function parsePageInfo(value: unknown): ILinearPageInfo {
  const pageInfo = requireRecord(value, "pageInfo");
  const hasNextPage = readField(pageInfo, "hasNextPage");
  if (typeof hasNextPage !== "boolean") {
    throw invalidResponse("hasNextPage");
  }
  return { hasNextPage, endCursor: optionalString(pageInfo, "endCursor") };
}

function parseConnection<TNode>(
  value: unknown,
  field: string,
  parseNode: (node: unknown) => TNode,
): ILinearConnection<TNode> {
  if (value === undefined) {
    return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
  return {
    nodes: parseNodes(value, field, parseNode),
    pageInfo: parsePageInfo(readField(requireRecord(value, field), "pageInfo")),
  };
}

function parseHistoryEntry(value: unknown): ILinearHistoryEntry {
  const record = requireRecord(value, "history.nodes");
  return {
    id: requireString(record, "id"),
    createdAt: requireString(record, "createdAt"),
    actor: parseUser(readField(record, "actor"), "actor"),
    fromState: parseStateName(readField(record, "fromState"), "fromState"),
    toState: parseStateName(readField(record, "toState"), "toState"),
    toAssignee: parseUser(readField(record, "toAssignee"), "toAssignee"),
  };
}

function parseComment(value: unknown): ILinearComment {
  const record = requireRecord(value, "comments.nodes");
  return {
    id: requireString(record, "id"),
    createdAt: requireString(record, "createdAt"),
    url: requireString(record, "url"),
    body: requireString(record, "body"),
    user: parseUser(readField(record, "user"), "user"),
  };
}

function parseIssue(value: unknown): ILinearIssue {
  const record = requireRecord(value, "issues.nodes");
  return {
    id: requireString(record, "id"),
    identifier: requireString(record, "identifier"),
    title: requireString(record, "title"),
    url: requireString(record, "url"),
    createdAt: requireString(record, "createdAt"),
    creator: parseUser(readField(record, "creator"), "creator"),
    history: parseConnection(readField(record, "history"), "history", parseHistoryEntry),
    comments: parseConnection(readField(record, "comments"), "comments", parseComment),
  };
}

export function parseIssuesData(data: unknown): ILinearIssuesData {
  const issues = requireRecord(readField(requireRecord(data, "data"), "issues"), "issues");
  return {
    issues: {
      nodes: parseNodes(issues, "issues", parseIssue),
      pageInfo: parsePageInfo(readField(issues, "pageInfo")),
    },
  };
}

export function parseIssueData(data: unknown): ILinearIssue | null {
  const issue = readField(requireRecord(data, "data"), "issue");
  if (issue === null) {
    return null;
  }
  return parseIssue(issue);
}
