import { RedisClient } from "bun";

import { ENV } from "#api/shared/env/env.constants";

export const redis = new RedisClient(ENV.redisUrl);
