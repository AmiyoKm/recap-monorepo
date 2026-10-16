import { afterAll, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { treaty } from "@elysia/eden";
import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { createApp } from "#api/app";
import { EAuthMessages } from "#api/modules/auth/auth.enums";
import { PENDING_GRANT_TTL_SECONDS } from "#api/modules/identity/identity.constants";
import {
  EConnectionStatus,
  EGrantPurpose,
  EIdentityMessages,
} from "#api/modules/identity/identity.enums";
import { connectionTokenKey } from "#api/modules/identity/identity.helpers";
import type { TConnectConnectionBody } from "#api/modules/identity/identity.types";
import { auth } from "#api/shared/auth/auth.client";
import { cache } from "#api/shared/cache/cache.client";
import { CacheService } from "#api/shared/cache/cache.service";
import { decryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";
import type {
  IGoogleAuthorization,
  IGoogleAuthorizeInput,
  IGoogleCodeExchangeInput,
  IGoogleGrant,
  IGoogleProfile,
} from "#api/shared/providers/google/google.interfaces";
import { GoogleService } from "#api/shared/providers/google/google.service";
import type { IJiraCredentials } from "#api/shared/providers/jira/jira.interfaces";
import { JiraService } from "#api/shared/providers/jira/jira.service";
import { LinearService } from "#api/shared/providers/linear/linear.service";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";
import {
  CALENDAR_EMAIL,
  CALENDAR_GRANTED_SCOPES,
  CALENDAR_READ_SCOPE,
  DEFAULT_TOKEN_EXPIRY_SECONDS,
  GOOGLE_ACCESS_DENIED,
  GOOGLE_PROFILE,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_FOUND,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  INVALID_API_KEY,
  JIRA_ACCOUNT,
  JIRA_EMAIL,
  JIRA_SITE,
  LINEAR_ACCOUNT,
  TEST_PASSWORD,
  TEST_USER_NAME,
  VALID_JIRA_KEY,
  VALID_LINEAR_KEY,
} from "#api-tests/fixtures/fixtures.constants";
import { ETestMessages } from "#api-tests/fixtures/fixtures.enums";
import { uniqueEmail, wipeCache, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";
import type { ICalendarConnectCodes } from "#api-tests/integration/identity/identity.interfaces";

class FakeGoogleClient {
  readonly profiles = new Map<string, IGoogleProfile>();
  readonly refreshTokens = new Map<string, string | undefined>();
  readonly tokenExpiries = new Map<string, number | undefined>();
  readonly grantedScopes = new Map<string, string[]>();
  lastAuthorizeInput: IGoogleAuthorizeInput | undefined;
  lastCodeVerifier: string | undefined;

  createAuthorization(input: IGoogleAuthorizeInput): Promise<IGoogleAuthorization> {
    this.lastAuthorizeInput = input;
    return Promise.resolve({
      authorizeUrl: `https://consent.test/auth?state=${input.state}`,
      codeVerifier: `verifier-${input.state}`,
    });
  }

  exchangeCode(input: IGoogleCodeExchangeInput): Promise<IGoogleGrant> {
    const profile = this.profiles.get(input.code);
    if (!profile) {
      return Promise.reject(new Error(ETestMessages.UNKNOWN_TEST_CODE));
    }
    this.lastCodeVerifier = input.codeVerifier;
    const refreshToken = this.refreshTokens.has(input.code)
      ? this.refreshTokens.get(input.code)
      : `refresh-${input.code}`;
    const expiresInSeconds = this.tokenExpiries.has(input.code)
      ? this.tokenExpiries.get(input.code)
      : DEFAULT_TOKEN_EXPIRY_SECONDS;
    const scopes = this.grantedScopes.get(input.code) ?? [...CALENDAR_GRANTED_SCOPES];
    return Promise.resolve({
      tokens: { accessToken: input.code, refreshToken, expiresInSeconds, scopes },
      profile,
    });
  }
}

class FakeProviderClients {
  readonly google = new FakeGoogleClient();
  readonly apiKeys = new Map<string, IProviderAccount>();

  install(): void {
    spyOn(GoogleService, "createAuthorization").mockImplementation((input) =>
      this.google.createAuthorization(input),
    );
    spyOn(GoogleService, "exchangeCode").mockImplementation((input) =>
      this.google.exchangeCode(input),
    );
    spyOn(JiraService, "verifyApiKey").mockImplementation((credentials: IJiraCredentials) =>
      Promise.resolve(this.apiKeys.get(`jira:${credentials.apiToken}`) ?? null),
    );
    spyOn(LinearService, "verifyApiKey").mockImplementation((apiKey: string) =>
      Promise.resolve(this.apiKeys.get(`linear:${apiKey}`) ?? null),
    );
  }
}

const provider = new FakeProviderClients();
const api = treaty(createApp(), { parseDate: false });

function withCookie(cookie: string) {
  return { headers: { cookie } };
}

async function findPendingGrantRow(state: string) {
  const rows = await db
    .select()
    .from(schema.pendingGrant)
    .where(eq(schema.pendingGrant.state, state));
  return rows[0];
}

async function pendingGrantTtlSeconds(state: string): Promise<number> {
  const row = await findPendingGrantRow(state);
  if (!row) {
    throw new Error(ETestMessages.PENDING_GRANT_IS_MISSING);
  }
  return dayjs(row.expiresAt).diff(dayjs(), "second");
}

async function cachedTokenTtlSeconds(connectionId: string): Promise<number> {
  const { keys } = await cache.list({ prefix: connectionTokenKey(connectionId) });
  const expiration = keys[0]?.expiration;
  if (expiration === undefined) {
    throw new Error(ETestMessages.CACHED_TOKEN_IS_MISSING);
  }
  return expiration - dayjs().unix();
}

function connectedUrl(connected: string, email: string): string {
  return `${ENV.webOrigin}/connected?connected=${connected}&email=${encodeURIComponent(email)}`;
}

function errorUrl(error: string): string {
  return `${ENV.webOrigin}/connected?error=${error}`;
}

async function signUp(email: string) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: TEST_USER_NAME, email, password: TEST_PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  if (cookie.length === 0) {
    throw new Error(ETestMessages.SIGN_UP_SET_NO_SESSION_COOKIE);
  }
  return { cookie, userId: response.user.id };
}

function readState(authorizeUrl: string): string {
  const state = new URL(authorizeUrl).searchParams.get("state");
  if (!state) {
    throw new Error(ETestMessages.AUTHORIZE_URL_HAS_NO_STATE);
  }
  return state;
}

function readAuthorizeUrl(data: unknown): string {
  if (typeof data !== "object" || data === null || !("authorizeUrl" in data)) {
    throw new Error(ETestMessages.CONNECT_RESPONSE_HAS_NO_AUTHORIZE_URL);
  }
  const { authorizeUrl } = data;
  if (typeof authorizeUrl !== "string") {
    throw new Error(ETestMessages.AUTHORIZE_URL_IS_NOT_A_STRING);
  }
  return authorizeUrl;
}

function listIdentities(cookie: string) {
  return api.identities.get(withCookie(cookie));
}

function startIdentityConnect(cookie: string) {
  return api.identities.connect.post(undefined, withCookie(cookie));
}

async function startConnect(cookie: string): Promise<string> {
  const { data, status } = await startIdentityConnect(cookie);
  if (status !== HTTP_OK) {
    throw new Error(ETestMessages.IDENTITY_CONNECT_START_FAILED);
  }
  return readState(readAuthorizeUrl(data));
}

function completeCallback(code: string, state: string) {
  return api.api.connect.google.callback.get({ query: { code, state } });
}

function denyCallback(state: string) {
  return api.api.connect.google.callback.get({
    query: { error: GOOGLE_ACCESS_DENIED, state },
  });
}

function readLocation(result: { response: Response }): string {
  const location = result.response.headers.get("location");
  if (!location) {
    throw new Error(ETestMessages.CALLBACK_RESPONSE_HAS_NO_LOCATION);
  }
  return location;
}

function connect(cookie: string, identityId: string, body: TConnectConnectionBody) {
  return api.identities({ identityId }).connections.post(body, withCookie(cookie));
}

function startCalendarConnect(
  cookie: string,
  identityId: string,
  providerName: TConnectConnectionBody["provider"] = "google-calendar",
) {
  return connect(cookie, identityId, { provider: providerName });
}

async function startCalendarState(cookie: string, identityId: string): Promise<string> {
  const { data, status } = await startCalendarConnect(cookie, identityId);
  if (status !== HTTP_OK) {
    throw new Error(ETestMessages.CALENDAR_CONNECT_START_FAILED);
  }
  return readState(readAuthorizeUrl(data));
}

function deleteIdentity(cookie: string, identityId: string) {
  return api.identities({ identityId }).delete(undefined, withCookie(cookie));
}

function deleteConnection(cookie: string, connectionId: string) {
  return api.connections({ connectionId }).delete(undefined, withCookie(cookie));
}

async function readPendingGrant(state: string): Promise<unknown> {
  const row = await findPendingGrantRow(state);
  if (!row) {
    throw new Error(ETestMessages.PENDING_GRANT_IS_MISSING);
  }
  const grant: unknown = JSON.parse(row.payload);
  return grant;
}

async function readOnlyConnectionRow() {
  const rows = await db.select().from(schema.connection);
  if (rows.length !== 1) {
    throw new Error(ETestMessages.CONNECTION_TABLE_DOES_NOT_HOLD_EXACTLY_ONE_ROW);
  }
  const row = rows[0];
  if (!row) {
    throw new Error(ETestMessages.CONNECTION_ROW_IS_MISSING);
  }
  return row;
}

async function markNeedsReconnect(connectionId: string): Promise<void> {
  await db
    .update(schema.connection)
    .set({ status: EConnectionStatus.NEEDS_RECONNECT })
    .where(eq(schema.connection.id, connectionId));
}

async function createIdentity(cookie: string, code: string): Promise<string> {
  const state = await startConnect(cookie);
  const completed = await completeCallback(code, state);
  if (completed.status !== HTTP_FOUND) {
    throw new Error(ETestMessages.IDENTITY_CONNECT_CALLBACK_FAILED);
  }
  const { data } = await listIdentities(cookie);
  const first = data?.[0];
  if (!first) {
    throw new Error(ETestMessages.IDENTITY_LIST_IS_EMPTY_AFTER_CONNECT);
  }
  return first.id;
}

function setCalendarProfile(code: string, sub: string, email = CALENDAR_EMAIL): void {
  provider.google.profiles.set(code, { sub, email, name: "Work User", picture: undefined });
}

async function connectCalendar(
  cookie: string,
  { identityCode, identitySub, calendarCode }: ICalendarConnectCodes,
) {
  provider.google.profiles.set(identityCode, { ...GOOGLE_PROFILE, sub: identitySub });
  const identityId = await createIdentity(cookie, identityCode);
  const state = await startCalendarState(cookie, identityId);
  setCalendarProfile(calendarCode, identitySub);
  const completed = await completeCallback(calendarCode, state);
  if (readLocation(completed) !== connectedUrl("google-calendar", CALENDAR_EMAIL)) {
    throw new Error(ETestMessages.CALENDAR_CONNECT_CALLBACK_FAILED);
  }
  const row = await readOnlyConnectionRow();
  return { identityId, connectionId: row.id };
}

function seedApiKeys(): void {
  provider.apiKeys.set(`jira:${VALID_JIRA_KEY}`, JIRA_ACCOUNT);
  provider.apiKeys.set(`linear:${VALID_LINEAR_KEY}`, LINEAR_ACCOUNT);
}

function connectJira(cookie: string, identityId: string, apiKey: string) {
  return connect(cookie, identityId, {
    provider: "jira",
    apiKey,
    email: JIRA_EMAIL,
    site: JIRA_SITE,
  });
}

beforeAll(() => {
  provider.install();
});

beforeEach(async () => {
  await wipeDatabase();
  await wipeCache();
});

afterAll(() => {
  mock.restore();
});

describe("work identities", () => {
  test("rejects unauthenticated identity list", async () => {
    const { status, error } = await api.identities.get();
    expect(status).toBe(HTTP_UNAUTHORIZED);
    expect(error?.value).toEqual({ message: EAuthMessages.UNAUTHORIZED });
  });

  test("lists no identities for a new user", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { status, data } = await listIdentities(cookie);
    expect(status).toBe(HTTP_OK);
    expect(data).toEqual([]);
  });

  test("rejects unauthenticated connect start", async () => {
    const { status } = await api.identities.connect.post();
    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("starts identity connect with a pending grant and no identity row", async () => {
    const { cookie, userId } = await signUp(uniqueEmail());
    const { status, data } = await startIdentityConnect(cookie);
    expect(status).toBe(HTTP_OK);
    expect(provider.google.lastAuthorizeInput?.scopes).toEqual(["openid", "email"]);

    const state = readState(readAuthorizeUrl(data));
    expect(await readPendingGrant(state)).toEqual({
      userId,
      purpose: EGrantPurpose.IDENTITY_CREATE,
      codeVerifier: `verifier-${state}`,
    });
    const ttl = await pendingGrantTtlSeconds(state);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(PENDING_GRANT_TTL_SECONDS);

    expect(await db.select().from(schema.identity)).toEqual([]);
  });

  test("completes identity connect without a session and consumes the grant", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-1", GOOGLE_PROFILE);
    const state = await startConnect(cookie);

    const completed = await completeCallback("code-1", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(provider.google.lastCodeVerifier).toBe(`verifier-${state}`);
    expect(readLocation(completed)).toBe(connectedUrl("google", GOOGLE_PROFILE.email));
    expect(await findPendingGrantRow(state)).toBeUndefined();

    const { status, data } = await listIdentities(cookie);
    expect(status).toBe(HTTP_OK);
    expect(data).toEqual([
      {
        id: expect.any(String),
        email: GOOGLE_PROFILE.email,
        displayName: GOOGLE_PROFILE.name ?? null,
        avatarUrl: GOOGLE_PROFILE.picture ?? null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        connections: [],
      },
    ]);

    const replay = await completeCallback("code-1", state);
    expect(replay.status).toBe(HTTP_FOUND);
    expect(readLocation(replay)).toBe(errorUrl("expired"));
  });

  test("rejects a google account that is already one of my work identities", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-first", GOOGLE_PROFILE);
    provider.google.profiles.set("code-second", GOOGLE_PROFILE);

    const firstState = await startConnect(cookie);
    expect((await completeCallback("code-first", firstState)).status).toBe(HTTP_FOUND);

    const secondState = await startConnect(cookie);
    const second = await completeCallback("code-second", secondState);
    expect(second.status).toBe(HTTP_FOUND);
    expect(readLocation(second)).toBe(errorUrl("already_connected"));

    expect((await db.select().from(schema.identity)).length).toBe(1);
  });

  test("allows two users to anchor the same google account separately", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.google.profiles.set("code-shared-a", GOOGLE_PROFILE);
    provider.google.profiles.set("code-shared-b", GOOGLE_PROFILE);

    const firstState = await startConnect(first.cookie);
    expect(readLocation(await completeCallback("code-shared-a", firstState))).toContain(
      "connected=google",
    );

    const secondState = await startConnect(second.cookie);
    const completed = await completeCallback("code-shared-b", secondState);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toContain("connected=google");

    expect((await db.select().from(schema.identity)).length).toBe(2);
  });

  test("redirects a corrupt pending grant to failed", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-corrupt", GOOGLE_PROFILE);
    const state = await startConnect(cookie);
    await db
      .update(schema.pendingGrant)
      .set({ payload: "not-json{" })
      .where(eq(schema.pendingGrant.state, state));

    const completed = await completeCallback("code-corrupt", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("failed"));
  });

  test("rejects an unknown grant state", async () => {
    const completed = await completeCallback("code-1", "missing-state");
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("expired"));
  });

  test("redirects a cancelled consent to access denied and consumes the grant", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const state = await startConnect(cookie);

    const completed = await denyCallback(state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("access_denied"));
    expect(await findPendingGrantRow(state)).toBeUndefined();
    expect(await db.select().from(schema.identity)).toEqual([]);
  });

  test("redirects to an error when code exchange fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const state = await startConnect(cookie);

    const completed = await completeCallback("unknown-code", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("failed"));

    expect(await db.select().from(schema.identity)).toEqual([]);
  });

  test("rejects unauthenticated identity delete", async () => {
    const { status } = await api.identities({ identityId: "some-id" }).delete();
    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("deletes a work identity and reports a missing one", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-delete", { ...GOOGLE_PROFILE, sub: "google-sub-delete" });
    const identityId = await createIdentity(cookie, "code-delete");

    expect((await deleteIdentity(cookie, identityId)).status).toBe(HTTP_OK);
    expect(await db.select().from(schema.identity)).toEqual([]);

    expect((await deleteIdentity(cookie, identityId)).status).toBe(HTTP_NOT_FOUND);
  });

  test("refuses to delete another user's work identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.google.profiles.set("code-kept", { ...GOOGLE_PROFILE, sub: "google-sub-kept" });
    const identityId = await createIdentity(first.cookie, "code-kept");

    expect((await deleteIdentity(second.cookie, identityId)).status).toBe(HTTP_NOT_FOUND);
    expect((await db.select().from(schema.identity)).length).toBe(1);
  });

  test("rejects unauthenticated connection delete", async () => {
    const { status } = await api.connections({ connectionId: "some-id" }).delete();
    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("reports a missing connection on delete", async () => {
    const { cookie } = await signUp(uniqueEmail());
    expect((await deleteConnection(cookie, "missing-id")).status).toBe(HTTP_NOT_FOUND);
  });
});

describe("calendar connections", () => {
  test("rejects unauthenticated connection start", async () => {
    const { status } = await api
      .identities({ identityId: "some-id" })
      .connections.post({ provider: "google-calendar" });
    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("starts calendar connect with calendar scopes and a pending connection grant", async () => {
    const { cookie, userId } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-start", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-cal-start",
    });
    const identityId = await createIdentity(cookie, "code-cal-start");

    const { status, data } = await startCalendarConnect(cookie, identityId);
    expect(status).toBe(HTTP_OK);
    expect(provider.google.lastAuthorizeInput?.scopes).toContain(CALENDAR_READ_SCOPE);
    const state = readState(readAuthorizeUrl(data));
    expect(await readPendingGrant(state)).toEqual({
      userId,
      purpose: EGrantPurpose.CONNECTION,
      identityId,
      provider: "google-calendar",
      codeVerifier: `verifier-${state}`,
    });
    const ttl = await pendingGrantTtlSeconds(state);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(PENDING_GRANT_TTL_SECONDS);

    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("refuses connection start for another user's work identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-owned", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-cal-owned",
    });
    const identityId = await createIdentity(first.cookie, "code-cal-owned");

    const { status } = await startCalendarConnect(second.cookie, identityId);
    expect(status).toBe(HTTP_NOT_FOUND);
  });

  test("refuses connection start for an unwired provider", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-unwired", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-cal-unwired",
    });
    const identityId = await createIdentity(cookie, "code-cal-unwired");

    const { status } = await startCalendarConnect(cookie, identityId, "slack");
    expect(status).toBe(HTTP_BAD_REQUEST);
  });

  test("connects a calendar under the matching work identity", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-id", { ...GOOGLE_PROFILE, sub: "google-sub-cal-ok" });
    const identityId = await createIdentity(cookie, "code-cal-id");
    const state = await startCalendarState(cookie, identityId);

    setCalendarProfile("code-cal-ok", "google-sub-cal-ok");
    const completed = await completeCallback("code-cal-ok", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(connectedUrl("google-calendar", CALENDAR_EMAIL));

    const row = await readOnlyConnectionRow();
    expect(row.identityId).toBe(identityId);
    expect(row.provider).toBe("google-calendar");
    expect(row.authKind).toBe("oauth");
    expect(row.status).toBe("active");
    expect(row.scopes ?? "").toContain(CALENDAR_READ_SCOPE);
    expect(row.providerAccountId).toBe("google-sub-cal-ok");
    expect(row.providerAccountEmail).toBe(CALENDAR_EMAIL);
    if (typeof row.refreshTokenEnc !== "string") {
      throw new Error(ETestMessages.CONNECTION_ROW_HAS_NO_ENCRYPTED_REFRESH_TOKEN);
    }
    expect(row.refreshTokenEnc.startsWith("v1.")).toBe(true);
    expect(row.refreshTokenEnc).not.toContain("refresh-code-cal-ok");
    expect(decryptSecret(ENV.connectionEncryptionKey, row.refreshTokenEnc)).toBe(
      "refresh-code-cal-ok",
    );

    expect(await cache.get(connectionTokenKey(row.id))).toBe("code-cal-ok");
    const ttl = await cachedTokenTtlSeconds(row.id);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(DEFAULT_TOKEN_EXPIRY_SECONDS);

    const { status, data } = await listIdentities(cookie);
    expect(status).toBe(HTTP_OK);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("refreshTokenEnc");
    expect(serialized).not.toContain("apiKeyEnc");
    expect(serialized).not.toContain("refresh-code-cal-ok");
    expect(data?.[0]?.connections).toEqual([
      {
        id: row.id,
        provider: "google-calendar",
        authKind: "oauth",
        status: "active",
        scopes: row.scopes,
        providerAccountId: "google-sub-cal-ok",
        providerAccountEmail: CALENDAR_EMAIL,
        providerSite: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
  });

  test("rejects a calendar consent that leaves out the calendar scope", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-noscope", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-cal-noscope",
    });
    const identityId = await createIdentity(cookie, "code-cal-noscope");
    const state = await startCalendarState(cookie, identityId);

    setCalendarProfile("code-cal-noscope-2", "google-sub-cal-noscope");
    provider.google.grantedScopes.set("code-cal-noscope-2", ["openid", "email"]);
    const completed = await completeCallback("code-cal-noscope-2", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("scope_denied"));

    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("keeps a saved calendar connection when the token cache write fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-cache", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-cal-cache",
    });
    const identityId = await createIdentity(cookie, "code-cal-cache");
    const state = await startCalendarState(cookie, identityId);
    setCalendarProfile("code-cal-cache-2", "google-sub-cal-cache");

    const cacheSpy = spyOn(CacheService, "put").mockRejectedValue(
      new Error(ETestMessages.CACHE_IS_DOWN),
    );
    try {
      const completed = await completeCallback("code-cal-cache-2", state);
      expect(readLocation(completed)).toBe(connectedUrl("google-calendar", CALENDAR_EMAIL));
    } finally {
      cacheSpy.mockRestore();
    }

    const row = await readOnlyConnectionRow();
    expect(row.status).toBe(EConnectionStatus.ACTIVE);
  });

  test("rejects a calendar consent completed with a different google account", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-mid", { ...GOOGLE_PROFILE, sub: "google-sub-cal-mid" });
    const identityId = await createIdentity(cookie, "code-cal-mid");
    const state = await startCalendarState(cookie, identityId);

    setCalendarProfile("code-cal-wrong", "google-sub-cal-other", "other@employer.example");
    const completed = await completeCallback("code-cal-wrong", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("sub_mismatch"));

    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("refuses a second calendar under the same work identity", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { identityId } = await connectCalendar(cookie, {
      identityCode: "code-cal-dup-id",
      identitySub: "google-sub-cal-dup",
      calendarCode: "code-cal-dup-first",
    });
    const state = await startCalendarState(cookie, identityId);

    setCalendarProfile("code-cal-dup-second", "google-sub-cal-dup");
    const completed = await completeCallback("code-cal-dup-second", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("already_connected"));

    expect((await db.select().from(schema.connection)).length).toBe(1);
  });

  test("replaces a calendar connection that needs a reconnect", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { identityId, connectionId } = await connectCalendar(cookie, {
      identityCode: "code-cal-re-id",
      identitySub: "google-sub-cal-re",
      calendarCode: "code-cal-re-first",
    });
    await markNeedsReconnect(connectionId);
    const state = await startCalendarState(cookie, identityId);

    setCalendarProfile("code-cal-re-second", "google-sub-cal-re");
    const completed = await completeCallback("code-cal-re-second", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(connectedUrl("google-calendar", CALENDAR_EMAIL));

    const row = await readOnlyConnectionRow();
    expect(row.id).not.toBe(connectionId);
    expect(row.status).toBe(EConnectionStatus.ACTIVE);
  });

  test("keeps a calendar connection that needs a reconnect when the code exchange fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { identityId, connectionId } = await connectCalendar(cookie, {
      identityCode: "code-cal-keep-id",
      identitySub: "google-sub-cal-keep",
      calendarCode: "code-cal-keep-first",
    });
    await markNeedsReconnect(connectionId);
    const state = await startCalendarState(cookie, identityId);

    const completed = await completeCallback("unknown-calendar-code", state);
    expect(readLocation(completed)).toBe(errorUrl("failed"));

    const row = await readOnlyConnectionRow();
    expect(row.id).toBe(connectionId);
    expect(row.status).toBe(EConnectionStatus.NEEDS_RECONNECT);
  });

  test("redirects to an error when calendar code exchange fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-cal-ex", { ...GOOGLE_PROFILE, sub: "google-sub-cal-ex" });
    const identityId = await createIdentity(cookie, "code-cal-ex");
    const state = await startCalendarState(cookie, identityId);

    const completed = await completeCallback("unknown-calendar-code", state);
    expect(completed.status).toBe(HTTP_FOUND);
    expect(readLocation(completed)).toBe(errorUrl("failed"));

    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("disconnect removes the calendar connection", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { connectionId } = await connectCalendar(cookie, {
      identityCode: "code-cal-del-id",
      identitySub: "google-sub-cal-del",
      calendarCode: "code-cal-del-cal",
    });

    expect((await deleteConnection(cookie, connectionId)).status).toBe(HTTP_OK);
    expect(await db.select().from(schema.connection)).toEqual([]);

    const { status, data } = await listIdentities(cookie);
    expect(status).toBe(HTTP_OK);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.connections).toEqual([]);
  });

  test("clears the cached access token on disconnect", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const { connectionId } = await connectCalendar(cookie, {
      identityCode: "code-cal-token-id",
      identitySub: "google-sub-cal-token",
      calendarCode: "code-cal-token-cal",
    });
    expect(await cache.get(connectionTokenKey(connectionId))).not.toBeNull();

    expect((await deleteConnection(cookie, connectionId)).status).toBe(HTTP_OK);
    expect(await cache.get(connectionTokenKey(connectionId))).toBeNull();
  });
});

describe("api key connections", () => {
  beforeEach(seedApiKeys);

  test("connects jira with a valid api key", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira", { ...GOOGLE_PROFILE, sub: "google-sub-jira" });
    const identityId = await createIdentity(cookie, "code-jira");

    const { status, data } = await connectJira(cookie, identityId, VALID_JIRA_KEY);
    expect(status).toBe(HTTP_OK);
    expect(data).toEqual({
      id: expect.any(String),
      provider: "jira",
      authKind: "api_key",
      status: "active",
      scopes: null,
      providerAccountId: JIRA_ACCOUNT.accountId,
      providerAccountEmail: JIRA_ACCOUNT.accountEmail,
      providerSite: JIRA_SITE,
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    });

    const stored = await readOnlyConnectionRow();
    if (typeof stored.apiKeyEnc !== "string") {
      throw new Error(ETestMessages.CONNECTION_ROW_HAS_NO_ENCRYPTED_API_KEY);
    }
    expect(stored.apiKeyEnc).not.toContain(VALID_JIRA_KEY);
    expect(stored.apiKeyEnc.startsWith("v1.")).toBe(true);
    expect(decryptSecret(ENV.connectionEncryptionKey, stored.apiKeyEnc)).toBe(VALID_JIRA_KEY);
    expect(stored.refreshTokenEnc).toBeNull();
  });

  test("connects linear with a valid api key", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-linear", { ...GOOGLE_PROFILE, sub: "google-sub-linear" });
    const identityId = await createIdentity(cookie, "code-linear");

    const { status, data } = await connect(cookie, identityId, {
      provider: "linear",
      apiKey: VALID_LINEAR_KEY,
    });
    expect(status).toBe(HTTP_OK);
    expect(data).toMatchObject({
      provider: "linear",
      authKind: "api_key",
      status: "active",
      providerAccountId: LINEAR_ACCOUNT.accountId,
      providerAccountEmail: LINEAR_ACCOUNT.accountEmail,
    });
  });

  test("rejects an invalid api key with a clear error and no row", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-badkey", { ...GOOGLE_PROFILE, sub: "google-sub-badkey" });
    const identityId = await createIdentity(cookie, "code-badkey");

    const { status, error } = await connectJira(cookie, identityId, INVALID_API_KEY);
    expect(status).toBe(HTTP_BAD_REQUEST);
    expect(error?.value).toEqual({ message: EIdentityMessages.INVALID_API_KEY });
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("refuses a duplicate provider under the same identity", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-dup", { ...GOOGLE_PROFILE, sub: "google-sub-dup" });
    const identityId = await createIdentity(cookie, "code-dup");

    expect((await connectJira(cookie, identityId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);

    const { status, error } = await connectJira(cookie, identityId, VALID_JIRA_KEY);
    expect(status).toBe(HTTP_CONFLICT);
    expect(error?.value).toEqual({ message: EIdentityMessages.CONNECTION_EXISTS });
    expect((await db.select().from(schema.connection)).length).toBe(1);
  });

  test("replaces an api key connection that needs a reconnect", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-key-re", { ...GOOGLE_PROFILE, sub: "google-sub-key-re" });
    const identityId = await createIdentity(cookie, "code-key-re");
    expect((await connectJira(cookie, identityId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    const stale = await readOnlyConnectionRow();
    await markNeedsReconnect(stale.id);

    expect((await connectJira(cookie, identityId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);

    const row = await readOnlyConnectionRow();
    expect(row.id).not.toBe(stale.id);
    expect(row.status).toBe(EConnectionStatus.ACTIVE);
  });

  test("keeps an api key connection that needs a reconnect when the new key is invalid", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-key-keep", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-key-keep",
    });
    const identityId = await createIdentity(cookie, "code-key-keep");
    expect((await connectJira(cookie, identityId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    const stale = await readOnlyConnectionRow();
    await markNeedsReconnect(stale.id);

    expect((await connectJira(cookie, identityId, INVALID_API_KEY)).status).toBe(HTTP_BAD_REQUEST);

    const row = await readOnlyConnectionRow();
    expect(row.id).toBe(stale.id);
    expect(row.status).toBe(EConnectionStatus.NEEDS_RECONNECT);
  });

  test("allows the same provider under a different identity", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-multi-a", { ...GOOGLE_PROFILE, sub: "google-sub-multi-a" });
    provider.google.profiles.set("code-multi-b", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-multi-b",
      email: "other@employer.example",
    });
    const firstId = await createIdentity(cookie, "code-multi-a");
    const secondState = await startConnect(cookie);
    expect((await completeCallback("code-multi-b", secondState)).status).toBe(HTTP_FOUND);
    const { data } = await listIdentities(cookie);
    const second = data?.find((entry) => entry.id !== firstId);
    if (!second) {
      throw new Error(ETestMessages.SECOND_IDENTITY_IS_MISSING);
    }

    expect((await connectJira(cookie, firstId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    expect((await connectJira(cookie, second.id, VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    expect((await db.select().from(schema.connection)).length).toBe(2);
  });

  test("refuses to connect to another user's identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.google.profiles.set("code-mine", { ...GOOGLE_PROFILE, sub: "google-sub-mine" });
    const identityId = await createIdentity(first.cookie, "code-mine");

    const { status } = await connectJira(second.cookie, identityId, VALID_JIRA_KEY);
    expect(status).toBe(HTTP_NOT_FOUND);
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("rejects unauthenticated api key connect", async () => {
    const { status } = await api
      .identities({ identityId: "some-id" })
      .connections.post({ provider: "jira", apiKey: VALID_JIRA_KEY });
    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("never leaks secrets in GET identities", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-leak", { ...GOOGLE_PROFILE, sub: "google-sub-leak" });
    const identityId = await createIdentity(cookie, "code-leak");
    expect((await connectJira(cookie, identityId, VALID_JIRA_KEY)).status).toBe(HTTP_OK);

    const { status, data } = await listIdentities(cookie);
    expect(status).toBe(HTTP_OK);
    const raw = JSON.stringify(data);
    expect(raw).not.toContain(VALID_JIRA_KEY);
    expect(raw).not.toContain("apiKeyEnc");
    expect(raw).not.toContain("refreshTokenEnc");
  });

  test("disconnect removes an api key connection", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-disc", { ...GOOGLE_PROFILE, sub: "google-sub-disc" });
    const identityId = await createIdentity(cookie, "code-disc");
    const { status, data } = await connect(cookie, identityId, {
      provider: "linear",
      apiKey: VALID_LINEAR_KEY,
    });
    expect(status).toBe(HTTP_OK);
    if (!(data && "id" in data)) {
      throw new Error(ETestMessages.CONNECTION_HAS_NO_ID);
    }

    expect((await deleteConnection(cookie, data.id)).status).toBe(HTTP_OK);
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("requires email and site for jira", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-details", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-jira-det",
    });
    const identityId = await createIdentity(cookie, "code-jira-details");

    const { status, error } = await connect(cookie, identityId, {
      provider: "jira",
      apiKey: VALID_JIRA_KEY,
    });
    expect(status).toBe(HTTP_BAD_REQUEST);
    expect(error?.value).toEqual({ message: EIdentityMessages.JIRA_DETAILS_REQUIRED });
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("rejects an api key for an oauth provider", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-oauth-key", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-oauth-key",
    });
    const identityId = await createIdentity(cookie, "code-oauth-key");

    const { status, error } = await connect(cookie, identityId, {
      provider: "google-calendar",
      apiKey: VALID_JIRA_KEY,
    });
    expect(status).toBe(HTTP_BAD_REQUEST);
    expect(error?.value).toEqual({ message: EIdentityMessages.PROVIDER_UNSUPPORTED });
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("maps a concurrent duplicate connect to conflict", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-race", { ...GOOGLE_PROFILE, sub: "google-sub-race" });
    const identityId = await createIdentity(cookie, "code-race");

    const results = await Promise.all([
      connectJira(cookie, identityId, VALID_JIRA_KEY),
      connectJira(cookie, identityId, VALID_JIRA_KEY),
    ]);
    const statuses = results.map((result) => result.status).sort();
    expect(statuses).toEqual([HTTP_OK, HTTP_CONFLICT]);
    expect((await db.select().from(schema.connection)).length).toBe(1);
  });
});
