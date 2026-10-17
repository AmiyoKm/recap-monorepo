import { expect, test } from "bun:test";

import { ESource } from "#api/modules/activity/activity.enums";
import {
  DIGEST_FINAL_PULL_FIXED_D1_STATEMENTS,
  DIGEST_FINAL_PULL_MAX_PAGES,
  DIGEST_SYSTEM_PROMPT,
} from "#api/modules/digest/digest.constants";
import {
  D1_STATEMENTS_PER_INVOCATION_LIMIT,
  PULL_D1_STATEMENTS_PER_PAGE_BOUND,
} from "#api/modules/pull/pull.constants";

test("one final pull step reads at least one page and stays under the D1 statement limit", () => {
  const statements =
    DIGEST_FINAL_PULL_MAX_PAGES * PULL_D1_STATEMENTS_PER_PAGE_BOUND +
    DIGEST_FINAL_PULL_FIXED_D1_STATEMENTS;

  expect(DIGEST_FINAL_PULL_MAX_PAGES).toBeGreaterThanOrEqual(1);
  expect(statements).toBeLessThanOrEqual(D1_STATEMENTS_PER_INVOCATION_LIMIT);
});

test("the system prompt names every Source", () => {
  for (const source of Object.values(ESource)) {
    expect(DIGEST_SYSTEM_PROMPT).toContain(source);
  }
});
