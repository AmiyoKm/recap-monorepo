import { expect, test } from "bun:test";

import { ESource } from "#api/modules/activity/activity.enums";
import { DIGEST_SYSTEM_PROMPT } from "#api/modules/digest/digest.constants";

test("the system prompt names every Source", () => {
  for (const source of Object.values(ESource)) {
    expect(DIGEST_SYSTEM_PROMPT).toContain(source);
  }
});
