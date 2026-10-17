import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";

import { treaty } from "@elysia/eden";
import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { createApp } from "#api/app";
import {
  DEFAULT_DIGEST_TIME_ZONE,
  DIGEST_RUN_HOUR,
  SATURDAY,
  SUNDAY,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages, EDigestStatus } from "#api/modules/digest/digest.enums";
import { DigestService } from "#api/modules/digest/digest.service";
import type { IDigestWorkflowParams } from "#api/shared/bindings/bindings.interfaces";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import {
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  HTTP_UNPROCESSABLE,
} from "#api-tests/fixtures/fixtures.constants";
import {
  installFakeDigestWorkflow,
  seedGoogleConnection,
  signUpTestUser,
  uniqueEmail,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const NEW_YORK = "America/New_York";

const api = treaty(createApp(), { parseDate: false });

let owner: Awaited<ReturnType<typeof signUpTestUser>>;

function authed() {
  return { headers: { cookie: owner.cookie } };
}

let created: IDigestWorkflowParams[];
let restoreWorkflow: () => void;

beforeEach(async () => {
  await wipeDatabase();
  owner = await signUpTestUser(uniqueEmail());
  ({ created, restore: restoreWorkflow } = installFakeDigestWorkflow());
});

afterEach(() => {
  restoreWorkflow();
});

afterAll(wipeDatabase);

describe("GET /digest-settings", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api["digest-settings"].get();

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("returns the default time zone and its next run when no row exists", async () => {
    const { data, status } = await api["digest-settings"].get(authed());

    expect(status).toBe(HTTP_OK);
    expect(data?.timeZone).toBe(DEFAULT_DIGEST_TIME_ZONE);
    const nextRun = dayjs(data?.nextRunAt).tz(DEFAULT_DIGEST_TIME_ZONE);
    expect(nextRun.isAfter(dayjs())).toBe(true);
    expect(nextRun.hour()).toBe(DIGEST_RUN_HOUR);
    expect(nextRun.minute()).toBe(0);
    expect([SATURDAY, SUNDAY]).not.toContain(nextRun.day());
  });
});

describe("PUT /digest-settings", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api["digest-settings"].put({ timeZone: NEW_YORK });

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("saves a valid time zone and keeps it on the next read", async () => {
    const put = await api["digest-settings"].put({ timeZone: NEW_YORK }, authed());
    const get = await api["digest-settings"].get(authed());

    expect(put.status).toBe(HTTP_OK);
    expect(put.data?.timeZone).toBe(NEW_YORK);
    expect(get.data?.timeZone).toBe(NEW_YORK);
    expect(get.data?.nextRunAt).toBe(put.data?.nextRunAt);
  });

  test("changes the time zone of an existing row", async () => {
    await api["digest-settings"].put({ timeZone: NEW_YORK }, authed());
    await api["digest-settings"].put({ timeZone: "Europe/Paris" }, authed());

    const { data } = await api["digest-settings"].get(authed());

    expect(data?.timeZone).toBe("Europe/Paris");
  });

  test("rejects a time zone that is not in the IANA list", async () => {
    const { error, status } = await api["digest-settings"].put(
      { timeZone: "Mars/Olympus" },
      authed(),
    );

    expect(status).toBe(HTTP_BAD_REQUEST);
    expect(error?.value).toEqual({ message: EDigestMessages.TIME_ZONE_INVALID });
  });

  test("rejects an empty time zone", async () => {
    const { status } = await api["digest-settings"].put({ timeZone: "" }, authed());

    expect(status).toBe(HTTP_UNPROCESSABLE);
  });

  test("keeps each user's time zone apart", async () => {
    const other = await signUpTestUser(uniqueEmail());
    await api["digest-settings"].put({ timeZone: NEW_YORK }, authed());

    const { data } = await api["digest-settings"].get({ headers: { cookie: other.cookie } });

    expect(data?.timeZone).toBe(DEFAULT_DIGEST_TIME_ZONE);
  });
});

const READY_CONTENT = {
  nothingNew: false,
  truncated: false,
  sections: [
    {
      identityId: "identity-1",
      identityEmail: "work@employer.example",
      highlights: [{ text: "Budget thread opened", activityIds: ["activity-1"] }],
      meetingsAhead: [],
      needsYou: [],
    },
  ],
};

async function seedDigest(userId: string, digestDate: string, status: EDigestStatus) {
  const now = dayjs().toISOString();
  await db.insert(schema.digest).values({
    id: `digest-${userId}-${digestDate}`,
    userId,
    digestDate,
    windowStart: "2026-10-13T02:00:00.000Z",
    windowEnd: "2026-10-14T02:00:00.000Z",
    status,
    content: JSON.stringify(READY_CONTENT),
    missingSources: JSON.stringify([
      {
        connectionId: "connection-1",
        identityEmail: "work@employer.example",
        provider: "google",
        sources: ["calendar"],
      },
    ]),
    model: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe("GET /digests", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api.digests.get();

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("lists the dates that have a Digest, newest first, with today's local date", async () => {
    await seedDigest(owner.userId, "2026-10-13", EDigestStatus.READY);
    await seedDigest(owner.userId, "2026-10-14", EDigestStatus.FAILED);

    const { data, status } = await api.digests.get(authed());

    expect(status).toBe(HTTP_OK);
    expect(data?.dates).toEqual(["2026-10-14", "2026-10-13"]);
    expect(data?.today).toBe(dayjs().tz(DEFAULT_DIGEST_TIME_ZONE).format("YYYY-MM-DD"));
  });

  test("does not list another user's Digests", async () => {
    const other = await signUpTestUser(uniqueEmail());
    await seedDigest(other.userId, "2026-10-13", EDigestStatus.READY);

    const { data } = await api.digests.get(authed());

    expect(data?.dates).toEqual([]);
  });
});

describe("GET /digests/:date", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api.digests({ date: "2026-10-13" }).get();

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("returns a ready Digest with its sections and missing Sources", async () => {
    await seedDigest(owner.userId, "2026-10-13", EDigestStatus.READY);

    const { data, status } = await api.digests({ date: "2026-10-13" }).get(authed());

    expect(status).toBe(HTTP_OK);
    expect(data?.status).toBe(EDigestStatus.READY);
    expect(data?.content).toEqual(READY_CONTENT);
    expect(data?.missingSources.map((entry) => entry.connectionId)).toEqual(["connection-1"]);
  });

  test("returns a failed Digest", async () => {
    await seedDigest(owner.userId, "2026-10-13", EDigestStatus.FAILED);

    const { data } = await api.digests({ date: "2026-10-13" }).get(authed());

    expect(data?.status).toBe(EDigestStatus.FAILED);
  });

  test("answers 404 with the enum message for a date without a Digest", async () => {
    const { error, status } = await api.digests({ date: "2026-10-13" }).get(authed());

    expect(status).toBe(HTTP_NOT_FOUND);
    expect(error?.value).toEqual({ message: EDigestMessages.DIGEST_NOT_FOUND });
  });

  test("answers 404 for another user's Digest", async () => {
    const other = await signUpTestUser(uniqueEmail());
    await seedDigest(other.userId, "2026-10-13", EDigestStatus.READY);

    const { status } = await api.digests({ date: "2026-10-13" }).get(authed());

    expect(status).toBe(HTTP_NOT_FOUND);
  });

  test("rejects a date in the wrong format", async () => {
    const { status } = await api.digests({ date: "13-10-2026" }).get(authed());

    expect(status).toBe(HTTP_UNPROCESSABLE);
  });
});

describe("POST /digests/regenerate", () => {
  test("rejects a caller without a session", async () => {
    const { status } = await api.digests.regenerate.post();

    expect(status).toBe(HTTP_UNAUTHORIZED);
  });

  test("starts a Workflow and returns today's Digest as pending", async () => {
    await seedGoogleConnection(owner.userId);

    const { data, status } = await api.digests.regenerate.post(undefined, authed());

    expect(status).toBe(HTTP_OK);
    expect(data?.status).toBe(EDigestStatus.PENDING);
    expect(created).toEqual([{ userId: owner.userId, digestId: data?.id ?? "" }]);
  });

  test("replaces a ready Digest of today and keeps one row", async () => {
    const today = dayjs().tz(DEFAULT_DIGEST_TIME_ZONE).format("YYYY-MM-DD");
    await seedDigest(owner.userId, today, EDigestStatus.READY);

    const { data } = await api.digests.regenerate.post(undefined, authed());

    expect(data?.status).toBe(EDigestStatus.PENDING);
    expect(data?.content).toBeNull();
    const rows = await db
      .select()
      .from(schema.digest)
      .where(eq(schema.digest.userId, owner.userId));
    expect(rows).toHaveLength(1);
  });

  test.each([EDigestStatus.PENDING, EDigestStatus.RUNNING])(
    "answers 409 while today's Digest is %s",
    async (inProgress) => {
      const today = dayjs().tz(DEFAULT_DIGEST_TIME_ZONE).format("YYYY-MM-DD");
      await seedDigest(owner.userId, today, inProgress);

      const { error, status } = await api.digests.regenerate.post(undefined, authed());

      expect(status).toBe(HTTP_CONFLICT);
      expect(error?.value).toEqual({ message: EDigestMessages.DIGEST_IN_PROGRESS });
      expect(created).toEqual([]);
    },
  );

  test("allows a second run after the first one failed", async () => {
    const first = await api.digests.regenerate.post(undefined, authed());
    await DigestService.failDigest(first.data?.id ?? "", new Error("boom"));

    const second = await api.digests.regenerate.post(undefined, authed());

    expect(second.status).toBe(HTTP_OK);
    expect(second.data?.status).toBe(EDigestStatus.PENDING);
    expect(second.data?.id).not.toBe(first.data?.id);
  });
});
