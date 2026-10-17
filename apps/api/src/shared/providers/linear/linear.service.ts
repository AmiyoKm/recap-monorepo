import { LinearClient } from "@linear/sdk";
import { CodeChallengeMethod, generateCodeVerifier, OAuth2Client } from "arctic";

import { ENV } from "#api/shared/env/env.constants";
import {
  LINEAR_REQUEST_TIMEOUT_MS,
  LINEAR_SCOPES,
} from "#api/shared/providers/linear/linear.constants";
import { ELinearOAuthParam, ELinearOAuthValue } from "#api/shared/providers/linear/linear.enums";
import { toLinearTokens } from "#api/shared/providers/linear/linear.helpers";
import type { ILinearCodeExchangeInput } from "#api/shared/providers/linear/linear.interfaces";
import type {
  IProviderAuthorization,
  IProviderAuthorizeInput,
  IProviderGrant,
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

  private static withTimeout<TValue>(task: Promise<TValue>): Promise<TValue> {
    const signal = AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS);
    const timeout = new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    return Promise.race([task, timeout]);
  }

  private static client(redirectUri: string): OAuth2Client {
    return new OAuth2Client(ENV.linear.clientId, ENV.linear.clientSecret, redirectUri);
  }
}
