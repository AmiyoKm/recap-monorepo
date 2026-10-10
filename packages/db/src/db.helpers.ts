import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "#db/schema";

export function createDb(url: string) {
  return drizzle(url, { schema, casing: "snake_case" });
}
