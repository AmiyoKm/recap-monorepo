import { describe, expect, test } from "bun:test";

import { identitiesGained, readConnectResultMessage } from "@/api/identity/identity.helpers";

describe("identitiesGained", () => {
  test("detects a new identity or connection", () => {
    expect(identitiesGained("a|a1:active", "a|a1:active|b")).toBe(true);
    expect(identitiesGained("", "a")).toBe(true);
  });

  test("detects a reconnected connection", () => {
    expect(identitiesGained("a|a1:needs_reconnect", "a|a1:active")).toBe(true);
  });

  test("ignores removals and no change", () => {
    expect(identitiesGained("a|b", "a")).toBe(false);
    expect(identitiesGained("a|b", "a|b")).toBe(false);
    expect(identitiesGained("a", "")).toBe(false);
  });
});

describe("readConnectResultMessage", () => {
  test("reads a success or an error", () => {
    expect(readConnectResultMessage({ connected: "google", email: "a@b.c" })).toEqual({
      connected: "google",
      email: "a@b.c",
      error: undefined,
    });
    expect(readConnectResultMessage({ error: "expired" })?.error).toBe("expired");
  });

  test("rejects other data", () => {
    expect(readConnectResultMessage(null)).toBeNull();
    expect(readConnectResultMessage("google")).toBeNull();
    expect(readConnectResultMessage({ email: "a@b.c" })).toBeNull();
    expect(readConnectResultMessage({ connected: 1 })).toBeNull();
  });
});
