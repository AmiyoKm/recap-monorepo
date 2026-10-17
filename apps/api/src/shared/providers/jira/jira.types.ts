import type { CloudClient } from "jira.js";

export type TJiraSearchResult = Awaited<ReturnType<CloudClient["issueSearch"]["searchIssues"]>>;
export type TJiraIssue = NonNullable<TJiraSearchResult["issues"]>[number];
export type TJiraHistory = NonNullable<NonNullable<TJiraIssue["changelog"]>["histories"]>[number];
