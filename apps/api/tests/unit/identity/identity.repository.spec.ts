import { beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

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
    status: "active",
    scopes: "openid email",
    refreshTokenEnc: "enc-refresh",
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
    const values = connectionValues(identityId, "google");
    await IdentityRepository.replaceConnection(values);

    const found = await IdentityRepository.findConnection(identityId, "google");
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

  test("reconnects a stale connection in place and keeps its id and cursor", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-replace-${randomUUID()}`);
    const stale = connectionValues(identityId, "jira");
    await IdentityRepository.replaceConnection({ ...stale, pullCursor: "cursor-1" });
    await db
      .update(schema.connection)
      .set({ status: "needs_reconnect", lastPullError: "rejected" })
      .where(eq(schema.connection.id, stale.id));
    const fresh = { ...connectionValues(identityId, "jira"), id: stale.id, refreshTokenEnc: "new" };

    expect(await IdentityRepository.replaceConnection(fresh, stale.id)).toBe(true);

    const row = await IdentityRepository.findConnection(identityId, "jira");
    expect(row?.id).toBe(stale.id);
    expect(row?.refreshTokenEnc).toBe("new");
    expect(row?.status).toBe("active");
    expect(row?.lastPullError).toBeNull();
    expect(row?.pullCursor).toBe("cursor-1");
  });

  test("keeps the Activities of a reconnected connection", async () => {
    const { identityId } = await insertIdentityWithUser(`sub-conn-act-${randomUUID()}`);
    const stale = connectionValues(identityId, "google");
    await IdentityRepository.replaceConnection(stale);
    await db.insert(schema.activity).values({
      id: randomUUID(),
      identityId,
      connectionId: stale.id,
      source: "calendar",
      kind: "calendar_event",
      externalId: "event-1",
      occurredAt: dayjs().toISOString(),
      title: "Planning",
      url: "https://example.com/e",
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    });

    await IdentityRepository.replaceConnection(
      { ...connectionValues(identityId, "google"), id: stale.id },
      stale.id,
    );

    const rows = await db
      .select()
      .from(schema.activity)
      .where(eq(schema.activity.connectionId, stale.id));
    expect(rows.length).toBe(1);
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

  test("finds a connection only for its owning user", async () => {
    const { userId, identityId } = await insertIdentityWithUser(`sub-owner-${randomUUID()}`);
    const values = connectionValues(identityId, "jira");
    await IdentityRepository.replaceConnection(values);

    expect(await IdentityRepository.findOwnedConnection(userId, values.id)).toMatchObject({
      id: values.id,
      identityId,
      provider: "jira",
    });
    expect(await IdentityRepository.findOwnedConnection(randomUUID(), values.id)).toBeUndefined();
    expect(await IdentityRepository.findOwnedConnection(userId, randomUUID())).toBeUndefined();
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
