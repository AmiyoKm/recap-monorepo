import { describe, expect, test } from "bun:test";

import {
  dayPartFor,
  firstName,
} from "@/features/dashboard/containers/DashboardContainer/DashboardContainer.helpers";
import { EDayPart } from "@/features/dashboard/dashboard.enums";

describe("dayPartFor", () => {
  test("splits the day at noon and six in the evening", () => {
    const midnight = 0;
    const lateMorning = 11;
    const noon = 12;
    const lateAfternoon = 17;
    const sixPm = 18;
    const lateNight = 23;
    expect(dayPartFor(midnight)).toBe(EDayPart.MORNING);
    expect(dayPartFor(lateMorning)).toBe(EDayPart.MORNING);
    expect(dayPartFor(noon)).toBe(EDayPart.AFTERNOON);
    expect(dayPartFor(lateAfternoon)).toBe(EDayPart.AFTERNOON);
    expect(dayPartFor(sixPm)).toBe(EDayPart.EVENING);
    expect(dayPartFor(lateNight)).toBe(EDayPart.EVENING);
  });
});

describe("firstName", () => {
  test("returns the first word of the name", () => {
    expect(firstName("Amiyo Kumar")).toBe("Amiyo");
    expect(firstName("  Ada  ")).toBe("Ada");
  });

  test("returns undefined for a missing or empty name", () => {
    expect(firstName(undefined)).toBeUndefined();
    expect(firstName("   ")).toBeUndefined();
  });
});
