import { describe, expect, test } from "bun:test";

import { EClientMessages } from "@/api/client/client.enums";
import { ApiError } from "@/api/client/client.helpers";
import { DIGEST_NOT_FOUND_STATUS } from "@/api/digest/digest.constants";
import { EDigestStatus } from "@/api/digest/digest.enums";
import type { TDigestData, TDigestError } from "@/api/digest/digest.types";
import { isDigestDateDisabled } from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.helpers";
import { describeMissingSource } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources/DigestMissingSources.helpers";
import { EDigestView } from "@/features/dashboard/components/DigestPanel/DigestPanel.enums";
import {
  digestView,
  isRegenerateDisabled,
} from "@/features/dashboard/components/DigestPanel/DigestPanel.helpers";
import { dayjs } from "@/shared/date/date.helpers";

function digestWith(status: TDigestData["status"]): TDigestData {
  return {
    id: "digest-1",
    digestDate: "2026-10-14",
    status,
    windowStart: "2026-10-13T02:00:00.000Z",
    windowEnd: "2026-10-14T02:00:00.000Z",
    content: null,
    missingSources: [],
    error: null,
    updatedAt: "2026-10-14T02:00:00.000Z",
  };
}

const NOT_FOUND = new ApiError<TDigestError>(
  DIGEST_NOT_FOUND_STATUS,
  EClientMessages.REQUEST_FAILED,
);

describe("digestView", () => {
  test.each([
    {
      name: "loading while a query is pending",
      input: { isPending: true, isListError: false, error: null, digest: undefined },
      view: EDigestView.LOADING,
    },
    {
      name: "an error when the date list fails",
      input: { isPending: false, isListError: true, error: null, digest: undefined },
      view: EDigestView.ERROR,
    },
    {
      name: "not found for a date with no Digest",
      input: { isPending: false, isListError: false, error: NOT_FOUND, digest: undefined },
      view: EDigestView.NOT_FOUND,
    },
    {
      name: "in progress while pending",
      input: {
        isPending: false,
        isListError: false,
        error: null,
        digest: digestWith(EDigestStatus.PENDING),
      },
      view: EDigestView.IN_PROGRESS,
    },
    {
      name: "in progress while running",
      input: {
        isPending: false,
        isListError: false,
        error: null,
        digest: digestWith(EDigestStatus.RUNNING),
      },
      view: EDigestView.IN_PROGRESS,
    },
    {
      name: "failed",
      input: {
        isPending: false,
        isListError: false,
        error: null,
        digest: digestWith(EDigestStatus.FAILED),
      },
      view: EDigestView.FAILED,
    },
    {
      name: "ready",
      input: {
        isPending: false,
        isListError: false,
        error: null,
        digest: digestWith(EDigestStatus.READY),
      },
      view: EDigestView.READY,
    },
  ])("is $name", ({ input, view }) => {
    expect(digestView(input)).toBe(view);
  });
});

describe("isRegenerateDisabled", () => {
  test.each([
    [EDigestView.READY, false, false],
    [EDigestView.FAILED, false, false],
    [EDigestView.NOT_FOUND, false, false],
    [EDigestView.IN_PROGRESS, false, true],
    [EDigestView.LOADING, false, true],
    [EDigestView.READY, true, true],
  ])("for %s with regenerating %p is %p", (view, isRegenerating, expected) => {
    expect(isRegenerateDisabled(view, isRegenerating)).toBe(expected);
  });
});

describe("isDigestDateDisabled", () => {
  test("enables only dates that have a Digest", () => {
    const dates = ["2026-10-14"];

    expect(isDigestDateDisabled(dates, dayjs("2026-10-14").toDate())).toBe(false);
    expect(isDigestDateDisabled(dates, dayjs("2026-10-15").toDate())).toBe(true);
  });
});

describe("describeMissingSource", () => {
  test("names the Sources and the Work Identity", () => {
    expect(
      describeMissingSource({
        connectionId: "connection-1",
        identityEmail: "ada@work.example",
        provider: "google",
        sources: ["calendar", "gmail"],
      }),
    ).toBe("Calendar, Gmail for ada@work.example: not read");
  });
});
