import { treaty } from "@elysia/eden";
import { createAuthClient } from "better-auth/react";

import type { TApp } from "@recap/api";

import { API_URL } from "@/shared/env/env.constants";

export const api = treaty<TApp>(API_URL, {
  fetch: { credentials: "include" },
  parseDate: false,
});

export const authClient = createAuthClient({ baseURL: API_URL });
