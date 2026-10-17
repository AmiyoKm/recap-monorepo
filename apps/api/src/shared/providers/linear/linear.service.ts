import { AuthenticationLinearError, InvalidInputLinearError, LinearClient } from "@linear/sdk";
import {
  CodeChallengeMethod,
  generateCodeVerifier,
  OAuth2Client,
  OAuth2RequestError,
} from "arctic";

import { ENV } from "#api/shared/env/env.constants";
import {
  LINEAR_ISSUE_QUERY,
  LINEAR_ISSUES_QUERY,
  LINEAR_REQUEST_TIMEOUT_MS,
  LINEAR_SCOPES,
} from "#api/shared/providers/linear/linear.constants";
import {
  ELinearMessages,
  ELinearOAuthError,
  ELinearOAuthParam,
  ELinearOAuthValue,
} from "#api/shared/providers/linear/linear.enums";
import {
  buildIssuesVariables,
  buildIssueVariables,
  nextPageCursor,
  parseIssueData,
  parseIssuesData,
  toLinearTokens,
} from "#api/shared/providers/linear/linear.helpers";
import type {
  ILinearCodeExchangeInput,
  ILinearIssueRead,
  ILinearIssueReadInput,
  ILinearIssuesPage,
  ILinearIssuesReadInput,
} from "#api/shared/providers/linear/linear.interfaces";
import type {
  IProviderAuthorization,
  IProviderAuthorizeInput,
  IProviderGrant,
  IProviderTokens,
} from "#api/shared/providers/providers.interfaces";
import { ROUTES } from "#api/shared/routes/routes.constants";

export abstract class LinearService {
  static createAuthorization(input: IProviderAuthorizeInput): IProviderAuthorization {
    const codeVerifier = generateCodeVerifier();
    const url = LinearService.client(input.redirectUri).createAuthorizationURLWithPKCE(
      ROUTES.LINEAR.AUTHORIZE,
      input.state,
      CodeChallengeMethod.S256,
      codeVerifier,
      LINEAR_SCOPES,
    );
    url.searchParams.set(ELinearOAuthParam.PROMPT, ELinearOAuthValue.CONSENT_PROMPT);
    return { authorizeUrl: url.toString(), codeVerifier };
  }

  static async exchangeCode(input: ILinearCodeExchangeInput): Promise<IProviderGrant> {
    const tokens = toLinearTokens(
      await LinearService.withTimeout(
        LinearService.client(input.redirectUri).validateAuthorizationCode(
          ROUTES.LINEAR.TOKEN,
          input.code,
          input.codeVerifier,
        ),
      ),
    );
    const linear = new LinearClient({
      accessToken: tokens.accessToken,
      signal: AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS),
    });
    const viewer = await linear.viewer;
    return {
      tokens,
      account: { accountId: viewer.id, accountEmail: viewer.email },
      site: null,
      resourceId: null,
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<IProviderTokens | null> {
    try {
      const tokens = toLinearTokens(
        await LinearService.withTimeout(
          LinearService.client(null).refreshAccessToken(ROUTES.LINEAR.TOKEN, refreshToken, []),
        ),
      );
      if (!tokens.accessToken) {
        throw new Error(ELinearMessages.ACCESS_TOKEN_MISSING);
      }
      return tokens;
    } catch (error) {
      if (error instanceof OAuth2RequestError && error.code === ELinearOAuthError.INVALID_GRANT) {
        return null;
      }
      throw error;
    }
  }

  static async listIssues(input: ILinearIssuesReadInput): Promise<ILinearIssuesPage | null> {
    const linear = new LinearClient({
      accessToken: input.accessToken,
      signal: AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS),
    });
    const variables = buildIssuesVariables(input);
    try {
      const { data } = await linear.client.rawRequest<unknown, typeof variables>(
        LINEAR_ISSUES_QUERY,
        variables,
      );
      if (!data) {
        throw new Error(ELinearMessages.ISSUES_RESPONSE_EMPTY);
      }
      const { nodes, pageInfo } = parseIssuesData(data).issues;
      return { issues: nodes, nextPageCursor: nextPageCursor(pageInfo, input.after) };
    } catch (error) {
      if (error instanceof AuthenticationLinearError) {
        return null;
      }
      throw error;
    }
  }

  static async readIssue(input: ILinearIssueReadInput): Promise<ILinearIssueRead | null> {
    const linear = new LinearClient({
      accessToken: input.accessToken,
      signal: AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS),
    });
    const variables = buildIssueVariables(input);
    try {
      const { data } = await linear.client.rawRequest<unknown, typeof variables>(
        LINEAR_ISSUE_QUERY,
        variables,
      );
      if (!data) {
        throw new Error(ELinearMessages.ISSUES_RESPONSE_EMPTY);
      }
      return { issue: parseIssueData(data) };
    } catch (error) {
      if (error instanceof AuthenticationLinearError) {
        return null;
      }
      if (error instanceof InvalidInputLinearError) {
        return { issue: null };
      }
      throw error;
    }
  }

  private static withTimeout<TValue>(task: Promise<TValue>): Promise<TValue> {
    const signal = AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS);
    const timeout = new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    return Promise.race([task, timeout]);
  }

  private static client(redirectUri: string | null): OAuth2Client {
    return new OAuth2Client(ENV.linear.clientId, ENV.linear.clientSecret, redirectUri);
  }
}
