export const JIRA_REQUEST_TIMEOUT_MS = 10000;
export const JIRA_SITE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.atlassian\.net$/;
export const JIRA_WORK_SCOPE = "read:jira-work";
export const JIRA_SCOPES = ["read:jira-user", JIRA_WORK_SCOPE, "offline_access"];
