import { describe, expect, test } from "bun:test";

import { env } from "cloudflare:workers";

import { createDb } from "@recap/db";

import { EBindingsMessages } from "#api/shared/bindings/bindings.enums";
import { readBindings } from "#api/shared/bindings/bindings.helpers";
import { deferD1Database } from "#api/shared/db/db.helpers";

describe("deferD1Database", () => {
  test("creates a db without reading a missing DB binding", () => {
    const missing = readBindings({ ...env, DB: undefined });

    expect(() => createDb(deferD1Database(() => missing.DB))).not.toThrow();
  });

  test("throws on the first query when DB is missing", () => {
    const missing = readBindings({ ...env, DB: undefined });
    const d1 = deferD1Database(() => missing.DB);

    expect(() => d1.prepare("select 1")).toThrow(EBindingsMessages.MISSING_BINDING);
  });

  test("reads the binding on every call", async () => {
    let reads = 0;
    const d1 = deferD1Database(() => {
      reads += 1;
      return readBindings(env).DB;
    });
    expect(reads).toBe(0);

    await d1.prepare("select 1").first();
    await d1.exec("select 1");

    expect(reads).toBe(2);
  });
});
