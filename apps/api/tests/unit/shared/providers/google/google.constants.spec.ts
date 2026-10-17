import { expect, test } from "bun:test";

import {
  GOOGLE_CALENDAR_PAGE_SIZE,
  GOOGLE_DRIVE_PAGE_SIZE,
} from "#api/shared/providers/google/google.constants";

test("a Drive page is no larger than the page that the D1 statement bound counts", () => {
  expect(GOOGLE_DRIVE_PAGE_SIZE).toBeLessThanOrEqual(GOOGLE_CALENDAR_PAGE_SIZE);
});
