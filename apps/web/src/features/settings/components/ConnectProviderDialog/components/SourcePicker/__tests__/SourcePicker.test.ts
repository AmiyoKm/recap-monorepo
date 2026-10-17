import { describe, expect, test } from "bun:test";

import { EConnectionStatus, EGoogleSource, EProvider } from "@/api/identity/identity.enums";
import { sourceLabel } from "@/api/identity/identity.helpers";
import type { TIdentityConnection } from "@/api/identity/identity.types";
import { SOURCE_PICKER_DESCRIPTIONS } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.constants";
import {
  defaultSources,
  toggleSource,
} from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.helpers";

const ALL_SOURCES = [
  EGoogleSource.CALENDAR,
  EGoogleSource.GMAIL,
  EGoogleSource.DRIVE,
  EGoogleSource.CHAT,
];

const GOOGLE_CONNECTION: TIdentityConnection = {
  id: "connection-1",
  provider: EProvider.GOOGLE,
  status: EConnectionStatus.ACTIVE,
  scopes: null,
  sources: [EGoogleSource.GMAIL, EGoogleSource.CHAT],
  providerAccountId: "sub-1",
  providerAccountEmail: "ada@acme.dev",
  providerSite: null,
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
};

describe("sourceLabel", () => {
  test.each([
    { source: "calendar", label: "Calendar" },
    { source: "gmail", label: "Gmail" },
    { source: "drive", label: "Drive" },
    { source: "chat", label: "Chat" },
    { source: "photos", label: "photos" },
  ])("labels $source as $label", ({ source, label }) => {
    expect(sourceLabel(source)).toBe(label);
  });
});

describe("SOURCE_PICKER_DESCRIPTIONS", () => {
  test("says that Gmail reads metadata and not the message text", () => {
    expect(SOURCE_PICKER_DESCRIPTIONS[EGoogleSource.GMAIL]).toContain("subject");
    expect(SOURCE_PICKER_DESCRIPTIONS[EGoogleSource.GMAIL]).toContain("not the message text");
  });

  test("says that Drive reads activity and not file content", () => {
    expect(SOURCE_PICKER_DESCRIPTIONS[EGoogleSource.DRIVE]).toContain("edits and comments");
    expect(SOURCE_PICKER_DESCRIPTIONS[EGoogleSource.DRIVE]).toContain("not file content");
  });
});

describe("defaultSources", () => {
  test("ticks every source on a first connect", () => {
    expect(defaultSources(undefined)).toEqual(ALL_SOURCES);
  });

  test("ticks the current sources on a reconnect", () => {
    expect(defaultSources(GOOGLE_CONNECTION)).toEqual([EGoogleSource.GMAIL, EGoogleSource.CHAT]);
  });

  test("ticks every source when the connection has none", () => {
    expect(defaultSources({ ...GOOGLE_CONNECTION, sources: [] })).toEqual(ALL_SOURCES);
  });
});

describe("toggleSource", () => {
  test("adds a ticked source in the source order", () => {
    expect(
      toggleSource({
        sources: [EGoogleSource.CHAT],
        source: EGoogleSource.CALENDAR,
        isChecked: true,
      }),
    ).toEqual([EGoogleSource.CALENDAR, EGoogleSource.CHAT]);
  });

  test("removes an unticked source", () => {
    expect(
      toggleSource({
        sources: [EGoogleSource.CALENDAR, EGoogleSource.CHAT],
        source: EGoogleSource.CALENDAR,
        isChecked: false,
      }),
    ).toEqual([EGoogleSource.CHAT]);
  });
});
