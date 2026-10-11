import { describe, expect, test } from "bun:test";

import { EConnectionStatus, EProvider } from "@/api/identity/identity.enums";
import { providerLabel, statusLabel } from "@/api/identity/identity.helpers";
import type { TIdentityConnection } from "@/api/identity/identity.types";
import { EConnectorState } from "@/features/settings/components/ConnectorRow/ConnectorRow.enums";
import { connectorState } from "@/features/settings/components/ConnectorRow/ConnectorRow.helpers";

describe("providerLabel", () => {
  test("labels known providers", () => {
    expect(providerLabel("google-calendar")).toBe("Google Calendar");
    expect(providerLabel("jira")).toBe("Jira");
    expect(providerLabel("linear")).toBe("Linear");
  });

  test("falls back to the raw provider for unknown values", () => {
    expect(providerLabel("loom")).toBe("loom");
  });
});

describe("statusLabel", () => {
  test("labels known statuses", () => {
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("needs_reconnect")).toBe("Needs reconnect");
  });

  test("falls back to the raw status for unknown values", () => {
    expect(statusLabel("paused")).toBe("paused");
  });
});

describe("connectorState", () => {
  const connection: TIdentityConnection = {
    id: "connection-1",
    provider: EProvider.JIRA,
    authKind: "api_key",
    status: EConnectionStatus.ACTIVE,
    scopes: null,
    providerAccountId: "account-1",
    providerAccountEmail: "ada@acme.dev",
    createdAt: "2026-10-11T00:00:00.000Z",
    updatedAt: "2026-10-11T00:00:00.000Z",
  };

  test("is not connected without a connection", () => {
    expect(connectorState(undefined)).toBe(EConnectorState.NOT_CONNECTED);
  });

  test("is active for an active connection", () => {
    expect(connectorState(connection)).toBe(EConnectorState.ACTIVE);
  });

  test("needs a reconnect for any other status", () => {
    expect(connectorState({ ...connection, status: EConnectionStatus.NEEDS_RECONNECT })).toBe(
      EConnectorState.NEEDS_RECONNECT,
    );
  });
});
