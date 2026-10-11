import { t } from "elysia";

import { EAuthMessages } from "#api/modules/auth/auth.enums";

export const unauthorizedError = t.Object({
  message: t.Literal(EAuthMessages.UNAUTHORIZED),
});
