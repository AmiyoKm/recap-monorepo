import { AuthenticationLinearError, ForbiddenLinearError } from "@linear/sdk";

export function isRejectedLinearCredential(error: unknown): boolean {
  return error instanceof AuthenticationLinearError || error instanceof ForbiddenLinearError;
}
