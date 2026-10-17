export const LINEAR_REQUEST_TIMEOUT_MS = 10000;
export const LINEAR_SCOPES = ["read"];
export const LINEAR_ISSUE_PAGE_SIZE = 4;
export const LINEAR_HISTORY_PAGE_SIZE = 15;
export const LINEAR_COMMENT_PAGE_SIZE = 15;
const LINEAR_DRAFTS_PER_HISTORY_ENTRY = 2;
export const LINEAR_MAX_DRAFTS_PER_PAGE =
  LINEAR_ISSUE_PAGE_SIZE *
  (1 + LINEAR_HISTORY_PAGE_SIZE * LINEAR_DRAFTS_PER_HISTORY_ENTRY + LINEAR_COMMENT_PAGE_SIZE);
const LINEAR_ISSUE_FIELDS = `
      id
      identifier
      title
      url
      createdAt
      creator { name email }
      history(first: $historyFirst, after: $historyAfter, orderBy: createdAt) @include(if: $withHistory) {
        nodes {
          id
          createdAt
          actor { name email }
          fromState { name }
          toState { name }
          toAssignee { name email }
        }
        pageInfo { hasNextPage endCursor }
      }
      comments(first: $commentsFirst, after: $commentsAfter, filter: { createdAt: { gte: $since } }) @include(if: $withComments) {
        nodes {
          id
          createdAt
          url
          body
          user { name email }
        }
        pageInfo { hasNextPage endCursor }
      }
`;
export const LINEAR_ISSUES_QUERY = `
query RecapIssues($first: Int!, $after: String, $filter: IssueFilter, $since: DateTimeOrDuration, $historyFirst: Int!, $commentsFirst: Int!, $historyAfter: String, $commentsAfter: String, $withHistory: Boolean!, $withComments: Boolean!) {
  issues(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
    nodes {${LINEAR_ISSUE_FIELDS}}
    pageInfo { hasNextPage endCursor }
  }
}
`;
export const LINEAR_ISSUE_QUERY = `
query RecapIssue($id: String!, $since: DateTimeOrDuration, $historyFirst: Int!, $commentsFirst: Int!, $historyAfter: String, $commentsAfter: String, $withHistory: Boolean!, $withComments: Boolean!) {
  issue(id: $id) {${LINEAR_ISSUE_FIELDS}}
}
`;
