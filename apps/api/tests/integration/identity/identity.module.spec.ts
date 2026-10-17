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
import { JiraService } from "#api/shared/providers/jira/jira.service";
import type { ILinearCodeExchangeInput } from "#api/shared/providers/linear/linear.interfaces";
import { LinearService } from "#api/shared/providers/linear/linear.service";
import type {
  IProviderAuthorization,
  IProviderAuthorizeInput,
  IProviderCodeExchangeInput,
  IProviderGrant,
} from "#api/shared/providers/providers.interfaces";
import {
  CALENDAR_EMAIL,
  CALENDAR_GRANTED_SCOPES,
  CALENDAR_READ_SCOPE,
  DEFAULT_TOKEN_EXPIRY_SECONDS,
  GOOGLE_ACCESS_DENIED,
  GOOGLE_PROFILE,
  HTTP_BAD_REQUEST,
  HTTP_FOUND,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  JIRA_GRANT,
  LINEAR_GRANT,
  TEST_PASSWORD,
  TEST_USER_NAME,
} from "#api-tests/fixtures/fixtures.constants";
import { ETestMessages } from "#api-tests/fixtures/fixtures.enums";
import { uniqueEmail, wipeCache, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";
import type {
  ICalendarConnectCodes,
  IProviderCallbackCase,
} from "#api-tests/integration/identity/identity.interfaces";

function readOverride<TValue>(
  overrides: Map<string, TValue | undefined>,
  code: string,
  fallback: TValue,
): TValue | undefined {
  if (!overrides.has(code)) {
    return fallback;
  }
  return overrides.get(code);
}

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
    const refreshToken = readOverride(this.refreshTokens, input.code, `refresh-${input.code}`);
    const expiresInSeconds = readOverride(
      this.tokenExpiries,
      input.code,
      DEFAULT_TOKEN_EXPIRY_SECONDS,
    );
    const scopes = this.grantedScopes.get(input.code) ?? [...CALENDAR_GRANTED_SCOPES];
    return Promise.resolve({
      tokens: { accessToken: input.code, refreshToken, expiresInSeconds, scopes },
      profile,
    });
  }
}

class FakeOAuthClient {
  readonly grants = new Map<string, IProviderGrant>();
  lastCodeVerifier: string | undefined;

  constructor(private readonly name: string) {}

  createAuthorization(input: IProviderAuthorizeInput, hasPkce: boolean): IProviderAuthorization {
    return {
      authorizeUrl: `https://consent.test/${this.name}?state=${input.state}`,
      codeVerifier: this.codeVerifier(input.state, hasPkce),
    };
  }

  exchangeCode(input: IProviderCodeExchangeInput, codeVerifier?: string): Promise<IProviderGrant> {
    const grant = this.grants.get(input.code);
    if (!grant) {
      return Promise.reject(new Error(ETestMessages.UNKNOWN_TEST_CODE));
    }
    this.lastCodeVerifier = codeVerifier;
    return Promise.resolve(grant);
  }

  private codeVerifier(state: string, hasPkce: boolean): string | null {
    if (!hasPkce) {
      return null;
    }
    return `${this.name}-verifier-${state}`;
  }
}

class FakeProviderClients {
  readonly google = new FakeGoogleClient();
  readonly jira = new FakeOAuthClient("jira");
  readonly linear = new FakeOAuthClient("linear");

  install(): void {
    spyOn(GoogleService, "createAuthorization").mockImplementation((input) =>
      this.google.createAuthorization(input),
    );
    spyOn(GoogleService, "exchangeCode").mockImplementation((input) =>
      this.google.exchangeCode(input),
    );
    spyOn(JiraService, "createAuthorization").mockImplementation((input) =>
      this.jira.createAuthorization(input, false),
    );
    spyOn(JiraService, "exchangeCode").mockImplementation((input) => this.jira.exchangeCode(input));
    spyOn(LinearService, "createAuthorization").mockImplementation((input) =>
      this.linear.createAuthorization(input, true),
    );
    spyOn(LinearService, "exchangeCode").mockImplementation((input: ILinearCodeExchangeInput) =>
      this.linear.exchangeCode(input, input.codeVerifier),
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

function completeJiraCallback(code: string, state: string) {
  return api.api.connect.jira.callback.get({ query: { code, state } });
}

function completeLinearCallback(code: string, state: string) {
  return api.api.connect.linear.callback.get({ query: { code, state } });
}

async function startProviderState(
  cookie: string,
  identityId: string,
  providerName: TConnectConnectionBody["provider"],
): Promise<string> {
  const { data, status } = await connect(cookie, identityId, { provider: providerName });
  if (status !== HTTP_OK) {
    throw new Error(ETestMessages.PROVIDER_CONNECT_START_FAILED);
  }
  return readState(readAuthorizeUrl(data));
}

function expectedCodeVerifier(
  providerName: string,
  state: string,
  hasPkce: boolean,
): string | undefined {
  if (!hasPkce) {
    return undefined;
  }
  return `${providerName}-verifier-${state}`;
}

const PROVIDER_CALLBACK_CASES: IProviderCallbackCase[] = [
  {
    provider: "jira",
    grant: JIRA_GRANT,
    complete: completeJiraCallback,
    hasPkce: false,
  },
  {
    provider: "linear",
    grant: LINEAR_GRANT,
    complete: completeLinearCallback,
    hasPkce: true,
  },
];

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
    expect(serialized).not.toContain("refresh-code-cal-ok");
    expect(data?.[0]?.connections).toEqual([
      {
        id: row.id,
        provider: "google-calendar",
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

describe("jira and linear connections", () => {
  test("starts jira connect with a pending grant that has no code verifier", async () => {
    const { cookie, userId } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-start", { ...GOOGLE_PROFILE, sub: "sub-jira-start" });
    const identityId = await createIdentity(cookie, "code-jira-start");

    const { status, data } = await connect(cookie, identityId, { provider: "jira" });
    expect(status).toBe(HTTP_OK);
    const authorizeUrl = readAuthorizeUrl(data);
    expect(authorizeUrl.startsWith("https://consent.test/jira")).toBe(true);
    expect(await readPendingGrant(readState(authorizeUrl))).toEqual({
      userId,
      purpose: EGrantPurpose.CONNECTION,
      identityId,
      provider: "jira",
      codeVerifier: null,
    });
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("starts linear connect with a pkce code verifier", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-lin-start", { ...GOOGLE_PROFILE, sub: "sub-lin-start" });
    const identityId = await createIdentity(cookie, "code-lin-start");

    const state = await startProviderState(cookie, identityId, "linear");
    expect(await readPendingGrant(state)).toMatchObject({
      provider: "linear",
      codeVerifier: `linear-verifier-${state}`,
    });
  });

  test.each(PROVIDER_CALLBACK_CASES)(
    "connects $provider through its callback",
    async ({ provider: providerName, grant, complete, hasPkce }) => {
      const { cookie } = await signUp(uniqueEmail());
      provider.google.profiles.set(`code-${providerName}-id`, {
        ...GOOGLE_PROFILE,
        sub: `sub-${providerName}-ok`,
      });
      const identityId = await createIdentity(cookie, `code-${providerName}-id`);
      const state = await startProviderState(cookie, identityId, providerName);
      provider[providerName].grants.set(`code-${providerName}-ok`, grant);

      const completed = await complete(`code-${providerName}-ok`, state);
      expect(completed.status).toBe(HTTP_FOUND);
      expect(readLocation(completed)).toBe(connectedUrl(providerName, grant.account.accountEmail));
      expect(provider[providerName].lastCodeVerifier).toEqual(
        expectedCodeVerifier(providerName, state, hasPkce),
      );

      const row = await readOnlyConnectionRow();
      expect(row).toMatchObject({
        identityId,
        provider: providerName,
        status: "active",
        providerAccountId: grant.account.accountId,
        providerAccountEmail: grant.account.accountEmail,
        providerSite: grant.site,
        providerResourceId: grant.resourceId,
      });
      if (typeof row.refreshTokenEnc !== "string") {
        throw new Error(ETestMessages.CONNECTION_ROW_HAS_NO_ENCRYPTED_REFRESH_TOKEN);
      }
      expect<string | undefined>(
        decryptSecret(ENV.connectionEncryptionKey, row.refreshTokenEnc),
      ).toBe(grant.tokens.refreshToken);
      expect(await cache.get(connectionTokenKey(row.id))).toBe(grant.tokens.accessToken);

      const { data } = await listIdentities(cookie);
      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain("refreshTokenEnc");
      expect(serialized).not.toContain(grant.tokens.accessToken);
      expect(data?.[0]?.connections[0]).toMatchObject({
        provider: providerName,
        providerSite: grant.site,
      });
    },
  );

  test("rejects a jira grant that comes back on the google callback", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-cross", { ...GOOGLE_PROFILE, sub: "sub-jira-cross" });
    const identityId = await createIdentity(cookie, "code-jira-cross");
    const state = await startProviderState(cookie, identityId, "jira");
    provider.jira.grants.set("code-jira-cross-ok", JIRA_GRANT);

    const completed = await completeCallback("code-jira-cross-ok", state);
    expect(readLocation(completed)).toBe(errorUrl("failed"));
    expect(await findPendingGrantRow(state)).toBeUndefined();
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("redirects a cancelled jira consent to access denied", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-deny", { ...GOOGLE_PROFILE, sub: "sub-jira-deny" });
    const identityId = await createIdentity(cookie, "code-jira-deny");
    const state = await startProviderState(cookie, identityId, "jira");

    const completed = await api.api.connect.jira.callback.get({
      query: { error: GOOGLE_ACCESS_DENIED, state },
    });
    expect(readLocation(completed)).toBe(errorUrl("access_denied"));
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("rejects a linear grant without a refresh token", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-lin-norefresh", { ...GOOGLE_PROFILE, sub: "sub-lin-nr" });
    const identityId = await createIdentity(cookie, "code-lin-norefresh");
    const state = await startProviderState(cookie, identityId, "linear");
    provider.linear.grants.set("code-lin-nr-ok", {
      ...LINEAR_GRANT,
      tokens: { ...LINEAR_GRANT.tokens, refreshToken: undefined },
    });

    const completed = await completeLinearCallback("code-lin-nr-ok", state);
    expect(readLocation(completed)).toBe(errorUrl("failed"));
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("redirects to an error when the jira code exchange fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-fail", { ...GOOGLE_PROFILE, sub: "sub-jira-fail" });
    const identityId = await createIdentity(cookie, "code-jira-fail");
    const state = await startProviderState(cookie, identityId, "jira");

    const completed = await completeJiraCallback("unknown-jira-code", state);
    expect(readLocation(completed)).toBe(errorUrl("failed"));
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("refuses a second jira connection under the same work identity", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-dup", { ...GOOGLE_PROFILE, sub: "sub-jira-dup" });
    const identityId = await createIdentity(cookie, "code-jira-dup");
    provider.jira.grants.set("code-jira-dup-ok", JIRA_GRANT);
    const firstState = await startProviderState(cookie, identityId, "jira");
    expect(readLocation(await completeJiraCallback("code-jira-dup-ok", firstState))).toBe(
      connectedUrl("jira", JIRA_GRANT.account.accountEmail),
    );

    const secondState = await startProviderState(cookie, identityId, "jira");
    const completed = await completeJiraCallback("code-jira-dup-ok", secondState);
    expect(readLocation(completed)).toBe(errorUrl("already_connected"));
    expect((await db.select().from(schema.connection)).length).toBe(1);
  });

  test("refuses to start a connection on another user's identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-mine", { ...GOOGLE_PROFILE, sub: "sub-jira-mine" });
    const identityId = await createIdentity(first.cookie, "code-jira-mine");

    const { status } = await connect(second.cookie, identityId, { provider: "jira" });
    expect(status).toBe(HTTP_NOT_FOUND);
  });

  test("disconnect removes a jira connection and its cached token", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-jira-del", { ...GOOGLE_PROFILE, sub: "sub-jira-del" });
    const identityId = await createIdentity(cookie, "code-jira-del");
    const state = await startProviderState(cookie, identityId, "jira");
    provider.jira.grants.set("code-jira-del-ok", JIRA_GRANT);
    await completeJiraCallback("code-jira-del-ok", state);
    const row = await readOnlyConnectionRow();

    expect((await deleteConnection(cookie, row.id)).status).toBe(HTTP_OK);
    expect(await db.select().from(schema.connection)).toEqual([]);
    expect(await cache.get(connectionTokenKey(row.id))).toBeNull();
  });

  test.each(["jira", "linear"] as const)(
    "rejects %s when its oauth client is not configured",
    async (providerName) => {
      const { cookie } = await signUp(uniqueEmail());
      provider.google.profiles.set(`code-${providerName}-noenv`, {
        ...GOOGLE_PROFILE,
        sub: `sub-${providerName}-noenv`,
      });
      const identityId = await createIdentity(cookie, `code-${providerName}-noenv`);
      const configured = ENV[providerName];
      ENV[providerName] = undefined;
      try {
        const { status, error } = await connect(cookie, identityId, { provider: providerName });
        expect(status).toBe(HTTP_BAD_REQUEST);
        expect(error?.value).toEqual({ message: EIdentityMessages.PROVIDER_UNSUPPORTED });
      } finally {
        ENV[providerName] = configured;
      }
    },
  );

  test("rejects an unwired provider", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.google.profiles.set("code-gh", { ...GOOGLE_PROFILE, sub: "sub-gh" });
    const identityId = await createIdentity(cookie, "code-gh");

    const { status, error } = await connect(cookie, identityId, { provider: "github" });
    expect(status).toBe(HTTP_BAD_REQUEST);
    expect(error?.value).toEqual({ message: EIdentityMessages.PROVIDER_UNSUPPORTED });
  });
});
