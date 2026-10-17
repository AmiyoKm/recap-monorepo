import { describe, expect, test } from "bun:test";

import { dayjs } from "#api/shared/date/date.helpers";
import { EGoogleMessages, EGoogleSource } from "#api/shared/providers/google/google.enums";
import {
  calendarRange,
  chatMessageFilter,
  deniedSources,
  driveActivityFilter,
  grantedSources,
  hasStatus,
  historyMessageIds,
  sourceScopes,
  toChatSpaces,
  toGoogleProfile,
  toGoogleTokens,
} from "#api/shared/providers/google/google.helpers";

const HTTP_GONE = 410;
const ONE_HOUR_IN_SECONDS = 3600;
const CLOCK_SLACK_SECONDS = 5;
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.activity.readonly";
const CHAT_SPACES_SCOPE = "https://www.googleapis.com/auth/chat.spaces.readonly";
const CHAT_MESSAGES_SCOPE = "https://www.googleapis.com/auth/chat.messages.readonly";

describe("toGoogleProfile", () => {
  test("maps the id token payload", () => {
    expect(
      toGoogleProfile({
        sub: "sub-1",
        email: "work@employer.example",
        name: "Work User",
        picture: "https://img.test/a.png",
        iss: "accounts.google.com",
        aud: "client",
        iat: 0,
        exp: 0,
      }),
    ).toEqual({
      sub: "sub-1",
      email: "work@employer.example",
      name: "Work User",
      picture: "https://img.test/a.png",
    });
  });

  test("throws without a subject or email", () => {
    expect(() => toGoogleProfile(undefined)).toThrow(EGoogleMessages.INVALID_PROFILE);
    expect(() =>
      toGoogleProfile({ sub: "sub-1", iss: "accounts.google.com", aud: "client", iat: 0, exp: 0 }),
    ).toThrow(EGoogleMessages.INVALID_PROFILE);
  });
});

describe("toGoogleTokens", () => {
  test("computes the seconds left until expiry", () => {
    const tokens = toGoogleTokens("access", {
      refresh_token: "refresh",
      expiry_date: dayjs().add(ONE_HOUR_IN_SECONDS, "second").valueOf(),
    });
    expect(tokens.accessToken).toBe("access");
    expect(tokens.refreshToken).toBe("refresh");
    expect(tokens.expiresInSeconds).toBeGreaterThan(ONE_HOUR_IN_SECONDS - CLOCK_SLACK_SECONDS);
  });

  test("leaves refresh token and expiry undefined when google omits them", () => {
    expect(toGoogleTokens("access", { refresh_token: null })).toEqual({
      accessToken: "access",
      refreshToken: undefined,
      expiresInSeconds: undefined,
      scopes: [],
    });
  });

  test("splits the granted scopes", () => {
    expect(toGoogleTokens("access", { scope: "openid email" }).scopes).toEqual(["openid", "email"]);
  });
});

describe("sourceScopes", () => {
  test.each([
    { sources: [EGoogleSource.CALENDAR], scopes: [CALENDAR_SCOPE] },
    { sources: [EGoogleSource.GMAIL], scopes: [GMAIL_SCOPE] },
    { sources: [EGoogleSource.DRIVE], scopes: [DRIVE_SCOPE] },
    { sources: [EGoogleSource.CHAT], scopes: [CHAT_SPACES_SCOPE, CHAT_MESSAGES_SCOPE] },
    {
      sources: [EGoogleSource.GMAIL, EGoogleSource.CHAT],
      scopes: [GMAIL_SCOPE, CHAT_SPACES_SCOPE, CHAT_MESSAGES_SCOPE],
    },
  ])("maps $sources to their scopes", ({ sources, scopes }) => {
    expect(sourceScopes([...sources])).toEqual([...scopes]);
  });
});

describe("grantedSources", () => {
  test.each([
    { name: "no source", scopes: ["openid", "email"], sources: [] },
    {
      name: "a partial grant",
      scopes: ["openid", "email", CALENDAR_SCOPE, DRIVE_SCOPE],
      sources: [EGoogleSource.CALENDAR, EGoogleSource.DRIVE],
    },
    {
      name: "every source",
      scopes: [CALENDAR_SCOPE, GMAIL_SCOPE, DRIVE_SCOPE, CHAT_SPACES_SCOPE, CHAT_MESSAGES_SCOPE],
      sources: [
        EGoogleSource.CALENDAR,
        EGoogleSource.GMAIL,
        EGoogleSource.DRIVE,
        EGoogleSource.CHAT,
      ],
    },
    {
      name: "a source with only some of its scopes",
      scopes: [GMAIL_SCOPE, CHAT_SPACES_SCOPE],
      sources: [EGoogleSource.GMAIL],
    },
  ])("reads $name from the granted scopes", ({ scopes, sources }) => {
    expect(grantedSources([...scopes])).toEqual([...sources]);
  });
});

describe("deniedSources", () => {
  test.each([
    {
      requested: [EGoogleSource.CALENDAR, EGoogleSource.GMAIL],
      granted: [EGoogleSource.CALENDAR, EGoogleSource.GMAIL],
      denied: [],
    },
    {
      requested: [EGoogleSource.CALENDAR, EGoogleSource.GMAIL, EGoogleSource.CHAT],
      granted: [EGoogleSource.GMAIL],
      denied: [EGoogleSource.CALENDAR, EGoogleSource.CHAT],
    },
  ])("lists $denied when $granted of $requested were granted", ({ requested, granted, denied }) => {
    expect(deniedSources({ requested: [...requested], granted: [...granted] })).toEqual([
      ...denied,
    ]);
  });
});

describe("calendarRange", () => {
  const input = {
    accessToken: "a",
    pageToken: null,
    timeMin: "2026-10-10T00:00:00.000Z",
    timeMax: "2026-11-10T00:00:00.000Z",
  };

  test("sends only the sync token when there is one", () => {
    expect(calendarRange({ ...input, syncToken: "sync-0" })).toEqual({ syncToken: "sync-0" });
  });

  test("sends the time window without a sync token", () => {
    expect(calendarRange({ ...input, syncToken: null })).toEqual({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
    });
  });
});

describe("hasStatus", () => {
  test("rejects a plain error", () => {
    expect(hasStatus(new Error("x"), HTTP_GONE)).toBe(false);
  });
});

describe("historyMessageIds", () => {
  test("returns each added message id once and skips records without one", () => {
    const history = [
      { messagesAdded: [{ message: { id: "m1" } }, { message: {} }] },
      { messagesAdded: [{ message: { id: "m1" } }, { message: { id: "m2" } }] },
      { labelsAdded: [] },
    ];

    expect(historyMessageIds(history)).toEqual(["m1", "m2"]);
    expect(historyMessageIds([])).toEqual([]);
  });
});

describe("toChatSpaces", () => {
  test("drops nameless spaces, flags DMs and sorts by id", () => {
    expect(
      toChatSpaces([
        { name: "spaces/B", spaceType: "SPACE" },
        { spaceType: "SPACE" },
        { name: "spaces/A", spaceType: "DIRECT_MESSAGE" },
      ]),
    ).toEqual([
      { id: "spaces/A", isDirectMessage: true },
      { id: "spaces/B", isDirectMessage: false },
    ]);
  });
});

describe("chatMessageFilter", () => {
  test("filters messages created after the time", () => {
    expect(chatMessageFilter("2026-10-10T00:00:00.000Z")).toBe(
      'createTime > "2026-10-10T00:00:00.000Z"',
    );
  });
});

describe("driveActivityFilter", () => {
  test("filters by time and the create, edit and comment actions", () => {
    expect(driveActivityFilter("2026-10-10T00:00:00.000Z")).toBe(
      'time >= "2026-10-10T00:00:00.000Z" AND detail.action_detail_case:(CREATE EDIT COMMENT)',
    );
  });
});
