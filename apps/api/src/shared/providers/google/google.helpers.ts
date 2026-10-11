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

export function toGoogleTokens(accessToken: string, credentials: Credentials): IGoogleTokens {
  return {
    accessToken,
    refreshToken: credentials.refresh_token ?? undefined,
    expiresInSeconds: credentials.expiry_date
      ? dayjs(credentials.expiry_date).diff(dayjs(), "second")
      : undefined,
    scopes: credentials.scope ? credentials.scope.split(GOOGLE_SCOPE_SEPARATOR) : [],
  };
}
