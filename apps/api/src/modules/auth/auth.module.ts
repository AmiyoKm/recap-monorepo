import { Elysia } from "elysia";

import { EAuthMessages } from "#api/modules/auth/auth.enums";
import type { TUnauthorizedError } from "#api/modules/auth/auth.types";
import { auth } from "#api/shared/auth/auth.client";

export const authModule = new Elysia({ name: "auth" }).mount(auth.handler).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({ headers });
      if (!session) {
        return status("Unauthorized", {
          message: EAuthMessages.UNAUTHORIZED,
        } satisfies TUnauthorizedError);
      }
      return { user: session.user, session: session.session };
    },
  },
});
