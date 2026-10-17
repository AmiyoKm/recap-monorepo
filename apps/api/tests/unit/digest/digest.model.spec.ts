import { expect, test } from "bun:test";

import { z } from "zod";

import { digestAiOutputSchema } from "#api/modules/digest/digest.model";

function hasKey(node: unknown, key: string): boolean {
  if (Array.isArray(node)) {
    return node.some((child) => hasKey(child, key));
  }
  if (typeof node !== "object" || node === null) {
    return false;
  }
  return Object.entries(node).some(([name, child]) => name === key || hasKey(child, key));
}

test("the AI output JSON schema has no maxItems, which Gemini rejects", () => {
  expect(hasKey(z.toJSONSchema(digestAiOutputSchema), "maxItems")).toBe(false);
});
