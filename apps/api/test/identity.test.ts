import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { RedisClient } from "bun";

import { sql } from "drizzle-orm";

import type { TDb } from "@recap/db";
import { createDb, schema } from "@recap/db";

import { createApp } from "#api/app";
import type { TApp } from "#api/app.types";
import {
  PENDING_GRANT_KEY_PREFIX,
  PENDING_GRANT_TTL_SECONDS,
} from "#api/modules/identity/identity.constants";
import { EGrantPurpose } from "#api/modules/identity/identity.enums";
import { decryptSecret } from "#api/shared/crypto/crypto.helpers";
import type { IEnv } from "#api/shared/env/env.interfaces";
import { EProviderMessages } from "#api/shared/provider/provider.enums";
import type {
  IApiKeyValidationResult,
  IAuthorizeUrlInput,
  ICodeExchangeInput,
  IGoogleUserinfo,
  IProviderClient,
  ITokenSet,
} from "#api/shared/provider/provider.interfaces";

const TEST_DATABASE_URL = "postgres://recap:recap@localhost:5432/recap_identity_test";
const TEST_REDIS_URL = "redis://localhost:6379";
const TEST_REDIS_PREFIX = "test-7:";
const TEST_WEB_ORIGIN = "http://localhost:5173";
const TEST_API_ORIGIN = "http://localhost:3107";
const TEST_AUTH_SECRET = "test-auth-secret-with-enough-length";
const KEY_BYTES = 32;
const KEY_FILL = 7;
const TEST_ENCRYPTION_KEY = Buffer.alloc(KEY_BYTES, KEY_FILL).toString("base64");
const TEST_USER_NAME = "Test User";
const TEST_PASSWORD = "test-password-123";
const HTTP_OK = 200;
const HTTP_FOUND = 302;
const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_NOT_FOUND = 404;

class FakeProviderClient implements IProviderClient {
  readonly profiles = new Map<string, IGoogleUserinfo>();
  readonly apiKeys = new Map<string, IApiKeyValidationResult>();
  lastAuthorizeInput: IAuthorizeUrlInput | undefined;

  buildAuthorizeUrl(input: IAuthorizeUrlInput): string {
    this.lastAuthorizeInput = input;
    return `https://consent.test/auth?state=${input.state}`;
  }

  exchangeCode(input: ICodeExchangeInput): Promise<ITokenSet> {
    const profile = this.profiles.get(input.code);
    if (!profile) {
      return Promise.reject(new Error("Unknown test code"));
    }
    return Promise.resolve({ accessToken: input.code, refreshToken: undefined });
  }

  fetchGoogleUserinfo(accessToken: string): Promise<IGoogleUserinfo> {
    const profile = this.profiles.get(accessToken);
    if (!profile) {
      return Promise.reject(new Error("Unknown test token"));
    }
    return Promise.resolve(profile);
  }

  validateApiKey(providerName: string, key: string): Promise<IApiKeyValidationResult> {
    const found = this.apiKeys.get(`${providerName}:${key}`);
    if (!found) {
      return Promise.reject(new Error(EProviderMessages.INVALID_API_KEY));
    }
    return Promise.resolve(found);
  }
}

let db: TDb;
let redis: RedisClient;
let app: TApp;
let provider: FakeProviderClient;

function testEnv(): IEnv {
  return {
    port: 3107,
    databaseUrl: TEST_DATABASE_URL,
    redisUrl: TEST_REDIS_URL,
    redisKeyPrefix: TEST_REDIS_PREFIX,
    webOrigin: TEST_WEB_ORIGIN,
    auth: {
      secret: TEST_AUTH_SECRET,
      baseUrl: TEST_API_ORIGIN,
      cookieDomain: undefined,
      google: { clientId: "test-client", clientSecret: "test-secret" },
    },
    connectionEncryptionKey: TEST_ENCRYPTION_KEY,
  };
}

function readUserId(body: unknown): string {
  if (typeof body === "object" && body !== null && "user" in body) {
    const user: unknown = body.user;
    if (typeof user === "object" && user !== null && "id" in user && typeof user.id === "string") {
      return user.id;
    }
  }
  throw new Error("Signup response has no user id");
}

async function signUp(email: string): Promise<{ cookie: string; userId: string }> {
  const response = await app.handle(
    new Request(`${TEST_API_ORIGIN}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: TEST_USER_NAME, email, password: TEST_PASSWORD }),
    }),
  );
  expect(response.ok).toBe(true);
  const cookie = response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  expect(cookie.length).toBeGreaterThan(0);
  const userId = readUserId(await response.json());
  return { cookie, userId };
}

function uniqueEmail(): string {
  return `user-${randomUUID()}@test.example`;
}

async function resetState(): Promise<void> {
  await db.execute(
    sql`truncate table "identity", "connection", "session", "account", "user" cascade`,
  );
  const found: unknown = await redis.send("KEYS", [`${TEST_REDIS_PREFIX}*`]);
  if (Array.isArray(found) && found.length > 0) {
    const names = found.filter((entry): entry is string => typeof entry === "string");
    if (names.length > 0) {
      await redis.del(...names);
    }
  }
}

function readState(authorizeUrl: string): string {
  const state = new URL(authorizeUrl).searchParams.get("state");
  if (!state) {
    throw new Error("Authorize URL has no state");
  }
  return state;
}

async function startConnect(cookie: string): Promise<string> {
  const response = await app.handle(
    new Request(`${TEST_API_ORIGIN}/identities/connect`, { method: "POST", headers: { cookie } }),
  );
  expect(response.status).toBe(HTTP_OK);
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("authorizeUrl" in body)) {
    throw new Error("Connect response has no authorize URL");
  }
  const authorizeUrl: unknown = body.authorizeUrl;
  if (typeof authorizeUrl !== "string") {
    throw new Error("Authorize URL is not a string");
  }
  return readState(authorizeUrl);
}

function completeCallback(code: string, state: string): Promise<Response> {
  return app.handle(
    new Request(`${TEST_API_ORIGIN}/api/connect/google/callback?code=${code}&state=${state}`),
  );
}

function readLocation(response: Response): string {
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Callback response has no location");
  }
  return location;
}

const GOOGLE_PROFILE: IGoogleUserinfo = {
  sub: "google-sub-1",
  email: "work@employer.example",
  name: "Work User",
  picture: "https://img.test/avatar.png",
};

async function createIdentity(cookie: string, code: string): Promise<string> {
  const state = await startConnect(cookie);
  const completed = await completeCallback(code, state);
  expect(completed.status).toBe(HTTP_FOUND);
  const listResponse = await app.handle(
    new Request(`${TEST_API_ORIGIN}/identities`, { headers: { cookie } }),
  );
  expect(listResponse.status).toBe(HTTP_OK);
  const identities: unknown = await listResponse.json();
  if (!Array.isArray(identities) || identities.length === 0) {
    throw new Error("Identity list is empty after connect");
  }
  const first: unknown = identities[0];
  if (
    typeof first !== "object" ||
    first === null ||
    !("id" in first) ||
    typeof first.id !== "string"
  ) {
    throw new Error("Identity has no id");
  }
  return first.id;
}

beforeAll(() => {
  db = createDb(TEST_DATABASE_URL);
  redis = new RedisClient(TEST_REDIS_URL);
  provider = new FakeProviderClient();
  app = createApp({ db, redis, env: testEnv(), providerClient: provider });
});

beforeEach(resetState);

describe("work identities", () => {
  test("rejects unauthenticated identity list", async () => {
    const response = await app.handle(new Request(`${TEST_API_ORIGIN}/identities`));
    expect(response.status).toBe(HTTP_UNAUTHORIZED);
  });

  test("lists no identities for a new user", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities`, { headers: { cookie } }),
    );
    expect(response.status).toBe(HTTP_OK);
    expect(await response.json()).toEqual([]);
  });

  test("rejects unauthenticated connect start", async () => {
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/connect`, { method: "POST" }),
    );
    expect(response.status).toBe(HTTP_UNAUTHORIZED);
  });

  test("starts identity connect with a pending grant and no identity row", async () => {
    const { cookie, userId } = await signUp(uniqueEmail());
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/connect`, {
        method: "POST",
        headers: { cookie },
      }),
    );
    expect(response.status).toBe(HTTP_OK);
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("authorizeUrl" in body)) {
      throw new Error("Connect response has no authorize URL");
    }
    const authorizeUrl: unknown = body.authorizeUrl;
    if (typeof authorizeUrl !== "string") {
      throw new Error("Authorize URL is not a string");
    }
    expect(provider.lastAuthorizeInput?.scopes).toEqual(["openid", "email"]);

    const state = readState(authorizeUrl);
    const stored = await redis.get(`${TEST_REDIS_PREFIX}${PENDING_GRANT_KEY_PREFIX}${state}`);
    expect(stored).not.toBeNull();
    const grant: unknown = JSON.parse(stored ?? "");
    expect(grant).toEqual({ userId, purpose: EGrantPurpose.IDENTITY_CREATE });
    const ttl: unknown = await redis.send("TTL", [
      `${TEST_REDIS_PREFIX}${PENDING_GRANT_KEY_PREFIX}${state}`,
    ]);
    if (typeof ttl !== "number") {
      throw new Error("Grant TTL is not a number");
    }
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(PENDING_GRANT_TTL_SECONDS);

    expect(await db.select().from(schema.identity)).toEqual([]);
  });

  test("completes identity connect without a session and consumes the grant", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-1", GOOGLE_PROFILE);
    const state = await startConnect(cookie);

    const response = await completeCallback("code-1", state);
    expect(response.status).toBe(HTTP_FOUND);
    expect(readLocation(response)).toBe(
      `${TEST_WEB_ORIGIN}/settings?connected=google&email=${encodeURIComponent(GOOGLE_PROFILE.email)}`,
    );

    const stored = await redis.get(`${TEST_REDIS_PREFIX}${PENDING_GRANT_KEY_PREFIX}${state}`);
    expect(stored).toBeNull();

    const listResponse = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities`, { headers: { cookie } }),
    );
    expect(listResponse.status).toBe(HTTP_OK);
    const identities: unknown = await listResponse.json();
    expect(identities).toEqual([
      {
        id: expect.any(String),
        email: GOOGLE_PROFILE.email,
        displayName: GOOGLE_PROFILE.name,
        avatarUrl: GOOGLE_PROFILE.picture,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        connections: [],
      },
    ]);

    const replay = await completeCallback("code-1", state);
    expect(replay.status).toBe(HTTP_FOUND);
    expect(readLocation(replay)).toBe(`${TEST_WEB_ORIGIN}/settings?error=expired`);
  });

  test("rejects a google account that is already a work identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.profiles.set("code-first", GOOGLE_PROFILE);
    provider.profiles.set("code-second", GOOGLE_PROFILE);

    const firstState = await startConnect(first.cookie);
    const firstResponse = await completeCallback("code-first", firstState);
    expect(firstResponse.status).toBe(HTTP_FOUND);

    const secondState = await startConnect(second.cookie);
    const secondResponse = await completeCallback("code-second", secondState);
    expect(secondResponse.status).toBe(HTTP_FOUND);
    expect(readLocation(secondResponse)).toBe(
      `${TEST_WEB_ORIGIN}/settings?error=already_connected`,
    );

    expect((await db.select().from(schema.identity)).length).toBe(1);
  });

  test("rejects an unknown grant state", async () => {
    const response = await completeCallback("code-1", "missing-state");
    expect(response.status).toBe(HTTP_FOUND);
    expect(readLocation(response)).toBe(`${TEST_WEB_ORIGIN}/settings?error=expired`);
  });

  test("redirects to an error when code exchange fails", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const state = await startConnect(cookie);

    const response = await completeCallback("unknown-code", state);
    expect(response.status).toBe(HTTP_FOUND);
    expect(readLocation(response)).toBe(`${TEST_WEB_ORIGIN}/settings?error=failed`);

    expect(await db.select().from(schema.identity)).toEqual([]);
  });

  test("rejects unauthenticated identity delete", async () => {
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/some-id`, { method: "DELETE" }),
    );
    expect(response.status).toBe(HTTP_UNAUTHORIZED);
  });

  test("deletes a work identity and reports a missing one", async () => {
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-delete", { ...GOOGLE_PROFILE, sub: "google-sub-delete" });
    const identityId = await createIdentity(cookie, "code-delete");

    const deleted = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/${identityId}`, {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(deleted.status).toBe(HTTP_OK);
    expect(await db.select().from(schema.identity)).toEqual([]);

    const missing = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/${identityId}`, {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(missing.status).toBe(HTTP_NOT_FOUND);
  });

  test("refuses to delete another user's work identity", async () => {
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.profiles.set("code-kept", { ...GOOGLE_PROFILE, sub: "google-sub-kept" });
    const identityId = await createIdentity(first.cookie, "code-kept");

    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/${identityId}`, {
        method: "DELETE",
        headers: { cookie: second.cookie },
      }),
    );
    expect(response.status).toBe(HTTP_NOT_FOUND);
    expect((await db.select().from(schema.identity)).length).toBe(1);
  });

  test("rejects unauthenticated connection delete", async () => {
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/connections/some-id`, { method: "DELETE" }),
    );
    expect(response.status).toBe(HTTP_UNAUTHORIZED);
  });

  test("reports a missing connection on delete", async () => {
    const { cookie } = await signUp(uniqueEmail());
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/connections/missing-id`, {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(response.status).toBe(HTTP_NOT_FOUND);
  });
});

const VALID_JIRA_KEY = "valid-jira-api-key-12345678";
const VALID_LINEAR_KEY = "valid-linear-api-key-12345678";
const JIRA_ACCOUNT: IApiKeyValidationResult = {
  accountId: "jira-account-1",
  accountEmail: "dev@employer.example",
};
const LINEAR_ACCOUNT: IApiKeyValidationResult = {
  accountId: "linear-user-1",
  accountEmail: "dev@employer.example",
};

function seedApiKeys(): void {
  provider.apiKeys.set(`jira:${VALID_JIRA_KEY}`, JIRA_ACCOUNT);
  provider.apiKeys.set(`linear:${VALID_LINEAR_KEY}`, LINEAR_ACCOUNT);
}

function connectApiKey(
  cookie: string,
  identityId: string,
  providerName: string,
  apiKey: string,
): Promise<Response> {
  return app.handle(
    new Request(`${TEST_API_ORIGIN}/identities/${identityId}/connections`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ provider: providerName, apiKey }),
    }),
  );
}

describe("api key connections", () => {
  test("connects jira with a valid api key", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-jira", { ...GOOGLE_PROFILE, sub: "google-sub-jira" });
    const identityId = await createIdentity(cookie, "code-jira");

    const response = await connectApiKey(cookie, identityId, "jira", VALID_JIRA_KEY);
    expect(response.status).toBe(HTTP_OK);
    expect(await response.json()).toEqual({
      id: expect.any(String),
      provider: "jira",
      authKind: "api_key",
      status: "active",
      scopes: null,
      providerAccountId: JIRA_ACCOUNT.accountId,
      providerAccountEmail: JIRA_ACCOUNT.accountEmail,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const rows = await db.select().from(schema.connection);
    expect(rows.length).toBe(1);
    const stored = rows[0];
    if (!stored) {
      throw new Error("Connection row is missing");
    }
    expect(stored.apiKeyEnc).not.toBeNull();
    expect(stored.apiKeyEnc).not.toContain(VALID_JIRA_KEY);
    expect(String(stored.apiKeyEnc).startsWith("v1.")).toBe(true);
    expect(decryptSecret(TEST_ENCRYPTION_KEY, String(stored.apiKeyEnc))).toBe(VALID_JIRA_KEY);
    expect(stored.refreshTokenEnc).toBeNull();
  });

  test("connects linear with a valid api key", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-linear", { ...GOOGLE_PROFILE, sub: "google-sub-linear" });
    const identityId = await createIdentity(cookie, "code-linear");

    const response = await connectApiKey(cookie, identityId, "linear", VALID_LINEAR_KEY);
    expect(response.status).toBe(HTTP_OK);
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) {
      throw new Error("Connect response is not an object");
    }
    expect(body).toMatchObject({
      provider: "linear",
      authKind: "api_key",
      status: "active",
      providerAccountId: LINEAR_ACCOUNT.accountId,
      providerAccountEmail: LINEAR_ACCOUNT.accountEmail,
    });
  });

  test("rejects an invalid api key with a clear error and no row", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-badkey", { ...GOOGLE_PROFILE, sub: "google-sub-badkey" });
    const identityId = await createIdentity(cookie, "code-badkey");

    const response = await connectApiKey(cookie, identityId, "jira", "wrong-key-12345678");
    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(await response.text()).toContain("invalid");
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("refuses a duplicate provider under the same identity", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-dup", { ...GOOGLE_PROFILE, sub: "google-sub-dup" });
    const identityId = await createIdentity(cookie, "code-dup");

    const first = await connectApiKey(cookie, identityId, "jira", VALID_JIRA_KEY);
    expect(first.status).toBe(HTTP_OK);

    const second = await connectApiKey(cookie, identityId, "jira", VALID_JIRA_KEY);
    expect(second.status).toBe(HTTP_CONFLICT);
    expect(await second.text()).toContain("already");
    expect((await db.select().from(schema.connection)).length).toBe(1);
  });

  test("allows the same provider under a different identity", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-multi-a", { ...GOOGLE_PROFILE, sub: "google-sub-multi-a" });
    provider.profiles.set("code-multi-b", {
      ...GOOGLE_PROFILE,
      sub: "google-sub-multi-b",
      email: "other@employer.example",
    });
    const firstId = await createIdentity(cookie, "code-multi-a");
    const secondState = await startConnect(cookie);
    const completed = await completeCallback("code-multi-b", secondState);
    expect(completed.status).toBe(HTTP_FOUND);
    const listResponse = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities`, { headers: { cookie } }),
    );
    const identities: unknown = await listResponse.json();
    if (!Array.isArray(identities)) {
      throw new Error("Identity list is not an array");
    }
    const second = identities.find((entry): entry is { id: string } => {
      if (typeof entry !== "object" || entry === null || !("id" in entry)) {
        return false;
      }
      return entry.id !== firstId;
    });
    if (!second) {
      throw new Error("Second identity is missing");
    }

    expect((await connectApiKey(cookie, firstId, "jira", VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    expect((await connectApiKey(cookie, second.id, "jira", VALID_JIRA_KEY)).status).toBe(HTTP_OK);
    expect((await db.select().from(schema.connection)).length).toBe(2);
  });

  test("refuses to connect to another user's identity", async () => {
    seedApiKeys();
    const first = await signUp(uniqueEmail());
    const second = await signUp(uniqueEmail());
    provider.profiles.set("code-mine", { ...GOOGLE_PROFILE, sub: "google-sub-mine" });
    const identityId = await createIdentity(first.cookie, "code-mine");

    const response = await connectApiKey(second.cookie, identityId, "jira", VALID_JIRA_KEY);
    expect(response.status).toBe(HTTP_NOT_FOUND);
    expect(await db.select().from(schema.connection)).toEqual([]);
  });

  test("rejects unauthenticated api key connect", async () => {
    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities/some-id/connections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "jira", apiKey: VALID_JIRA_KEY }),
      }),
    );
    expect(response.status).toBe(HTTP_UNAUTHORIZED);
  });

  test("never leaks secrets in GET identities", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-leak", { ...GOOGLE_PROFILE, sub: "google-sub-leak" });
    const identityId = await createIdentity(cookie, "code-leak");
    expect((await connectApiKey(cookie, identityId, "jira", VALID_JIRA_KEY)).status).toBe(HTTP_OK);

    const response = await app.handle(
      new Request(`${TEST_API_ORIGIN}/identities`, { headers: { cookie } }),
    );
    expect(response.status).toBe(HTTP_OK);
    const raw = await response.text();
    expect(raw).not.toContain(VALID_JIRA_KEY);
    expect(raw).not.toContain("apiKeyEnc");
    expect(raw).not.toContain("refreshTokenEnc");
  });

  test("disconnect removes an api key connection", async () => {
    seedApiKeys();
    const { cookie } = await signUp(uniqueEmail());
    provider.profiles.set("code-disc", { ...GOOGLE_PROFILE, sub: "google-sub-disc" });
    const identityId = await createIdentity(cookie, "code-disc");
    const connected = await connectApiKey(cookie, identityId, "linear", VALID_LINEAR_KEY);
    expect(connected.status).toBe(HTTP_OK);
    const created: unknown = await connected.json();
    if (
      typeof created !== "object" ||
      created === null ||
      !("id" in created) ||
      typeof created.id !== "string"
    ) {
      throw new Error("Connection has no id");
    }

    const deleted = await app.handle(
      new Request(`${TEST_API_ORIGIN}/connections/${created.id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(deleted.status).toBe(HTTP_OK);
    expect(await db.select().from(schema.connection)).toEqual([]);
  });
});
