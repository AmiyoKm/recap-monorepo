import { describe, expect, test } from "bun:test";

import { isSupportedTimeZone, nextDigestRunAt } from "#api/modules/digest/digest.helpers";

describe("nextDigestRunAt", () => {
  test.each([
    {
      name: "Dhaka Wednesday before 8:00",
      now: "2026-10-14T01:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-14T02:00:00.000Z",
    },
    {
      name: "Dhaka Wednesday after 8:00",
      now: "2026-10-14T03:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-15T02:00:00.000Z",
    },
    {
      name: "exactly 8:00 goes to the next day",
      now: "2026-10-14T02:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-15T02:00:00.000Z",
    },
    {
      name: "Friday after 8:00 goes to Monday",
      now: "2026-10-16T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Saturday goes to Monday",
      now: "2026-10-17T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Sunday goes to Monday",
      now: "2026-10-18T05:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "Monday before 8:00 stays on Monday",
      now: "2026-10-18T20:00:00.000Z",
      zone: "Asia/Dhaka",
      expected: "2026-10-19T02:00:00.000Z",
    },
    {
      name: "UTC Thursday before 8:00",
      now: "2026-10-15T06:30:00.000Z",
      zone: "UTC",
      expected: "2026-10-15T08:00:00.000Z",
    },
    {
      name: "New York in daylight time",
      now: "2026-10-14T15:00:00.000Z",
      zone: "America/New_York",
      expected: "2026-10-15T12:00:00.000Z",
    },
    {
      name: "New York after the clocks change",
      now: "2026-11-05T15:00:00.000Z",
      zone: "America/New_York",
      expected: "2026-11-06T13:00:00.000Z",
    },
    {
      name: "Tokyo is already Friday while UTC is Thursday",
      now: "2026-10-15T20:00:00.000Z",
      zone: "Asia/Tokyo",
      expected: "2026-10-15T23:00:00.000Z",
    },
    {
      name: "Los Angeles Friday evening goes to Monday",
      now: "2026-10-17T02:00:00.000Z",
      zone: "America/Los_Angeles",
      expected: "2026-10-19T15:00:00.000Z",
    },
  ])("$name", ({ now, zone, expected }) => {
    expect(nextDigestRunAt(now, zone)).toBe(expected);
  });
});

describe("isSupportedTimeZone", () => {
  test.each([
    { zone: "Asia/Dhaka", expected: true },
    { zone: "UTC", expected: true },
    { zone: "America/New_York", expected: true },
    { zone: "Mars/Olympus", expected: false },
    { zone: "", expected: false },
    { zone: "asia/dhaka", expected: false },
  ])("$zone is $expected", ({ zone, expected }) => {
    expect(isSupportedTimeZone(zone)).toBe(expected);
  });
});
