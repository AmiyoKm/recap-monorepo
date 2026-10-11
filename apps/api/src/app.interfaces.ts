import type { RedisClient } from "bun";

import type { TDb } from "@recap/db";

import type { IEnv } from "#api/shared/env/env.interfaces";
import type { IProviderClient } from "#api/shared/provider/provider.interfaces";

export interface IAppDeps {
  db: TDb;
  redis: RedisClient;
  env: IEnv;
  providerClient: IProviderClient;
}
