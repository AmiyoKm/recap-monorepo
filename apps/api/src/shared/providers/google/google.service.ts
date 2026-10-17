import { calendar } from "@googleapis/calendar";
import { chat } from "@googleapis/chat";
import { gmail } from "@googleapis/gmail";
import { CodeChallengeMethod, gaxios, OAuth2Client } from "google-auth-library";

import { ENV } from "#api/shared/env/env.constants";
import { toStringRecord } from "#api/shared/json/json.helpers";
import {
  GOOGLE_CALENDAR_API_VERSION,
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_PAGE_SIZE,
  GOOGLE_CHAT_API_VERSION,
  GOOGLE_CHAT_MESSAGES_PAGE_SIZE,
  GOOGLE_CHAT_SPACES_PAGE_SIZE,
  GOOGLE_GMAIL_API_VERSION,
  GOOGLE_GMAIL_PAGE_SIZE,
  GOOGLE_GMAIL_USER_ID,
  GOOGLE_REQUEST_TIMEOUT_MS,
  HTTP_FORBIDDEN,
  HTTP_GONE,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from "#api/shared/providers/google/google.constants";
import {
  EGmailFormat,
  EGmailHeader,
  EGmailHistoryType,
  EGoogleMessages,
  EGoogleOAuthError,
  EGoogleOAuthValue,
} from "#api/shared/providers/google/google.enums";
import {
  calendarRange,
  chatMessageFilter,
  hasStatus,
  historyMessageIds,
  toChatSpaces,
  toGoogleProfile,
  toGoogleTokens,
} from "#api/shared/providers/google/google.helpers";
import type {
  IGoogleAuthorization,
  IGoogleAuthorizeInput,
  IGoogleCalendarPage,
  IGoogleCalendarReadInput,
  IGoogleChatMessagesInput,
  IGoogleChatMessagesPage,
  IGoogleChatSpace,
  IGoogleCodeExchangeInput,
  IGoogleGmailHistoryInput,
  IGoogleGmailListInput,
  IGoogleGmailPage,
  IGoogleGrant,
  IGoogleProfile,
} from "#api/shared/providers/google/google.interfaces";
import type { TGoogleGmailMessage } from "#api/shared/providers/google/google.types";
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

  static async listChatSpaces(accessToken: string): Promise<IGoogleChatSpace[] | null> {
    try {
      const { data } = await GoogleService.createChatApi(accessToken).spaces.list({
        pageSize: GOOGLE_CHAT_SPACES_PAGE_SIZE,
      });
      return toChatSpaces(data.spaces ?? []);
    } catch (error) {
      if (hasStatus(error, HTTP_UNAUTHORIZED)) {
        return null;
      }
      throw error;
    }
  }

  static async listChatMessages(
    input: IGoogleChatMessagesInput,
  ): Promise<IGoogleChatMessagesPage | null> {
    try {
      const { data } = await GoogleService.createChatApi(input.accessToken).spaces.messages.list({
        parent: input.spaceId,
        filter: chatMessageFilter(input.since),
        pageSize: GOOGLE_CHAT_MESSAGES_PAGE_SIZE,
        pageToken: input.pageToken ?? undefined,
      });
      return { messages: data.messages ?? [], nextPageToken: data.nextPageToken ?? null };
    } catch (error) {
      if (hasStatus(error, HTTP_UNAUTHORIZED)) {
        return null;
      }
      if (hasStatus(error, HTTP_FORBIDDEN) || hasStatus(error, HTTP_NOT_FOUND)) {
        return { messages: [], nextPageToken: null };
      }
      throw error;
    }
  }

  private static createChatApi(accessToken: string) {
    const client = GoogleService.createClient();
    client.setCredentials({ access_token: accessToken });
    return chat({ version: GOOGLE_CHAT_API_VERSION, auth: client });
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

  static async listGmailMessages(input: IGoogleGmailListInput): Promise<IGoogleGmailPage | null> {
    try {
      return await GoogleService.requestGmailList(input);
    } catch (error) {
      if (hasStatus(error, HTTP_UNAUTHORIZED)) {
        return null;
      }
      throw error;
    }
  }

  static async listGmailHistory(input: IGoogleGmailHistoryInput): Promise<IGoogleGmailPage | null> {
    try {
      return await GoogleService.requestGmailHistory(input);
    } catch (error) {
      if (hasStatus(error, HTTP_UNAUTHORIZED)) {
        return null;
      }
      if (hasStatus(error, HTTP_NOT_FOUND)) {
        return { messages: [], nextPageToken: null, historyId: null, isHistoryExpired: true };
      }
      throw error;
    }
  }

  private static createGmail(accessToken: string) {
    const client = GoogleService.createClient();
    client.setCredentials({ access_token: accessToken });
    return gmail({ version: GOOGLE_GMAIL_API_VERSION, auth: client });
  }

  private static async requestGmailList(input: IGoogleGmailListInput): Promise<IGoogleGmailPage> {
    const historyId = await GoogleService.readGmailBaseline(input);
    const api = GoogleService.createGmail(input.accessToken);
    const { data } = await api.users.messages.list({
      userId: GOOGLE_GMAIL_USER_ID,
      labelIds: [input.label],
      maxResults: GOOGLE_GMAIL_PAGE_SIZE,
      pageToken: input.pageToken ?? undefined,
    });
    const ids = (data.messages ?? []).map((message) => message.id);
    return {
      messages: await GoogleService.readGmailMessages(input.accessToken, ids),
      nextPageToken: data.nextPageToken ?? null,
      historyId,
      isHistoryExpired: false,
    };
  }

  private static async readGmailBaseline(input: IGoogleGmailListInput): Promise<string | null> {
    if (input.pageToken) {
      return null;
    }
    const api = GoogleService.createGmail(input.accessToken);
    const { data } = await api.users.getProfile({ userId: GOOGLE_GMAIL_USER_ID });
    return data.historyId ?? null;
  }

  private static async requestGmailHistory(
    input: IGoogleGmailHistoryInput,
  ): Promise<IGoogleGmailPage> {
    const api = GoogleService.createGmail(input.accessToken);
    const { data } = await api.users.history.list({
      userId: GOOGLE_GMAIL_USER_ID,
      startHistoryId: input.startHistoryId,
      historyTypes: [EGmailHistoryType.MESSAGE_ADDED],
      maxResults: GOOGLE_GMAIL_PAGE_SIZE,
      pageToken: input.pageToken ?? undefined,
    });
    return {
      messages: await GoogleService.readGmailMessages(
        input.accessToken,
        historyMessageIds(data.history ?? []),
      ),
      nextPageToken: data.nextPageToken ?? null,
      historyId: data.historyId ?? null,
      isHistoryExpired: false,
    };
  }

  private static async readGmailMessages(
    accessToken: string,
    ids: (string | null | undefined)[],
  ): Promise<TGoogleGmailMessage[]> {
    const api = GoogleService.createGmail(accessToken);
    const messages = await Promise.all(
      ids
        .filter((id) => typeof id === "string")
        .map((id) => GoogleService.readGmailMessage(api, id)),
    );
    return messages.filter((message) => message !== null);
  }

  private static async readGmailMessage(
    api: ReturnType<typeof gmail>,
    id: string,
  ): Promise<TGoogleGmailMessage | null> {
    try {
      const { data } = await api.users.messages.get({
        userId: GOOGLE_GMAIL_USER_ID,
        id,
        format: EGmailFormat.METADATA,
        metadataHeaders: Object.values(EGmailHeader),
      });
      return data;
    } catch (error) {
      if (hasStatus(error, HTTP_NOT_FOUND)) {
        return null;
      }
      throw error;
    }
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
