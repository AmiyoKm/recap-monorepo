import { describe, expect, test } from "bun:test";

import { toStringRecord } from "#api/shared/json/json.helpers";

const NUMBER_BODY = 42;

describe("toStringRecord", () => {
  test("copies the own keys of an object", () => {
    expect(toStringRecord({ provider: "jira", count: 2 })).toEqual({ provider: "jira", count: 2 });
  });

  test.each([null, "text", NUMBER_BODY, undefined])("returns null for %p", (body) => {
    expect(toStringRecord(body)).toBeNull();
  });
});
