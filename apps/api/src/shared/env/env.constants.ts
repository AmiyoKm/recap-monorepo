import { loadEnv } from "#api/shared/env/env.helpers";
import type { IEnv } from "#api/shared/env/env.interfaces";

export const ENV: IEnv = loadEnv(process.env);
