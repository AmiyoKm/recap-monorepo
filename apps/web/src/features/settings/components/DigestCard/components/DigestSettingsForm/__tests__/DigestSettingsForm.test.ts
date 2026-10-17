import { describe, expect, test } from "bun:test";

import { formatNextRun } from "@/features/settings/components/DigestCard/components/DigestSettingsForm/DigestSettingsForm.helpers";

describe("formatNextRun", () => {
  test.each([
    {
      zone: "Asia/Dhaka",
      at: "2026-10-19T02:00:00.000Z",
      expected: "Monday, 19 October 2026 at 08:00",
    },
    {
      zone: "America/New_York",
      at: "2026-10-15T12:00:00.000Z",
      expected: "Thursday, 15 October 2026 at 08:00",
    },
    {
      zone: "Asia/Tokyo",
      at: "2026-10-15T23:00:00.000Z",
      expected: "Friday, 16 October 2026 at 08:00",
    },
  ])("shows $at in $zone", ({ at, zone, expected }) => {
    expect(formatNextRun(at, zone)).toBe(expected);
  });
});
