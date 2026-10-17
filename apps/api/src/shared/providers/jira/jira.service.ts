import {
  createCloudClient,
  exchangeAuthorizationCode,
  generateAuthorizationUrl,
  getAccessibleResources,
} from "jira.js";

import { ENV } from "#api/shared/env/env.constants";
import type { IOAuthClientEnv } from "#api/shared/env/env.interfaces";
import { JIRA_REQUEST_TIMEOUT_MS, JIRA_SCOPES } from "#api/shared/providers/jira/jira.constants";
import { EJiraMessages } from "#api/shared/providers/jira/jira.enums";
import { toJiraAccount, toJiraSite, toJiraTokens } from "#api/shared/providers/jira/jira.helpers";
import type {
  IProviderAuthorization,
  IProviderAuthorizeInput,
  IProviderCodeExchangeInput,
  IProviderGrant,
} from "#api/shared/providers/providers.interfaces";

export abstract class JiraService {
  static createAuthorization(input: IProviderAuthorizeInput): IProviderAuthorization {
    const authorizeUrl = generateAuthorizationUrl({
      clientId: JiraService.client().clientId,
      scopes: JIRA_SCOPES,
      redirectUri: input.redirectUri,
      state: input.state,
    });
    return { authorizeUrl, codeVerifier: null };
  }

  static async exchangeCode(input: IProviderCodeExchangeInput): Promise<IProviderGrant> {
    const { clientId, clientSecret } = JiraService.client();
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

  private static client(): IOAuthClientEnv {
    if (!ENV.jira) {
      throw new Error(EJiraMessages.NOT_CONFIGURED);
    }
    return ENV.jira;
  }

  private static fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, { ...init, signal: AbortSignal.timeout(JIRA_REQUEST_TIMEOUT_MS) });
  }
}
