import { describe, expect, test } from "bun:test";

import { EEnvMessages } from "#api/shared/env/env.enums";
import { loadEnv, optionalEnv, requireEnv } from "#api/shared/env/env.helpers";
import type { IEnvSource } from "#api/shared/env/env.interfaces";

const COMPLETE_ENV_SOURCE: IEnvSource = {
  WEB_ORIGIN: "http://localhost:5173",
  CONNECTION_ENCRYPTION_KEY: "encryption-key",
  BETTER_AUTH_SECRET: "auth-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  JIRA_CLIENT_ID: "jira-id",
  JIRA_CLIENT_SECRET: "jira-secret",
  LINEAR_CLIENT_ID: "linear-id",
  LINEAR_CLIENT_SECRET: "linear-secret",
  GOOGLE_GENERATIVE_AI_API_KEY: "gemini-key",
};

describe("requireEnv", () => {
  test("returns a set value", () => {
    expect(requireEnv("WEB_ORIGIN", "http://localhost:5173")).toBe("http://localhost:5173");
  });

  test.each([undefined, ""])("throws with the variable name for %p", (value) => {
    expect(() => requireEnv("WEB_ORIGIN", value)).toThrow(EEnvMessages.MISSING_VARIABLE);
  });
});

describe("optionalEnv", () => {
  test("keeps a set value", () => {
    expect(optionalEnv("3000")).toBe("3000");
  });

  test.each([undefined, ""])("returns undefined for %p", (value) => {
    expect(optionalEnv(value)).toBeUndefined();
  });
});

describe("loadEnv", () => {
  test("reads every provider client", () => {
    const env = loadEnv(COMPLETE_ENV_SOURCE);

    expect(env.auth.google).toEqual({ clientId: "google-id", clientSecret: "google-secret" });
    expect(env.jira).toEqual({ clientId: "jira-id", clientSecret: "jira-secret" });
    expect(env.linear).toEqual({ clientId: "linear-id", clientSecret: "linear-secret" });
    expect(env.ai).toEqual({ googleApiKey: "gemini-key" });
  });

  test.each(Object.keys(COMPLETE_ENV_SOURCE))("throws without %s", (name) => {
    expect(() => loadEnv({ ...COMPLETE_ENV_SOURCE, [name]: undefined })).toThrow(
      new Error(EEnvMessages.MISSING_VARIABLE, { cause: name }),
    );
  });
});
