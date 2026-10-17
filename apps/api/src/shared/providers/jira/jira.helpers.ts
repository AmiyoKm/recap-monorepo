import type { AccessibleResource, OAuth2TokenResponse } from "jira.js";

import { dayjs } from "#api/shared/date/date.helpers";
import { toStringRecord } from "#api/shared/json/json.helpers";
import {
  JIRA_ADF_BLOCK_SEPARATOR,
  JIRA_JQL_DATE_FORMAT,
  JIRA_JQL_MARGIN_DAYS,
  JIRA_SITE_PATTERN,
  JIRA_WHITESPACE_PATTERN,
  JIRA_WORK_SCOPE,
} from "#api/shared/providers/jira/jira.constants";
import { EJiraAdfNode, EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import type { IJiraPendingCursor, IJiraSite } from "#api/shared/providers/jira/jira.interfaces";
import type { TJiraIssue } from "#api/shared/providers/jira/jira.types";
import { OAUTH_SCOPE_SEPARATOR } from "#api/shared/providers/providers.constants";
import type { IProviderAccount, IProviderTokens } from "#api/shared/providers/providers.interfaces";

export function normalizeJiraSite(site: string): string | null {
  const host = site
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.trim()
    .toLowerCase();
  if (!(host && JIRA_SITE_PATTERN.test(host))) {
    return null;
  }
  return host;
}

export function toJiraAccount(
  accountId: string | undefined,
  accountEmail: string | null | undefined,
): IProviderAccount {
  if (!(accountId && accountEmail)) {
    throw new Error(EJiraMessages.ACCOUNT_INCOMPLETE);
  }
  return { accountId, accountEmail };
}

export function toJiraSite(resources: AccessibleResource[]): IJiraSite {
  for (const resource of resources) {
    const host = normalizeJiraSite(resource.url);
    if (host && resource.scopes.includes(JIRA_WORK_SCOPE)) {
      return { cloudId: resource.id, host };
    }
  }
  throw new Error(EJiraMessages.NO_ACCESSIBLE_SITE);
}

export function toJiraTokens(tokens: OAuth2TokenResponse): IProviderTokens {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresInSeconds: tokens.expiresIn,
    scopes: tokens.scope.split(OAUTH_SCOPE_SEPARATOR).filter((scope) => scope.length > 0),
  };
}

export function buildJiraJql(since: string): string {
  const bound = dayjs.utc(since).subtract(JIRA_JQL_MARGIN_DAYS, "day").format(JIRA_JQL_DATE_FORMAT);
  return `(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser()) AND updated >= "${bound}" ORDER BY updated ASC`;
}

function adfLeafText(record: Record<string, unknown>): string | null {
  const { type, text, attrs } = record;
  if (type === EJiraAdfNode.TEXT && typeof text === "string") {
    return text;
  }
  if (type === EJiraAdfNode.HARD_BREAK) {
    return JIRA_ADF_BLOCK_SEPARATOR;
  }
  if (type !== EJiraAdfNode.MENTION) {
    return null;
  }
  const { text: mention } = toStringRecord(attrs) ?? {};
  if (typeof mention !== "string") {
    return "";
  }
  return mention;
}

function adfNodeText(node: unknown): string {
  const record = toStringRecord(node);
  if (!record) {
    return "";
  }
  const leaf = adfLeafText(record);
  if (leaf !== null) {
    return leaf;
  }
  const { content } = record;
  if (!Array.isArray(content)) {
    return "";
  }
  return `${content.map(adfNodeText).join("")}${JIRA_ADF_BLOCK_SEPARATOR}`;
}

export function adfToText(body: unknown): string {
  return adfNodeText(body).replace(JIRA_WHITESPACE_PATTERN, JIRA_ADF_BLOCK_SEPARATOR).trim();
}

export function nextJiraStartAt(page: {
  startAt: number;
  returned: number;
  total: number | undefined;
}): number | null {
  const next = page.startAt + page.returned;
  if (page.returned === 0 || page.total === undefined || next >= page.total) {
    return null;
  }
  return next;
}

export function jiraPendingCursor(issue: TJiraIssue): IJiraPendingCursor | null {
  if (!issue.key) {
    return null;
  }
  const comments = issue.fields?.comment;
  const changelog = issue.changelog;
  const commentsStartAt = nextJiraStartAt({
    startAt: 0,
    returned: comments?.comments?.length ?? 0,
    total: comments?.total,
  });
  const changelogStartAt = nextJiraStartAt({
    startAt: 0,
    returned: changelog?.histories?.length ?? 0,
    total: changelog?.total,
  });
  if (commentsStartAt === null && changelogStartAt === null) {
    return null;
  }
  return {
    issueKey: issue.key,
    summary: issue.fields?.summary ?? null,
    commentsStartAt,
    changelogStartAt,
  };
}
