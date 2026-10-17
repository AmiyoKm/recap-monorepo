import { describe, expect, test } from "bun:test";

import { listTimeZones } from "@/api/digest/digest.helpers";

describe("listTimeZones", () => {
  test("holds the default zone once and UTC", () => {
    const zones = listTimeZones();

    expect(zones.filter((zone) => zone === "Asia/Dhaka")).toHaveLength(1);
    expect(zones).toContain("UTC");
  });
});
