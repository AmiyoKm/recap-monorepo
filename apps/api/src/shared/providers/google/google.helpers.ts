import type { Credentials, TokenPayload } from "google-auth-library";

import { dayjs } from "#api/shared/date/date.helpers";
import { GOOGLE_SCOPE_SEPARATOR } from "#api/shared/providers/google/google.constants";
import { EGoogleMessages } from "#api/shared/providers/google/google.enums";
import type { IGoogleProfile, IGoogleTokens } from "#api/shared/providers/google/google.interfaces";

export function toGoogleProfile(payload: TokenPayload | undefined): IGoogleProfile {
  if (!(payload?.sub && payload.email)) {
    throw new Error(EGoogleMessages.INVALID_PROFILE);
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

function secondsUntil(expiryDate: Credentials["expiry_date"]): number | undefined {
  if (!expiryDate) {
    return undefined;
  }
  return dayjs(expiryDate).diff(dayjs(), "second");
}

function splitScopes(scope: Credentials["scope"]): string[] {
  if (!scope) {
    return [];
  }
  return scope.split(GOOGLE_SCOPE_SEPARATOR);
}

export function toGoogleTokens(accessToken: string, credentials: Credentials): IGoogleTokens {
  return {
    accessToken,
    refreshToken: credentials.refresh_token ?? undefined,
    expiresInSeconds: secondsUntil(credentials.expiry_date),
    scopes: splitScopes(credentials.scope),
  };
}
