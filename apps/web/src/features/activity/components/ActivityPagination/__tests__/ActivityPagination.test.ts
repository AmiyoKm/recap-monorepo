import { describe, expect, test } from "bun:test";

import { totalLabel } from "@/features/activity/components/ActivityPagination/ActivityPagination.helpers";

describe("totalLabel", () => {
  test.each([
    [0, "Activities"],
    [1, "Activity"],
    [2, "Activities"],
  ])("labels a total of %i as %s", (total, label) => {
    expect(totalLabel(total)).toBe(label);
  });
});
