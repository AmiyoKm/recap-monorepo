import type { AccessibleResource, OAuth2TokenResponse } from "jira.js";

import { JIRA_SITE_PATTERN, JIRA_WORK_SCOPE } from "#api/shared/providers/jira/jira.constants";
import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import type { IJiraSite } from "#api/shared/providers/jira/jira.interfaces";
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
