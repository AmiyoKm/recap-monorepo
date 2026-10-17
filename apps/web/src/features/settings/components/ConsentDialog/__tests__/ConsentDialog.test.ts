import { describe, expect, test } from "bun:test";

import { EConsentTarget, EProvider } from "@/api/identity/identity.enums";
import { consentCompleted, readConnectResultMessage } from "@/api/identity/identity.helpers";
import type { TConsentTarget } from "@/api/identity/identity.types";

const IDENTITY_TARGET: TConsentTarget = { kind: EConsentTarget.IDENTITY };
const GOOGLE_TARGET: TConsentTarget = {
  kind: EConsentTarget.CONNECTION,
  identityId: "a",
  provider: EProvider.GOOGLE,
};

describe("consentCompleted", () => {
  test("detects a new identity", () => {
    expect(consentCompleted("a", "a|b", IDENTITY_TARGET)).toBe(true);
    expect(consentCompleted("", "a", IDENTITY_TARGET)).toBe(true);
  });

  test("detects the expected google connection, new or reconnected", () => {
    expect(consentCompleted("a", "a|a:google:active:c1", GOOGLE_TARGET)).toBe(true);
    expect(
      consentCompleted("a|a:google:needs_reconnect:c1", "a|a:google:active:c2", GOOGLE_TARGET),
    ).toBe(true);
    expect(consentCompleted("a|a:google:active:c1", "a|a:google:active:c2", GOOGLE_TARGET)).toBe(
      true,
    );
  });

  test("ignores changes for another identity or provider", () => {
    expect(consentCompleted("a|b", "a|b|b:google:active:c1", GOOGLE_TARGET)).toBe(false);
    expect(consentCompleted("a", "a|a:jira:active:c1", GOOGLE_TARGET)).toBe(false);
    expect(consentCompleted("a", "a|a:jira:active:c1", IDENTITY_TARGET)).toBe(false);
  });

  test("ignores an unchanged active connection", () => {
    expect(consentCompleted("a|a:google:active:c1", "a|a:google:active:c1", GOOGLE_TARGET)).toBe(
      false,
    );
  });

  test("ignores removals and no change", () => {
    expect(consentCompleted("a|b", "a", IDENTITY_TARGET)).toBe(false);
    expect(consentCompleted("a|b", "a|b", IDENTITY_TARGET)).toBe(false);
    expect(consentCompleted("a", "", IDENTITY_TARGET)).toBe(false);
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
