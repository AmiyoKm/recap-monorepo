import type { EAuthPath } from "@/api/auth/auth.enums";
import type { IAuthClientError } from "@/api/auth/auth.interfaces";
import { ApiError } from "@/api/client/client.helpers";

export function webUrl(path: EAuthPath): string {
  return new URL(path, window.location.origin).toString();
}

export function toAuthError(error: IAuthClientError): ApiError {
  return new ApiError(error.status, { message: error.message });
}

export function userInitial(name: string, email: string): string {
  const source = name.trim().length > 0 ? name.trim() : email;
  return source.charAt(0).toUpperCase();
}
