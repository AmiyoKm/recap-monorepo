import type { RedisClient } from "bun";

import type { TDb } from "@recap/db";

export interface IHealthDeps {
  db: TDb;
  redis: RedisClient;
}
