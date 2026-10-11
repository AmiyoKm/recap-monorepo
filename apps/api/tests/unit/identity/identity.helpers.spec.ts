import { describe, expect, test } from "bun:test";

import {
  GRANT_STATE_BYTES,
  PENDING_GRANT_TTL_SECONDS,
  PROVIDER_REGISTRY,
} from "#api/modules/identity/identity.constants";
import {
  EGrantPurpose,
  EIdentityMessages,
  EIdentityRedisKeyPrefix,
} from "#api/modules/identity/identity.enums";
import {
  connectionTokenKey,
  createGrantState,
  findProviderRegistration,
  isUniqueViolation,
  parsePendingGrant,
  pendingGrantKey,
  toConnectionView,
} from "#api/modules/identity/identity.helpers";

const TEN_MINUTES_IN_SECONDS = 600;
const STATE_BYTES = 32;

describe("pending grant keys", () => {
  test("prefixes grant states and connection tokens", () => {
    expect(pendingGrantKey("abc")).toBe("test-7:pending-grant:abc");
    expect(connectionTokenKey("conn-1")).toBe("test-7:connection-token:conn-1");
    expect<string>(EIdentityRedisKeyPrefix.PENDING_GRANT).toBe("pending-grant:");
    expect<string>(EIdentityRedisKeyPrefix.CONNECTION_TOKEN).toBe("connection-token:");
    expect(PENDING_GRANT_TTL_SECONDS).toBe(TEN_MINUTES_IN_SECONDS);
  });

  test("creates unique high-entropy states", () => {
    expect(GRANT_STATE_BYTES).toBe(STATE_BYTES);
    const first = createGrantState();
    const second = createGrantState();
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});

describe("parsePendingGrant", () => {
  test("reads an identity-create grant", () => {
    const grant = parsePendingGrant(
      JSON.stringify({ userId: "user-1", purpose: "identity-create", codeVerifier: "verifier-1" }),
    );
    expect(grant).toMatchObject({
      userId: "user-1",
      purpose: "identity-create",
      codeVerifier: "verifier-1",
    });
    expect<string>(EGrantPurpose.IDENTITY_CREATE).toBe("identity-create");
  });

  test("rejects a connection grant without an identity or provider", () => {
    const grant = parsePendingGrant(
      JSON.stringify({ userId: "user-1", purpose: "connection", codeVerifier: "verifier-1" }),
    );
    expect(grant).toBeNull();
  });

  test("reads a connection grant with identity and provider", () => {
    const grant = parsePendingGrant(
      JSON.stringify({
        userId: "user-1",
        purpose: "connection",
        identityId: "identity-1",
        provider: "google-calendar",
        codeVerifier: "verifier-1",
      }),
    );
    expect(grant).toEqual({
      userId: "user-1",
      purpose: EGrantPurpose.CONNECTION,
      identityId: "identity-1",
      provider: "google-calendar",
      codeVerifier: "verifier-1",
    });
  });

  test("returns null for corrupt values instead of throwing", () => {
    expect(parsePendingGrant("not-json{")).toBeNull();
    expect(parsePendingGrant("")).toBeNull();
  });

  test("returns null for missing or mistyped fields", () => {
    expect(parsePendingGrant(JSON.stringify({ purpose: "connection" }))).toBeNull();
    expect(parsePendingGrant(JSON.stringify({ userId: "user-1" }))).toBeNull();
    expect(parsePendingGrant(JSON.stringify({ userId: "user-1", purpose: "signup" }))).toBeNull();
    expect(
      parsePendingGrant(JSON.stringify({ userId: "user-1", purpose: "connection", provider: 7 })),
    ).toBeNull();
    expect(parsePendingGrant(JSON.stringify(["user-1"]))).toBeNull();
    expect(
      parsePendingGrant(JSON.stringify({ userId: "user-1", purpose: "identity-create" })),
    ).toBeNull();
  });
});

describe("isUniqueViolation", () => {
  test("detects drizzle-wrapped unique violations", () => {
    expect(isUniqueViolation({ cause: { errno: "23505" } })).toBe(true);
  });

  test("detects plain coded errors", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test("rejects other failures", () => {
    expect(isUniqueViolation({ cause: { errno: "23503" } })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});

describe("findProviderRegistration", () => {
  test("finds wired and unwired providers", () => {
    expect(findProviderRegistration(PROVIDER_REGISTRY, "google-calendar")?.wired).toBe(true);
    expect(findProviderRegistration(PROVIDER_REGISTRY, "slack")?.wired).toBe(false);
  });

  test("returns undefined for unknown providers", () => {
    expect(findProviderRegistration(PROVIDER_REGISTRY, "zoom")).toBeUndefined();
  });
});

describe("toConnectionView", () => {
  const row = {
    id: "conn-1",
    identityId: "identity-1",
    provider: "jira",
    authKind: "api_key",
    status: "active",
    scopes: null,
    refreshTokenEnc: null,
    apiKeyEnc: "encrypted",
    accessTokenExpiresAt: null,
    providerAccountId: "account-1",
    providerAccountEmail: "dev@employer.example",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  test("keeps known values and drops secrets", () => {
    const view = toConnectionView(row);
    expect(view.provider).toBe("jira");
    expect(view.authKind).toBe("api_key");
    expect(view.status).toBe("active");
    expect(Object.keys(view)).not.toContain("apiKeyEnc");
  });

  test("throws on a value outside the known set", () => {
    expect(() => toConnectionView({ ...row, provider: "zoom" })).toThrow(
      EIdentityMessages.UNKNOWN_CONNECTION_VALUE,
    );
  });
});
