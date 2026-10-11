import { describe, expect, test } from "bun:test";

import {
  connectErrorMessage,
  connectedTitle,
  readConnectResultMessage,
  toKnownConnected,
} from "@/api/identity/identity.helpers";
import { connectResultDescription } from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.helpers";

describe("connectErrorMessage", () => {
  test("maps known connect errors", () => {
    expect(connectErrorMessage("expired")).toContain("expired");
    expect(connectErrorMessage("already_connected")).toContain("already");
    expect(connectErrorMessage("sub_mismatch")).toContain("match");
    expect(connectErrorMessage("failed")).toContain("Try again");
  });

  test("falls back for unknown codes", () => {
    expect(connectErrorMessage("unsupported")).toBe("Something went wrong. Start again.");
    expect(connectErrorMessage("")).toBe("Something went wrong. Start again.");
  });
});

describe("connectedTitle", () => {
  test("names a new Google account", () => {
    expect(connectedTitle("google")).toBe("Google account added");
  });

  test("names a connected tool", () => {
    expect(connectedTitle("google-calendar")).toBe("Google Calendar connected");
    expect(connectedTitle("linear")).toBe("Linear connected");
  });
});

describe("connectResultDescription", () => {
  test("prefers the error message", () => {
    expect(connectResultDescription("google", "expired")).toContain("expired");
  });

  test("confirms a success", () => {
    expect(connectResultDescription("linear", undefined)).toBe("Recap can now use this account.");
  });

  test("falls back when the result is empty", () => {
    expect(connectResultDescription(undefined, undefined)).toBe(
      "Something went wrong. Start again.",
    );
  });
});

describe("toKnownConnected", () => {
  test("keeps a new google account and known providers", () => {
    expect(toKnownConnected("google")).toBe("google");
    expect(toKnownConnected("jira")).toBe("jira");
  });

  test("drops values outside the known set", () => {
    expect(toKnownConnected("Your account was hacked")).toBeUndefined();
    expect(toKnownConnected(undefined)).toBeUndefined();
  });
});

describe("readConnectResultMessage", () => {
  test("drops an unknown connected value from a broadcast", () => {
    expect(readConnectResultMessage({ connected: "anything" })).toBeNull();
    expect(readConnectResultMessage({ connected: "linear", email: "a@b.example" })).toEqual({
      connected: "linear",
      email: "a@b.example",
      error: undefined,
    });
  });
});
