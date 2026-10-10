import { Elysia } from "elysia";

import type { IHealthDeps } from "#api/modules/health/health.interfaces";
import { checkHealth } from "#api/modules/health/health.service";

export function healthModule(deps: IHealthDeps) {
  return new Elysia({ name: "health" }).get("/health", () => checkHealth(deps));
}
