import { calendar } from "@googleapis/calendar";
import { CodeChallengeMethod, gaxios, OAuth2Client } from "google-auth-library";

import { ENV } from "#api/shared/env/env.constants";
import { toStringRecord } from "#api/shared/json/json.helpers";
import {
  GOOGLE_CALENDAR_API_VERSION,
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_PAGE_SIZE,
  GOOGLE_REQUEST_TIMEOUT_MS,
  HTTP_GONE,
  HTTP_UNAUTHORIZED,
} from "#api/shared/providers/google/google.constants";
import {
  EGoogleMessages,
  EGoogleOAuthError,
  EGoogleOAuthValue,
} from "#api/shared/providers/google/google.enums";
import {
  calendarRange,
  hasStatus,
  toGoogleProfile,
  toGoogleTokens,
} from "#api/shared/providers/google/google.helpers";
import type {
  IGoogleAuthorization,
  IGoogleAuthorizeInput,
  IGoogleCalendarPage,
  IGoogleCalendarReadInput,
  IGoogleCodeExchangeInput,
  IGoogleGrant,
  IGoogleProfile,
} from "#api/shared/providers/google/google.interfaces";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

export abstract class GoogleService {
  private static readonly client = GoogleService.createClient();

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

  static async revokeToken(refreshToken: string): Promise<void> {
    try {
      await GoogleService.client.revokeToken(refreshToken);
    } catch (error) {
      if (!GoogleService.isInvalidTokenError(error)) {
        throw error;
      }
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<IProviderTokens | null> {
    const client = GoogleService.createClient();
    client.setCredentials({ refresh_token: refreshToken });
    try {
      const { credentials } = await client.refreshAccessToken();
      if (!credentials.access_token) {
        throw new Error(EGoogleMessages.ACCESS_TOKEN_MISSING);
      }
      return toGoogleTokens(credentials.access_token, credentials);
    } catch (error) {
      if (GoogleService.hasOAuthError(error, EGoogleOAuthError.INVALID_GRANT)) {
        return null;
      }
      throw error;
    }
  }

  static async listCalendarEvents(
    input: IGoogleCalendarReadInput,
  ): Promise<IGoogleCalendarPage | null> {
    try {
      return await GoogleService.readCalendarPage(input);
    } catch (error) {
      if (hasStatus(error, HTTP_UNAUTHORIZED)) {
        return null;
      }
      throw error;
    }
  }

  private static async readCalendarPage(
    input: IGoogleCalendarReadInput,
  ): Promise<IGoogleCalendarPage> {
    try {
      return await GoogleService.requestCalendarPage(input);
    } catch (error) {
      if (!(input.syncToken && hasStatus(error, HTTP_GONE))) {
        throw error;
      }
      return GoogleService.requestCalendarPage({ ...input, syncToken: null, pageToken: null });
    }
  }

  private static async requestCalendarPage(
    input: IGoogleCalendarReadInput,
  ): Promise<IGoogleCalendarPage> {
    const client = GoogleService.createClient();
    client.setCredentials({ access_token: input.accessToken });
    const { data } = await calendar({
      version: GOOGLE_CALENDAR_API_VERSION,
      auth: client,
    }).events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      maxResults: GOOGLE_CALENDAR_PAGE_SIZE,
      singleEvents: true,
      pageToken: input.pageToken ?? undefined,
      ...calendarRange(input),
    });
    return {
      events: data.items ?? [],
      nextPageToken: data.nextPageToken ?? null,
      nextSyncToken: data.nextSyncToken ?? null,
      usedSyncToken: input.syncToken !== null,
      timeZone: data.timeZone ?? null,
    };
  }

  private static createClient(): OAuth2Client {
    return new OAuth2Client({
      clientId: ENV.auth.google.clientId,
      clientSecret: ENV.auth.google.clientSecret,
      transporterOptions: { timeout: GOOGLE_REQUEST_TIMEOUT_MS },
    });
  }

  private static hasOAuthError(error: unknown, code: EGoogleOAuthError): boolean {
    if (!(error instanceof gaxios.GaxiosError)) {
      return false;
    }
    const { error: oauthError } = toStringRecord(error.response?.data) ?? {};
    return oauthError === code;
  }

  private static isInvalidTokenError(error: unknown): boolean {
    return GoogleService.hasOAuthError(error, EGoogleOAuthError.INVALID_TOKEN);
  }

  private static async verifyProfile(idToken: string): Promise<IGoogleProfile> {
    const ticket = await GoogleService.client.verifyIdToken({
      idToken,
      audience: ENV.auth.google.clientId,
    });
    return toGoogleProfile(ticket.getPayload());
  }
}
