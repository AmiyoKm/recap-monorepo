import type { createAuth } from "#api/modules/auth/auth.service";

export type TAuth = ReturnType<typeof createAuth>;
