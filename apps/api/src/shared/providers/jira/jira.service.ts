import {
  createCloudClient,
  exchangeAuthorizationCode,
  generateAuthorizationUrl,
  getAccessibleResources,
  isAuthError,
  isReauthorizationRequired,
  refreshOAuth2Token,
} from "jira.js";

import { ENV } from "#api/shared/env/env.constants";
import {
  JIRA_REQUEST_TIMEOUT_MS,
  JIRA_SCOPES,
  JIRA_SEARCH_EXPAND,
  JIRA_SEARCH_FIELDS,
  JIRA_SEARCH_PAGE_SIZE,
} from "#api/shared/providers/jira/jira.constants";
import {
  buildJiraJql,
  toJiraAccount,
  toJiraSite,
  toJiraTokens,
} from "#api/shared/providers/jira/jira.helpers";
import type { IJiraIssuePage, IJiraSearchInput } from "#api/shared/providers/jira/jira.interfaces";
import type {
  IProviderAuthorization,
  IProviderAuthorizeInput,
  IProviderCodeExchangeInput,
  IProviderGrant,
  IProviderTokens,
} from "#api/shared/providers/providers.interfaces";

export abstract class JiraService {
  static createAuthorization(input: IProviderAuthorizeInput): IProviderAuthorization {
    const authorizeUrl = generateAuthorizationUrl({
      clientId: ENV.jira.clientId,
      scopes: JIRA_SCOPES,
      redirectUri: input.redirectUri,
      state: input.state,
    });
    return { authorizeUrl, codeVerifier: null };
  }

  static async exchangeCode(input: IProviderCodeExchangeInput): Promise<IProviderGrant> {
    const { clientId, clientSecret } = ENV.jira;
    const tokens = await exchangeAuthorizationCode({
      clientId,
      clientSecret,
      code: input.code,
      redirectUri: input.redirectUri,
      fetch: JiraService.fetchWithTimeout,
    });
    const site = toJiraSite(
      await getAccessibleResources(tokens.accessToken, JiraService.fetchWithTimeout),
    );
    const jira = createCloudClient({
      auth: { type: "oauth2", accessToken: tokens.accessToken, cloudId: site.cloudId },
    });
    const user = await jira.myself.getCurrentUser(
      {},
      { signal: AbortSignal.timeout(JIRA_REQUEST_TIMEOUT_MS) },
    );
    return {
      tokens: toJiraTokens(tokens),
      account: toJiraAccount(user.accountId, user.emailAddress),
      site: site.host,
      resourceId: site.cloudId,
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<IProviderTokens | null> {
    const { clientId, clientSecret } = ENV.jira;
    try {
      const tokens = await refreshOAuth2Token({
        clientId,
        clientSecret,
        refreshToken,
        fetch: JiraService.fetchWithTimeout,
      });
      return toJiraTokens(tokens);
    } catch (error) {
      if (isReauthorizationRequired(error)) {
        return null;
      }
      throw error;
    }
  }

  static async searchIssues(input: IJiraSearchInput): Promise<IJiraIssuePage | null> {
    const jira = createCloudClient({
      auth: { type: "oauth2", accessToken: input.accessToken, cloudId: input.cloudId },
    });
    try {
      const result = await jira.issueSearch.searchIssues(
        {
          jql: buildJiraJql(input.since),
          maxResults: JIRA_SEARCH_PAGE_SIZE,
          fields: JIRA_SEARCH_FIELDS,
          expand: JIRA_SEARCH_EXPAND,
          nextPageToken: input.pageToken ?? undefined,
        },
        { signal: AbortSignal.timeout(JIRA_REQUEST_TIMEOUT_MS) },
      );
      return { issues: result.issues ?? [], nextPageToken: result.nextPageToken ?? null };
    } catch (error) {
      if (isAuthError(error)) {
        return null;
      }
      throw error;
    }
  }

  private static fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, { ...init, signal: AbortSignal.timeout(JIRA_REQUEST_TIMEOUT_MS) });
  }
}
