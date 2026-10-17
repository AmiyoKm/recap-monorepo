import { describe, expect, test } from "bun:test";

import {
  GRANT_STATE_BYTES,
  PENDING_GRANT_TTL_SECONDS,
  PROVIDER_REGISTRY,
} from "#api/modules/identity/identity.constants";
import {
  EGrantPurpose,
  EIdentityCacheKeyPrefix,
  EIdentityMessages,
  EOAuthCallback,
} from "#api/modules/identity/identity.enums";
import {
  buildPendingGrantRow,
  connectionTokenKey,
  createGrantState,
  findProviderRegistration,
  grantCallback,
  hasCalendarScope,
  isUniqueViolation,
  parsePendingGrant,
  requireCodeVerifier,
  toConnectionView,
  toProvider,
} from "#api/modules/identity/identity.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { EProvider } from "#api/shared/providers/providers.enums";
import { ROUTES } from "#api/shared/routes/routes.constants";

const TEN_MINUTES_IN_SECONDS = 600;
const STATE_BYTES = 32;
const CLOCK_SLACK_SECONDS = 5;

describe("pending grants and cache keys", () => {
  test("builds connection token cache keys", () => {
    expect(connectionTokenKey("conn-1")).toBe("connection-token:conn-1");
    expect<string>(EIdentityCacheKeyPrefix.CONNECTION_TOKEN).toBe("connection-token:");
    expect(PENDING_GRANT_TTL_SECONDS).toBe(TEN_MINUTES_IN_SECONDS);
  });

  test("builds a pending grant row that expires after the grant TTL", () => {
    const grant = {
      userId: "user-1",
      purpose: EGrantPurpose.IDENTITY_CREATE,
      codeVerifier: "verifier",
    } as const;
    const row = buildPendingGrantRow("state-1", grant);
    expect(row.state).toBe("state-1");
    expect(JSON.parse(row.payload)).toEqual(grant);
    const ttl = dayjs(row.expiresAt).diff(dayjs(), "second");
    expect(ttl).toBeGreaterThan(TEN_MINUTES_IN_SECONDS - CLOCK_SLACK_SECONDS);
    expect(ttl).toBeLessThanOrEqual(TEN_MINUTES_IN_SECONDS);
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
      provider: EProvider.GOOGLE_CALENDAR,
      codeVerifier: "verifier-1",
    });
  });

  test("reads a connection grant without a code verifier", () => {
    const grant = parsePendingGrant(
      JSON.stringify({
        userId: "user-1",
        purpose: "connection",
        identityId: "identity-1",
        provider: "jira",
        codeVerifier: null,
      }),
    );
    expect(grant).toEqual({
      userId: "user-1",
      purpose: EGrantPurpose.CONNECTION,
      identityId: "identity-1",
      provider: EProvider.JIRA,
      codeVerifier: null,
    });
  });

  test("rejects a connection grant for an unknown provider", () => {
    const grant = parsePendingGrant(
      JSON.stringify({
        userId: "user-1",
        purpose: "connection",
        identityId: "identity-1",
        provider: "zoom",
        codeVerifier: null,
      }),
    );
    expect(grant).toBeNull();
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
  const d1Message =
    "D1_ERROR: UNIQUE constraint failed: identity.user_id, identity.google_sub: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE)";

  test("detects a drizzle-wrapped D1 unique violation", () => {
    const error = new Error("Failed query: insert into identity", {
      cause: new Error(d1Message),
    });
    expect(isUniqueViolation(error)).toBe(true);
  });

  test("detects a D1 batch unique violation", () => {
    expect(isUniqueViolation(new Error(d1Message))).toBe(true);
  });

  test("rejects other failures", () => {
    const foreignKey = new Error(
      "D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_FOREIGNKEY)",
    );
    expect(isUniqueViolation(new Error("Failed query", { cause: foreignKey }))).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(d1Message)).toBe(false);
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
    providerSite: "acme.atlassian.net",
    providerResourceId: null,
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

describe("toProvider", () => {
  test("maps known provider names and rejects others", () => {
    expect(toProvider("linear")).toBe(EProvider.LINEAR);
    expect(toProvider("zoom")).toBeUndefined();
  });
});

describe("grantCallback", () => {
  test.each([
    { provider: EProvider.GOOGLE_CALENDAR, callback: EOAuthCallback.GOOGLE },
    { provider: EProvider.JIRA, callback: EOAuthCallback.JIRA },
    { provider: EProvider.LINEAR, callback: EOAuthCallback.LINEAR },
    { provider: EProvider.SLACK, callback: null },
  ])("routes a $provider connection grant to its callback", ({ provider, callback }) => {
    expect(
      grantCallback({
        userId: "user-1",
        purpose: EGrantPurpose.CONNECTION,
        identityId: "identity-1",
        provider,
        codeVerifier: null,
      }),
    ).toBe(callback);
  });

  test("routes an identity-create grant to the google callback", () => {
    expect(
      grantCallback({
        userId: "user-1",
        purpose: EGrantPurpose.IDENTITY_CREATE,
        codeVerifier: "v",
      }),
    ).toBe(EOAuthCallback.GOOGLE);
  });
});

describe("requireCodeVerifier", () => {
  test("returns a stored verifier and throws on a missing one", () => {
    expect(requireCodeVerifier("verifier-1")).toBe("verifier-1");
    expect(() => requireCodeVerifier(null)).toThrow(EIdentityMessages.CODE_VERIFIER_MISSING);
  });
});

describe("hasCalendarScope", () => {
  test("requires the calendar read scope", () => {
    expect(hasCalendarScope(["openid", ROUTES.GOOGLE.CALENDAR_READONLY_SCOPE])).toBe(true);
    expect(hasCalendarScope(["openid", "email"])).toBe(false);
  });
});
