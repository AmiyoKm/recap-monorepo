import { isAuthError, isForbiddenError } from "jira.js";

import { JIRA_SITE_PATTERN } from "#api/shared/providers/jira/jira.constants";
import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";

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

export function isRejectedJiraCredential(error: unknown): boolean {
  return isAuthError(error) || isForbiddenError(error);
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
