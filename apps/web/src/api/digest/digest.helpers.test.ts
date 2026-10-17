import { describe, expect, test } from "bun:test";

import {
  DIGEST_DAY_MARGIN_MS,
  DIGEST_POLL_MS,
  DIGEST_REFETCH_MARGIN_MS,
} from "@/api/digest/digest.constants";
import {
  detailRefetchInterval,
  isDigestInProgress,
  listRefetchInterval,
  listTimeZones,
  msUntilNextLocalDay,
  msUntilNextRun,
} from "@/api/digest/digest.helpers";
import { dayjs } from "@/shared/date/date.helpers";

const now = dayjs("2026-10-19T01:00:00.000Z");

describe("listTimeZones", () => {
  test("holds the default zone once and UTC", () => {
    const zones = listTimeZones();

    expect(zones.filter((zone) => zone === "Asia/Dhaka")).toHaveLength(1);
    expect(zones).toContain("UTC");
  });
});

describe("msUntilNextRun", () => {
  const inOneHour = now.add(1, "hour");

  test.each([
    ["an hour ahead", inOneHour.toISOString(), inOneHour.diff(now) + DIGEST_REFETCH_MARGIN_MS],
    ["already passed", "2026-10-19T00:00:00.000Z", DIGEST_REFETCH_MARGIN_MS],
  ])("waits until the run when it is %s", (_label, nextRunAt, expected) => {
    expect(msUntilNextRun(nextRunAt, now)).toBe(expected);
  });

  test("does not refetch without data", () => {
    expect(msUntilNextRun(undefined, now)).toBe(false);
  });
});

describe("isDigestInProgress", () => {
  test.each([
    ["pending", true],
    ["running", true],
    ["ready", false],
    ["failed", false],
    [undefined, false],
  ] as const)("is %p -> %p", (status, expected) => {
    expect(isDigestInProgress(status)).toBe(expected);
  });
});

describe("msUntilNextLocalDay", () => {
  test("waits until local midnight in the user's zone", () => {
    const evening = dayjs("2026-10-19T16:00:00.000Z");

    expect(msUntilNextLocalDay("Asia/Dhaka", evening)).toBe(
      dayjs("2026-10-19T18:00:00.000Z").diff(evening) + DIGEST_DAY_MARGIN_MS,
    );
  });
});

describe("detailRefetchInterval", () => {
  const nextRunAt = now.add(1, "hour").toISOString();

  test("polls while the Digest is in progress", () => {
    expect(detailRefetchInterval("running", nextRunAt, now)).toBe(DIGEST_POLL_MS);
  });

  test.each([["ready"], ["failed"], [undefined]] as const)(
    "waits for the next run when the status is %p",
    (status) => {
      expect(detailRefetchInterval(status, nextRunAt, now)).toBe(msUntilNextRun(nextRunAt, now));
    },
  );

  test("stops without a next run time", () => {
    expect(detailRefetchInterval("ready", undefined, now)).toBe(false);
  });
});

describe("listRefetchInterval", () => {
  test("refetches at the next run when it comes before local midnight", () => {
    const early = dayjs("2026-10-19T00:00:00.000Z");
    const nextRunAt = "2026-10-19T02:00:00.000Z";

    expect(listRefetchInterval({ nextRunAt, timeZone: "Asia/Dhaka" }, early)).toBe(
      msUntilNextRun(nextRunAt, early),
    );
  });

  test("refetches at local midnight when it comes before the next run", () => {
    const evening = dayjs("2026-10-19T16:00:00.000Z");
    const nextRunAt = "2026-10-20T02:00:00.000Z";

    expect(listRefetchInterval({ nextRunAt, timeZone: "Asia/Dhaka" }, evening)).toBe(
      msUntilNextLocalDay("Asia/Dhaka", evening),
    );
  });

  test("stops without settings", () => {
    expect(listRefetchInterval(undefined, now)).toBe(false);
  });
});
