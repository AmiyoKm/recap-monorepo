import { expect, test } from "bun:test";

import {
  PULL_D1_STATEMENTS_PER_MESSAGE_BOUND,
  PULL_MAX_PAGES_PER_MESSAGE,
} from "#api/modules/pull/pull.constants";

const D1_STATEMENTS_PER_INVOCATION_LIMIT = 50;

test("one pull message stays under the D1 statement limit", () => {
  expect(PULL_MAX_PAGES_PER_MESSAGE).toBe(1);
  expect(PULL_D1_STATEMENTS_PER_MESSAGE_BOUND).toBeLessThan(D1_STATEMENTS_PER_INVOCATION_LIMIT);
});
