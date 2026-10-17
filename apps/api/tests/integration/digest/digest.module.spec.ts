import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { treaty } from "@elysia/eden";

import { createApp } from "#api/app";
import {
  DEFAULT_DIGEST_TIME_ZONE,
  DIGEST_RUN_HOUR,
  SATURDAY,
  SUNDAY,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages } from "#api/modules/digest/digest.enums";
import { dayjs } from "#api/shared/date/date.helpers";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  HTTP_UNPROCESSABLE,
} from "#api-tests/fixtures/fixtures.constants";
import { signUpTestUser, uniqueEmail, wipeDatabase } from "#api-tests/fixtures/fixtures.helpers";

const NEW_YORK = "America/New_York";

const api = treaty(createApp(), { parseDate: false });

let owner: Awaited<ReturnType<typeof signUpTestUser>>;

function authed() {
  return { headers: { cookie: owner.cookie } };
}

beforeEach(async () => {
  await wipeDatabase();
  owner = await signUpTestUser(uniqueEmail());
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
