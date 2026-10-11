import { isAuthError, isForbiddenError } from "jira.js";

import { JIRA_SITE_PATTERN } from "#api/shared/providers/jira/jira.constants";

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
