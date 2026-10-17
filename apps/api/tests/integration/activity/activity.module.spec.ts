import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { treaty } from "@elysia/eden";

import { schema } from "@recap/db";

import { createApp } from "#api/app";
import { ACTIVITY_PAGE_SIZE_DEFAULT } from "#api/modules/activity/activity.constants";
import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";
import type { TActivityInsert } from "#api/modules/activity/activity.types";
import { db } from "#api/shared/db/db.client";
import { HTTP_OK, HTTP_UNAUTHORIZED } from "#api-tests/fixtures/fixtures.constants";
import {
  seedGoogleConnection,
  signUpTestUser,
  uniqueEmail,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const PAGE_TEST_ROWS = 30;
const SMALL_PAGE_SIZE = 10;
const NOT_A_PAGE = 0;
const THIRD_PAGE = 3;
const IN_RANGE_ROWS = 3;

const api = treaty(createApp(), { parseDate: false });

let owner: Awaited<ReturnType<typeof signUpTestUser>>;
let mine: Awaited<ReturnType<typeof seedGoogleConnection>>;

function row(overrides: Partial<TActivityInsert>): TActivityInsert {
  return {
    id: randomUUID(),
    identityId: mine.identityId,
    connectionId: mine.connectionId,
    source: ESource.CALENDAR,
    kind: EActivityKind.CALENDAR_EVENT,
    externalId: randomUUID(),
    occurredAt: "2026-10-16T09:00:00.000Z",
    endsAt: null,
    title: "Planning",
    url: "https://www.google.com/calendar/event?eid=1&authuser=work%40employer.example",
    actor: "boss@employer.example",
    detail: null,
    createdAt: "2026-10-17T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
    ...overrides,
  };
}

async function insertRows(rows: TActivityInsert[]): Promise<void> {
  await Promise.all(rows.map((entry) => db.insert(schema.activity).values(entry)));
}

function authed() {
  return { headers: { cookie: owner.cookie } };
}

beforeEach(async () => {
  await wipeDatabase();
  owner = await signUpTestUser(uniqueEmail());
  mine = await seedGoogleConnection(owner.userId);
});

afterAll(wipeDatabase);

describe("GET /activities", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api.activities.get({ query: {} });

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("lists the newest Activity first with the identity email", async () => {
    await db
      .insert(schema.activity)
      .values([
        row({ title: "Older", occurredAt: "2026-10-15T09:00:00.000Z" }),
        row({ title: "Newer", occurredAt: "2026-10-16T09:00:00.000Z" }),
      ]);

    const { data, status } = await api.activities.get({ query: {}, ...authed() });

    expect(status).toBe(HTTP_OK);
    expect(data?.rows.map((entry) => entry.title)).toEqual(["Newer", "Older"]);
    expect(data?.total).toBe(2);
    expect(data?.pageSize).toBe(ACTIVITY_PAGE_SIZE_DEFAULT);
    expect(data?.rows[0]?.identityEmail).toBe("work@employer.example");
  });

  test("only shows Activities of the caller's Work Identities", async () => {
    const stranger = await signUpTestUser(uniqueEmail());
    const theirs = await seedGoogleConnection(stranger.userId);
    await db.insert(schema.activity).values([
      row({ title: "Mine" }),
      row({
        title: "Theirs",
        identityId: theirs.identityId,
        connectionId: theirs.connectionId,
      }),
    ]);

    const { data } = await api.activities.get({ query: {}, ...authed() });

    expect(data?.rows.map((entry) => entry.title)).toEqual(["Mine"]);
    expect(data?.total).toBe(1);
  });

  test("filters by date range, Source, kind and Work Identity", async () => {
    const other = await seedGoogleConnection(owner.userId);
    await db.insert(schema.activity).values([
      row({ title: "In range", occurredAt: "2026-10-16T09:00:00.000Z" }),
      row({ title: "Too early", occurredAt: "2026-10-01T09:00:00.000Z" }),
      row({ title: "Mail", source: ESource.GMAIL, kind: EActivityKind.EMAIL_SENT }),
      row({
        title: "Other identity",
        identityId: other.identityId,
        connectionId: other.connectionId,
      }),
    ]);

    const range = await api.activities.get({
      query: { from: "2026-10-10T00:00:00.000Z", to: "2026-10-17T00:00:00.000Z" },
      ...authed(),
    });
    const bySource = await api.activities.get({
      query: { source: [ESource.GMAIL] },
      ...authed(),
    });
    const byKind = await api.activities.get({
      query: { kind: [EActivityKind.EMAIL_SENT, EActivityKind.EMAIL_RECEIVED] },
      ...authed(),
    });
    const byIdentity = await api.activities.get({
      query: { identityId: [other.identityId] },
      ...authed(),
    });

    expect(range.data?.rows.map((entry) => entry.title)).not.toContain("Too early");
    expect(range.data?.total).toBe(IN_RANGE_ROWS);
    expect(bySource.data?.rows.map((entry) => entry.title)).toEqual(["Mail"]);
    expect(byKind.data?.rows.map((entry) => entry.title)).toEqual(["Mail"]);
    expect(byIdentity.data?.rows.map((entry) => entry.title)).toEqual(["Other identity"]);
  });

  test("searches title, actor and detail, and treats wildcards as text", async () => {
    await db
      .insert(schema.activity)
      .values([
        row({ title: "Budget review" }),
        row({ title: "Standup", actor: "finance@employer.example" }),
        row({ title: "Offsite", detail: "Room 5" }),
        row({ title: "100% done" }),
        row({ title: "Plain" }),
      ]);

    const titles = async (q: string) => {
      const { data } = await api.activities.get({ query: { q }, ...authed() });
      return data?.rows.map((entry) => entry.title).sort();
    };

    expect(await titles("budget")).toEqual(["Budget review"]);
    expect(await titles("FINANCE")).toEqual(["Standup"]);
    expect(await titles("room")).toEqual(["Offsite"]);
    expect(await titles("%")).toEqual(["100% done"]);
    expect(await titles("nothing matches")).toEqual([]);
  });

  test("pages on the server and reports the total", async () => {
    const rows = Array.from({ length: PAGE_TEST_ROWS }, (_, index) =>
      row({
        title: `Row ${index}`,
        occurredAt: `2026-10-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
      }),
    );
    await insertRows(rows);

    const first = await api.activities.get({ query: { pageSize: SMALL_PAGE_SIZE }, ...authed() });
    const last = await api.activities.get({
      query: { pageSize: SMALL_PAGE_SIZE, page: THIRD_PAGE },
      ...authed(),
    });

    expect(first.data?.rows.length).toBe(SMALL_PAGE_SIZE);
    expect(first.data?.total).toBe(PAGE_TEST_ROWS);
    expect(last.data?.rows.length).toBe(SMALL_PAGE_SIZE);
    expect(first.data?.rows[0]?.title).not.toBe(last.data?.rows[0]?.title);
  });

  test("rejects a page below one", async () => {
    const { status } = await api.activities.get({ query: { page: NOT_A_PAGE }, ...authed() });

    expect(status).not.toBe(HTTP_OK);
  });
});
