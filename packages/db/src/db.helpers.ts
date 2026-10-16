import { type AnyD1Database, drizzle } from "drizzle-orm/d1";

import * as schema from "#db/schema";

export function createDb(d1: AnyD1Database) {
  return drizzle(d1, { schema, casing: "snake_case" });
}
