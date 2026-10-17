import { describe, expect, test } from "bun:test";

import { DIGEST_REFETCH_MARGIN_MS } from "@/api/digest/digest.constants";
import { listTimeZones, msUntilNextRun } from "@/api/digest/digest.helpers";
import { dayjs } from "@/shared/date/date.helpers";

describe("listTimeZones", () => {
  test("holds the default zone once and UTC", () => {
    const zones = listTimeZones();

    expect(zones.filter((zone) => zone === "Asia/Dhaka")).toHaveLength(1);
    expect(zones).toContain("UTC");
  });
});

describe("msUntilNextRun", () => {
  const now = dayjs("2026-10-19T01:00:00.000Z");
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
