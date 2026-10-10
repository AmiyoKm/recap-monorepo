import { sql } from "drizzle-orm";

import { EHealthStatus } from "#api/modules/health/health.enums";
import type { IHealthDeps } from "#api/modules/health/health.interfaces";
import { ERedisCommand } from "#api/shared/redis/redis.enums";

export async function checkHealth({ db, redis }: IHealthDeps) {
  await Promise.all([db.execute(sql`select 1`), redis.send(ERedisCommand.PING, [])]);
  return { status: EHealthStatus.OK };
}
