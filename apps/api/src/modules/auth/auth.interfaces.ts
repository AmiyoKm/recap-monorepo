import type { SecondaryStorage } from "better-auth";

import type { TDb } from "@recap/db";

import type { IAuthEnv } from "#api/shared/env/env.interfaces";

export interface ICreateAuthOptions {
  db: TDb;
  storage: SecondaryStorage;
  config: IAuthEnv;
  trustedOrigins: string[];
}
