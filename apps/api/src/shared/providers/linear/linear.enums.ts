export enum ELinearOAuthParam {
  PROMPT = "prompt",
}

export enum ELinearOAuthValue {
  CONSENT_PROMPT = "consent",
}

export enum ELinearOAuthError {
  INVALID_GRANT = "invalid_grant",
}

export enum ELinearMessages {
  ACCESS_TOKEN_MISSING = "Linear token refresh returned no access token",
  ISSUES_RESPONSE_EMPTY = "Linear issues response has no data",
  ISSUES_RESPONSE_INVALID = "Linear issues response has an unexpected shape",
  PAGE_CURSOR_STUCK = "Linear reported another page without a new cursor",
}
