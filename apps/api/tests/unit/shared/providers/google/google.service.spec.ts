import { afterAll, afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { gaxios, OAuth2Client } from "google-auth-library";

import { dayjs } from "#api/shared/date/date.helpers";
import { ENV } from "#api/shared/env/env.constants";
import { EGmailLabel, EGoogleMessages } from "#api/shared/providers/google/google.enums";
import { GoogleService } from "#api/shared/providers/google/google.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_GONE,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from "#api-tests/unit/shared/providers/providers.constants";

const MIN_EXPECTED_LIFETIME_SECONDS = 3000;

const REVOKE_URL = new URL("https://oauth2.googleapis.com/revoke");

const REVOKE_CONFIG = { url: REVOKE_URL, headers: new Headers() };

async function revokeResponse<TData extends object>(status: number, data: TData) {
  const response = new Response(JSON.stringify(data), { status });
  await response.text();
  return Object.assign(response, { config: REVOKE_CONFIG, data });
}

async function revokeError(
  status?: number,
  oauthError = "invalid_token",
): Promise<InstanceType<typeof gaxios.GaxiosError>> {
  if (status === undefined) {
    return new gaxios.GaxiosError("network down", REVOKE_CONFIG);
  }
  const response = await revokeResponse(status, { error: oauthError });
  return new gaxios.GaxiosError("revoke failed", REVOKE_CONFIG, response);
}

afterEach(() => {
  mock.restore();
});

describe("GoogleService.createAuthorization", () => {
  test("builds a consent url with pkce and offline access", async () => {
    const { authorizeUrl, codeVerifier } = await GoogleService.createAuthorization({
      state: "state-1",
      redirectUri: "http://localhost:3107/callback",
      scopes: ["openid", "email"],
    });
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("client_id")).toBe(ENV.auth.google.clientId);
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")?.length).toBeGreaterThan(0);
    expect(codeVerifier.length).toBeGreaterThan(0);
  });
});

describe("GoogleService.exchangeCode", () => {
  test("rejects a token response without an id token", async () => {
    spyOn(OAuth2Client.prototype, "getToken").mockImplementation(() =>
      Promise.resolve({ tokens: { access_token: "access" }, res: null }),
    );
    const exchange = GoogleService.exchangeCode({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: "http://localhost:3107/callback",
    });
    await expect(exchange).rejects.toThrow(EGoogleMessages.ID_TOKEN_MISSING);
  });
});

describe("GoogleService.revokeToken", () => {
  test("revokes the refresh token at google", async () => {
    const revoke = spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(() =>
      revokeResponse(HTTP_OK, { success: true }),
    );
    await GoogleService.revokeToken("refresh-1");
    expect(revoke).toHaveBeenCalledWith("refresh-1");
  });

  test("resolves when google rejects the token as invalid or revoked", async () => {
    spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(async () => {
      throw await revokeError(HTTP_BAD_REQUEST);
    });
    await expect(GoogleService.revokeToken("refresh-1")).resolves.toBeUndefined();
  });

  test.each([
    { name: "a server failure", status: HTTP_SERVER_ERROR, oauthError: "server_error" },
    { name: "a bad request", status: HTTP_BAD_REQUEST, oauthError: "invalid_request" },
    { name: "a network failure", status: undefined, oauthError: undefined },
  ])("throws on $name", async ({ status, oauthError }) => {
    spyOn(OAuth2Client.prototype, "revokeToken").mockImplementation(async () => {
      throw await revokeError(status, oauthError);
    });
    await expect(GoogleService.revokeToken("refresh-1")).rejects.toThrow();
  });
});

describe("GoogleService.refreshAccessToken", () => {
  test("returns the new access token with its lifetime", async () => {
    spyOn(OAuth2Client.prototype, "refreshAccessToken").mockImplementation(() =>
      Promise.resolve({
        credentials: { access_token: "new-access", expiry_date: dayjs().add(1, "hour").valueOf() },
        res: null,
      }),
    );

    const tokens = await GoogleService.refreshAccessToken("refresh-1");

    expect(tokens?.accessToken).toBe("new-access");
    expect(tokens?.expiresInSeconds).toBeGreaterThan(MIN_EXPECTED_LIFETIME_SECONDS);
  });

  test("returns null when google rejects the refresh token", async () => {
    spyOn(OAuth2Client.prototype, "refreshAccessToken").mockImplementation(async () => {
      throw await revokeError(HTTP_BAD_REQUEST, "invalid_grant");
    });

    expect(await GoogleService.refreshAccessToken("refresh-1")).toBeNull();
  });

  test("throws on other failures", async () => {
    spyOn(OAuth2Client.prototype, "refreshAccessToken").mockImplementation(async () => {
      throw await revokeError(HTTP_SERVER_ERROR, "server_error");
    });

    await expect(GoogleService.refreshAccessToken("refresh-1")).rejects.toThrow();
  });
});

const originalCalendar = { ...(await import("@googleapis/calendar")) };

describe("GoogleService.listCalendarEvents", () => {
  const input = {
    accessToken: "access-1",
    syncToken: null,
    pageToken: null,
    timeMin: "2026-10-10T00:00:00.000Z",
    timeMax: "2026-11-10T00:00:00.000Z",
  };

  const list = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();

  afterAll(() => {
    mock.module("@googleapis/calendar", () => originalCalendar);
  });

  beforeEach(() => {
    list.mockReset();
    mock.module("@googleapis/calendar", () => ({
      calendar: () => ({ events: { list } }),
    }));
  });

  test("returns the events with the next page and sync tokens", async () => {
    list.mockResolvedValue({ data: { items: [{ id: "e1" }], nextSyncToken: "sync-1" } });

    const page = await GoogleService.listCalendarEvents(input);

    expect(page).toEqual({
      events: [{ id: "e1" }],
      nextPageToken: null,
      nextSyncToken: "sync-1",
      usedSyncToken: false,
      timeZone: null,
    });
    expect(list.mock.calls[0]?.[0]).toMatchObject({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      singleEvents: true,
    });
  });

  test("sends only the sync token when it has one", async () => {
    list.mockResolvedValue({ data: { items: [] } });

    await GoogleService.listCalendarEvents({ ...input, syncToken: "sync-0" });

    const params = list.mock.calls[0]?.[0];
    expect(params?.["syncToken"]).toBe("sync-0");
    expect(params).not.toHaveProperty("timeMin");
  });

  test("starts a full sync again when the sync token is gone", async () => {
    list.mockImplementationOnce(async () => {
      throw await revokeError(HTTP_GONE, "gone");
    });
    list.mockResolvedValueOnce({ data: { items: [], nextSyncToken: "sync-new" } });

    const page = await GoogleService.listCalendarEvents({ ...input, syncToken: "sync-0" });

    expect(page?.nextSyncToken).toBe("sync-new");
    expect(page?.usedSyncToken).toBe(false);
    expect(list.mock.calls[1]?.[0]).toMatchObject({ timeMin: input.timeMin });
  });

  test("returns null when google rejects the access token", async () => {
    list.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });

    expect(await GoogleService.listCalendarEvents(input)).toBeNull();
  });

  test("throws on other failures", async () => {
    list.mockImplementation(async () => {
      throw await revokeError(HTTP_SERVER_ERROR, "server_error");
    });

    await expect(GoogleService.listCalendarEvents(input)).rejects.toThrow();
  });
});

const originalGmail = { ...(await import("@googleapis/gmail")) };

describe("GoogleService Gmail reads", () => {
  const messagesList = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();
  const messagesGet = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();
  const historyList = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();
  const getProfile = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();

  afterAll(() => {
    mock.module("@googleapis/gmail", () => originalGmail);
  });

  beforeEach(() => {
    for (const fn of [messagesList, messagesGet, historyList, getProfile]) {
      fn.mockReset();
    }
    mock.module("@googleapis/gmail", () => ({
      gmail: () => ({
        users: {
          getProfile,
          messages: { list: messagesList, get: messagesGet },
          history: { list: historyList },
        },
      }),
    }));
  });

  test("lists one label, reads metadata only and returns the baseline history id", async () => {
    getProfile.mockResolvedValue({ data: { historyId: "h-1" } });
    messagesList.mockResolvedValue({
      data: { messages: [{ id: "m1" }], nextPageToken: "next" },
    });
    messagesGet.mockResolvedValue({ data: { id: "m1" } });

    const page = await GoogleService.listGmailMessages({
      accessToken: "access-1",
      label: EGmailLabel.SENT,
      pageToken: null,
    });

    expect(page).toEqual({
      messages: [{ id: "m1" }],
      nextPageToken: "next",
      historyId: "h-1",
      isHistoryExpired: false,
    });
    const listParams = messagesList.mock.calls[0]?.[0];
    expect(listParams?.["labelIds"]).toEqual(["SENT"]);
    expect(listParams).not.toHaveProperty("q");
    expect(messagesGet.mock.calls[0]?.[0]["format"]).toBe("metadata");
  });

  test("skips the profile call on a later page", async () => {
    messagesList.mockResolvedValue({ data: {} });

    const page = await GoogleService.listGmailMessages({
      accessToken: "access-1",
      label: EGmailLabel.INBOX,
      pageToken: "p2",
    });

    expect(getProfile).not.toHaveBeenCalled();
    expect(page?.historyId).toBeNull();
  });

  test("reads each added message once from the history list", async () => {
    historyList.mockResolvedValue({
      data: {
        historyId: "h-9",
        history: [
          { messagesAdded: [{ message: { id: "m1" } }] },
          { messagesAdded: [{ message: { id: "m1" } }, { message: { id: "m2" } }] },
        ],
      },
    });
    messagesGet.mockImplementation(async (params) => ({ data: { id: params["id"] } }));

    const page = await GoogleService.listGmailHistory({
      accessToken: "access-1",
      startHistoryId: "h-1",
      pageToken: null,
    });

    expect(page?.messages).toEqual([{ id: "m1" }, { id: "m2" }]);
    expect(page?.historyId).toBe("h-9");
    expect(historyList.mock.calls[0]?.[0]["historyTypes"]).toEqual(["messageAdded"]);
  });

  test("marks the history id as expired on a 404", async () => {
    historyList.mockImplementation(async () => {
      throw await revokeError(HTTP_NOT_FOUND, "notFound");
    });

    const page = await GoogleService.listGmailHistory({
      accessToken: "access-1",
      startHistoryId: "h-1",
      pageToken: null,
    });

    expect(page?.isHistoryExpired).toBe(true);
  });

  test("skips a message that was deleted before it was read", async () => {
    getProfile.mockResolvedValue({ data: {} });
    messagesList.mockResolvedValue({ data: { messages: [{ id: "gone" }] } });
    messagesGet.mockImplementation(async () => {
      throw await revokeError(HTTP_NOT_FOUND, "notFound");
    });

    const page = await GoogleService.listGmailMessages({
      accessToken: "access-1",
      label: EGmailLabel.SENT,
      pageToken: null,
    });

    expect(page?.messages).toEqual([]);
  });

  test("returns null when google rejects the access token", async () => {
    getProfile.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });

    historyList.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });
    const list = await GoogleService.listGmailMessages({
      accessToken: "access-1",
      label: EGmailLabel.SENT,
      pageToken: null,
    });
    const history = await GoogleService.listGmailHistory({
      accessToken: "access-1",
      startHistoryId: "h-1",
      pageToken: null,
    });

    expect(list).toBeNull();
    expect(history).toBeNull();
  });

  test("throws on other failures", async () => {
    getProfile.mockImplementation(async () => {
      throw await revokeError(HTTP_SERVER_ERROR, "server_error");
    });

    await expect(
      GoogleService.listGmailMessages({
        accessToken: "access-1",
        label: EGmailLabel.SENT,
        pageToken: null,
      }),
    ).rejects.toThrow();
  });
});

const originalChat = { ...(await import("@googleapis/chat")) };

describe("GoogleService chat reads", () => {
  const listSpaces = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();
  const listMessages = mock<(params: Record<string, unknown>) => Promise<{ data: object }>>();

  afterAll(() => {
    mock.module("@googleapis/chat", () => originalChat);
  });

  beforeEach(() => {
    listSpaces.mockReset();
    listMessages.mockReset();
    mock.module("@googleapis/chat", () => ({
      chat: () => ({ spaces: { list: listSpaces, messages: { list: listMessages } } }),
    }));
  });

  test("lists the spaces sorted by name and flags the DMs", async () => {
    listSpaces.mockResolvedValue({
      data: {
        spaces: [
          { name: "spaces/BBB", spaceType: "SPACE" },
          { name: "spaces/AAA", spaceType: "DIRECT_MESSAGE" },
          { spaceType: "SPACE" },
        ],
      },
    });

    const page = await GoogleService.listChatSpaces({ accessToken: "access-1", pageToken: null });

    expect(page).toEqual({
      spaces: [
        { id: "spaces/AAA", isDirectMessage: true },
        { id: "spaces/BBB", isDirectMessage: false },
      ],
      nextPageToken: null,
    });
  });

  test("passes the spaces page token and returns the next one", async () => {
    listSpaces.mockResolvedValue({
      data: { spaces: [{ name: "spaces/CCC", spaceType: "SPACE" }], nextPageToken: "spaces-3" },
    });

    const page = await GoogleService.listChatSpaces({
      accessToken: "access-1",
      pageToken: "spaces-2",
    });

    expect(page?.nextPageToken).toBe("spaces-3");
    expect(listSpaces.mock.calls[0]?.[0]).toMatchObject({ pageToken: "spaces-2" });
  });

  test.each([HTTP_FORBIDDEN, HTTP_NOT_FOUND])(
    "returns an empty page when the account has no Chat (%d)",
    async (status) => {
      listSpaces.mockImplementation(async () => {
        throw await revokeError(status, "no chat");
      });

      const page = await GoogleService.listChatSpaces({ accessToken: "access-1", pageToken: null });

      expect(page).toEqual({ spaces: [], nextPageToken: null });
    },
  );

  test("lists the messages created after the time in one space", async () => {
    listMessages.mockResolvedValue({
      data: { messages: [{ name: "spaces/AAA/messages/M1" }], nextPageToken: "next" },
    });

    const page = await GoogleService.listChatMessages({
      accessToken: "access-1",
      spaceId: "spaces/AAA",
      since: "2026-10-10T00:00:00.000Z",
      pageToken: "page-1",
    });

    expect(page).toEqual({ messages: [{ name: "spaces/AAA/messages/M1" }], nextPageToken: "next" });
    expect(listMessages.mock.calls[0]?.[0]).toMatchObject({
      parent: "spaces/AAA",
      filter: 'createTime > "2026-10-10T00:00:00.000Z"',
      pageToken: "page-1",
    });
  });

  test("returns null when google rejects the access token", async () => {
    listSpaces.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });
    listMessages.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });

    expect(
      await GoogleService.listChatSpaces({ accessToken: "access-1", pageToken: null }),
    ).toBeNull();
    expect(
      await GoogleService.listChatMessages({
        accessToken: "access-1",
        spaceId: "spaces/AAA",
        since: "2026-10-10T00:00:00.000Z",
        pageToken: null,
      }),
    ).toBeNull();
  });

  test.each([HTTP_FORBIDDEN, HTTP_NOT_FOUND])("skips a space that answers %d", async (status) => {
    listMessages.mockImplementation(async () => {
      throw await revokeError(status, "denied");
    });

    const page = await GoogleService.listChatMessages({
      accessToken: "access-1",
      spaceId: "spaces/AAA",
      since: "2026-10-10T00:00:00.000Z",
      pageToken: null,
    });

    expect(page).toEqual({ messages: [], nextPageToken: null });
  });

  test("throws on other failures", async () => {
    listSpaces.mockImplementation(async () => {
      throw await revokeError(HTTP_SERVER_ERROR, "server_error");
    });

    await expect(
      GoogleService.listChatSpaces({ accessToken: "access-1", pageToken: null }),
    ).rejects.toThrow();
  });
});

const originalDriveActivity = { ...(await import("@googleapis/driveactivity")) };

describe("GoogleService.listDriveActivity", () => {
  const input = {
    accessToken: "access-1",
    timeMin: "2026-10-10T00:00:00.000Z",
    pageToken: null,
  };

  const query =
    mock<(params: { requestBody: Record<string, unknown> }) => Promise<{ data: object }>>();

  afterAll(() => {
    mock.module("@googleapis/driveactivity", () => originalDriveActivity);
  });

  beforeEach(() => {
    query.mockReset();
    mock.module("@googleapis/driveactivity", () => ({
      driveactivity: () => ({ activity: { query } }),
    }));
  });

  test("returns the activities and the next page token", async () => {
    query.mockResolvedValue({ data: { activities: [{ timestamp: "t1" }], nextPageToken: "next" } });

    const page = await GoogleService.listDriveActivity(input);

    expect(page).toEqual({ activities: [{ timestamp: "t1" }], nextPageToken: "next" });
  });

  test("asks for unconsolidated create, edit and comment actions since the time", async () => {
    query.mockResolvedValue({ data: {} });

    const page = await GoogleService.listDriveActivity({ ...input, pageToken: "page-2" });

    expect(page).toEqual({ activities: [], nextPageToken: null });
    const body = query.mock.calls[0]?.[0].requestBody;
    expect(body?.["filter"]).toBe(
      `time >= "${input.timeMin}" AND detail.action_detail_case:(CREATE EDIT COMMENT)`,
    );
    expect(body?.["consolidationStrategy"]).toEqual({ none: {} });
    expect(body?.["pageToken"]).toBe("page-2");
  });

  test("returns null when google rejects the access token", async () => {
    query.mockImplementation(async () => {
      throw await revokeError(HTTP_UNAUTHORIZED, "unauthorized");
    });

    expect(await GoogleService.listDriveActivity(input)).toBeNull();
  });

  test("throws on other failures", async () => {
    query.mockImplementation(async () => {
      throw await revokeError(HTTP_SERVER_ERROR, "server_error");
    });

    await expect(GoogleService.listDriveActivity(input)).rejects.toThrow();
  });
});
