import type { unauthorizedError } from "#api/modules/auth/auth.model";

export type TUnauthorizedError = typeof unauthorizedError.static;
