import { describe, expect, test } from "bun:test";

import { ACTIVITY_KIND_LABELS, SOURCE_LABELS } from "@/api/activity/activity.constants";
import { EActivityKind, ESource } from "@/api/activity/activity.enums";
import {
  formatActivityTime,
  kindLabel,
  sourceLabel,
} from "@/features/activity/components/ActivityTable/ActivityTable.helpers";
import { dayjs } from "@/shared/date/date.helpers";

describe("formatActivityTime", () => {
  test("formats the time in the local zone", () => {
    const occurredAt = "2026-10-17T09:05:00.000Z";
    expect(formatActivityTime(occurredAt)).toBe(dayjs(occurredAt).format("MMM D, HH:mm"));
  });
});

describe("sourceLabel", () => {
  test("returns the label of a known Source", () => {
    expect(sourceLabel(ESource.CALENDAR)).toBe(SOURCE_LABELS[ESource.CALENDAR]);
  });

  test("returns an unknown value as it is", () => {
    expect(sourceLabel("fax")).toBe("fax");
  });
});

describe("kindLabel", () => {
  test("returns the label of a known kind", () => {
    expect(kindLabel(EActivityKind.CALENDAR_EVENT)).toBe(
      ACTIVITY_KIND_LABELS[EActivityKind.CALENDAR_EVENT],
    );
  });

  test("returns an unknown value as it is", () => {
    expect(kindLabel("telegram")).toBe("telegram");
  });
});
