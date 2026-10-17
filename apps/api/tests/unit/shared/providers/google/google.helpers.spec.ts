import { describe, expect, test } from "bun:test";

import { dayjs } from "#api/shared/date/date.helpers";
import { EGoogleMessages, EGoogleSource } from "#api/shared/providers/google/google.enums";
import {
  deniedSources,
  grantedSources,
  sourceScopes,
  toGoogleProfile,
  toGoogleTokens,
} from "#api/shared/providers/google/google.helpers";

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
    expect(deniedSources([...requested], [...granted])).toEqual([...denied]);
  });
});
