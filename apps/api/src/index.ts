import { RedisClient } from "bun";

import { createDb } from "@recap/db";

import { createApp } from "#api/app";
import { loadEnv } from "#api/shared/env/env.helpers";

const env = loadEnv(process.env);

createApp({
  db: createDb(env.databaseUrl),
  redis: new RedisClient(env.redisUrl),
  env,
}).listen(env.port);

console.info(`API on http://localhost:${env.port}`);
