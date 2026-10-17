import { describe, expect, test } from "bun:test";

import { chunk } from "#api/shared/array/array.helpers";

const PAIR = 2;
const TRIPLE = 3;

describe("chunk", () => {
  test("returns no chunks for an empty list", () => {
    expect(chunk<string>([], PAIR)).toEqual([]);
  });

  test("splits an exact multiple", () => {
    expect(chunk(["a", "b", "c", "d"], PAIR)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("keeps the remainder in a last short chunk", () => {
    expect(chunk(["a", "b", "c", "d", "e"], PAIR)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  test("returns one chunk when the size is above the length", () => {
    expect(chunk(["a", "b"], TRIPLE)).toEqual([["a", "b"]]);
  });
});
