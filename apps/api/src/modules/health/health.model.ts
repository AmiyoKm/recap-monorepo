import { t } from "elysia";

import { EHealthStatus } from "#api/modules/health/health.enums";

export const healthResponse = t.Object({
  status: t.Enum(EHealthStatus),
});
