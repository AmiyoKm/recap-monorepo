import { Elysia } from "elysia";

import type { TAuth } from "#api/modules/auth/auth.types";

export function authModule(auth: TAuth) {
  return new Elysia({ name: "auth" }).mount(auth.handler).macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return status("Unauthorized");
        }
        return { user: session.user, session: session.session };
      },
    },
  });
}
