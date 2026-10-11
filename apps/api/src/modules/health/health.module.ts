import { Elysia } from "elysia";

import { healthResponse } from "#api/modules/health/health.model";
import { HealthService } from "#api/modules/health/health.service";

export const healthModule = new Elysia({ name: "health" }).get(
  "/health",
  () => HealthService.check(),
  { response: { 200: healthResponse } },
);
