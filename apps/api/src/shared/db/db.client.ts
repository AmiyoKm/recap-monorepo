import { createDb } from "@recap/db";

import { ENV } from "#api/shared/env/env.constants";

export const db = createDb(ENV.databaseUrl);
