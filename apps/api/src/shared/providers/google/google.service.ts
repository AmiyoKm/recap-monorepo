import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { ENV } from "#api/shared/env/env.constants";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "#api/shared/providers/google/google.constants";
import { EGoogleMessages, EGoogleOAuthValue } from "#api/shared/providers/google/google.enums";
import { toGoogleProfile, toGoogleTokens } from "#api/shared/providers/google/google.helpers";
import type {
  IGoogleAuthorization,
  IGoogleAuthorizeInput,
  IGoogleCodeExchangeInput,
  IGoogleGrant,
  IGoogleProfile,
} from "#api/shared/providers/google/google.interfaces";

export abstract class GoogleService {
  private static readonly client = new OAuth2Client({
    clientId: ENV.auth.google.clientId,
    clientSecret: ENV.auth.google.clientSecret,
    transporterOptions: { timeout: GOOGLE_REQUEST_TIMEOUT_MS },
  });

  static async createAuthorization(input: IGoogleAuthorizeInput): Promise<IGoogleAuthorization> {
    const { codeVerifier, codeChallenge } = await GoogleService.client.generateCodeVerifierAsync();
    const authorizeUrl = GoogleService.client.generateAuthUrl({
      redirect_uri: input.redirectUri,
      scope: input.scopes,
      state: input.state,
      access_type: EGoogleOAuthValue.OFFLINE_ACCESS_TYPE,
      prompt: EGoogleOAuthValue.CONSENT_PROMPT,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
    });
    return { authorizeUrl, codeVerifier };
  }

  static async exchangeCode(input: IGoogleCodeExchangeInput): Promise<IGoogleGrant> {
    const { tokens } = await GoogleService.client.getToken({
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    });
    if (!(tokens.access_token && tokens.id_token)) {
      throw new Error(EGoogleMessages.ID_TOKEN_MISSING);
    }
    const profile = await GoogleService.verifyProfile(tokens.id_token);
    return { tokens: toGoogleTokens(tokens.access_token, tokens), profile };
  }

  private static async verifyProfile(idToken: string): Promise<IGoogleProfile> {
    const ticket = await GoogleService.client.verifyIdToken({
      idToken,
      audience: ENV.auth.google.clientId,
    });
    return toGoogleProfile(ticket.getPayload());
  }
}
