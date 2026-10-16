import { beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { schema } from "@recap/db";

import { IdentityRepository } from "#api/modules/identity/identity.repository";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { createUser, uniqueEmail, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";
import type { IIdentityWithUser } from "#api-tests/unit/identity/identity.interfaces";

function identityValues(userId: string, googleSub: string) {
  const now = dayjs().toISOString();
  return {
    id: randomUUID(),
    userId,
    googleSub,
    email: "work@employer.example",
    displayName: "Work User",
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

function connectionValues(identityId: string, provider: string) {
  const now = dayjs().toISOString();
  return {
    id: randomUUID(),
    identityId,
    provider,
    authKind: "oauth",
    status: "active",
    scopes: "openid email",
    refreshTokenEnc: "enc-refresh",
    apiKeyEnc: null,
    accessTokenExpiresAt: null,
    providerAccountId: "google-sub",
    providerAccountEmail: "work@employer.example",
    createdAt: now,
    updatedAt: now,
  };
}

async function insertIdentityWithUser(googleSub: string): Promise<IIdentityWithUser> {
  const userId = await createUser(uniqueEmail());
  const values = identityValues(userId, googleSub);
  await IdentityRepository.insertIdentity(values);
  return { userId, identityId: values.id };
}

beforeEach(wipeDatabase);

describe("identity rows", () => {
  test("inserts and finds an owned identity", async () => {
    const { userId, identityId } = await insertIdentityWithUser(`sub-owned-${randomUUID()}`);

    const found = await IdentityRepository.findOwnedIdentity(userId, identityId);
    expect(found?.id).toBe(identityId);
    expect(found?.email).toBe("work@employer.example");
  });

  test("hides identities owned by another user", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-hidden-${randomUUID()}`);
    const stranger = await createUser(uniqueEmail());

    expect(await IdentityRepository.findOwnedIdentity(stranger, identityId)).toBeUndefined();
  });

  test("scopes google sub lookups per user", async () => {
    const sub = `sub-shared-${randomUUID()}`;
    const first = await createUser(uniqueEmail());
    const second = await createUser(uniqueEmail());
    await IdentityRepository.insertIdentity(identityValues(first, sub));
    await IdentityRepository.insertIdentity(identityValues(second, sub));

    expect((await IdentityRepository.findIdentityBySub(first, sub))?.userId).toBe(first);
    expect((await IdentityRepository.findIdentityBySub(second, sub))?.userId).toBe(second);
    expect(
      await IdentityRepository.findIdentityBySub(first, `missing-${randomUUID()}`),
    ).toBeUndefined();
  });

  test("rejects a duplicate sub for the same user", async () => {
    const sub = `sub-dup-${randomUUID()}`;
    const userId = await createUser(uniqueEmail());
    await IdentityRepository.insertIdentity(identityValues(userId, sub));

    expect(await IdentityRepository.insertIdentity(identityValues(userId, sub))).toBe(false);
  });

  test("lists only the caller's identities", async () => {
    const first = await createUser(uniqueEmail());
    const second = await createUser(uniqueEmail());
    await IdentityRepository.insertIdentity(identityValues(first, `sub-list-a-${randomUUID()}`));
    await IdentityRepository.insertIdentity(identityValues(second, `sub-list-b-${randomUUID()}`));

    const rows = await IdentityRepository.listIdentities(first);
    expect(rows.length).toBe(1);
    expect(rows[0]?.userId).toBe(first);
    expect(await IdentityRepository.listIdentities(await createUser(uniqueEmail()))).toEqual([]);
  });
});

describe("connection rows", () => {
  test("inserts and finds a connection by identity and provider", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-${randomUUID()}`);
    const values = connectionValues(identityId, "google-calendar");
    await IdentityRepository.replaceConnection(values);

    const found = await IdentityRepository.findConnection(identityId, "google-calendar");
    expect(found?.id).toBe(values.id);
    expect(await IdentityRepository.findConnection(identityId, "jira")).toBeUndefined();
  });

  test("rejects a duplicate provider under the same identity", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-dup-${randomUUID()}`);
    await IdentityRepository.replaceConnection(connectionValues(identityId, "jira"));

    expect(await IdentityRepository.replaceConnection(connectionValues(identityId, "jira"))).toBe(
      false,
    );
  });

  test("replaces a stale connection with the new row", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-replace-${randomUUID()}`);
    const stale = connectionValues(identityId, "jira");
    const fresh = connectionValues(identityId, "jira");
    await IdentityRepository.replaceConnection(stale);

    expect(await IdentityRepository.replaceConnection(fresh, stale.id)).toBe(true);
    expect((await IdentityRepository.findConnection(identityId, "jira"))?.id).toBe(fresh.id);
  });

  test("keeps the stale connection when the new row conflicts", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-keep-${randomUUID()}`);
    const stale = connectionValues(identityId, "jira");
    const other = connectionValues(identityId, "linear");
    await IdentityRepository.replaceConnection(stale);
    await IdentityRepository.replaceConnection(other);

    const conflicting = connectionValues(identityId, "linear");
    expect(await IdentityRepository.replaceConnection(conflicting, stale.id)).toBe(false);
    expect((await IdentityRepository.findConnection(identityId, "jira"))?.id).toBe(stale.id);
  });

  test("allows the same provider under another identity", async () => {
    const first = await insertIdentityWithUser(`sub-conn-multi-a-${randomUUID()}`);
    const second = await insertIdentityWithUser(`sub-conn-multi-b-${randomUUID()}`);
    await IdentityRepository.replaceConnection(connectionValues(first.identityId, "linear"));
    await IdentityRepository.replaceConnection(connectionValues(second.identityId, "linear"));

    expect(
      await IdentityRepository.listConnections([first.identityId, second.identityId]),
    ).toHaveLength(2);
  });

  test("lists connection ids for an identity", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-ids-${randomUUID()}`);
    const first = connectionValues(identityId, "jira");
    const second = connectionValues(identityId, "linear");
    await IdentityRepository.replaceConnection(first);
    await IdentityRepository.replaceConnection(second);

    expect(await IdentityRepository.connectionIdsForIdentity(identityId)).toEqual([
      first.id,
      second.id,
    ]);
    expect(await IdentityRepository.connectionIdsForIdentity(randomUUID())).toEqual([]);
  });

  test("resolves the owning user for a connection", async () => {
    const { userId, identityId } = await insertIdentityWithUser(`sub-owner-${randomUUID()}`);
    const values = connectionValues(identityId, "jira");
    await IdentityRepository.replaceConnection(values);

    expect(await IdentityRepository.findConnectionOwner(values.id)).toEqual({
      connectionId: values.id,
      userId,
    });
    expect(await IdentityRepository.findConnectionOwner(randomUUID())).toBeUndefined();
  });

  test("deletes a connection row", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-del-conn-${randomUUID()}`);
    const values = connectionValues(identityId, "jira");
    await IdentityRepository.replaceConnection(values);

    await IdentityRepository.deleteConnectionRow(values.id);
    expect(await IdentityRepository.findConnection(identityId, "jira")).toBeUndefined();
  });

  test("cascades connections when the identity row is deleted", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-cascade-${randomUUID()}`);
    await IdentityRepository.replaceConnection(connectionValues(identityId, "jira"));

    await IdentityRepository.deleteIdentityRow(identityId);
    expect(await db.select().from(schema.connection)).toEqual([]);
  });
});

describe("pending grants", () => {
  function grantValues(expiresAt: string) {
    return { state: randomUUID(), payload: "{}", expiresAt };
  }

  test("takes a live grant only once", async () => {
    const grant = grantValues(dayjs().add(1, "minute").toISOString());
    await IdentityRepository.storePendingGrant(grant);
    const now = dayjs().toISOString();

    expect(await IdentityRepository.takePendingGrant({ state: grant.state, now })).toBe("{}");
    expect(await IdentityRepository.takePendingGrant({ state: grant.state, now })).toBeUndefined();
  });

  test("does not take an expired grant", async () => {
    const grant = grantValues(dayjs().subtract(1, "minute").toISOString());
    await IdentityRepository.storePendingGrant(grant);

    expect(
      await IdentityRepository.takePendingGrant({ state: grant.state, now: dayjs().toISOString() }),
    ).toBeUndefined();
  });

  test("deletes only expired grants", async () => {
    const expired = grantValues(dayjs().subtract(1, "minute").toISOString());
    const live = grantValues(dayjs().add(1, "minute").toISOString());
    await IdentityRepository.storePendingGrant(expired);
    await IdentityRepository.storePendingGrant(live);

    await IdentityRepository.deleteExpiredPendingGrants(dayjs().toISOString());

    const states = (await db.select().from(schema.pendingGrant)).map((row) => row.state);
    expect(states).toEqual([live.state]);
  });
});
