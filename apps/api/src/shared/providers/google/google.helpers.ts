import type { Credentials, TokenPayload } from "google-auth-library";

import { dayjs } from "#api/shared/date/date.helpers";
import { GOOGLE_SOURCE_SCOPES } from "#api/shared/providers/google/google.constants";
import { EGoogleMessages, EGoogleSource } from "#api/shared/providers/google/google.enums";
import type {
  IGoogleProfile,
  ISourceGrantResult,
} from "#api/shared/providers/google/google.interfaces";
import { OAUTH_SCOPE_SEPARATOR } from "#api/shared/providers/providers.constants";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

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
  return scope.split(OAUTH_SCOPE_SEPARATOR);
}

export function toGoogleTokens(accessToken: string, credentials: Credentials): IProviderTokens {
  return {
    accessToken,
    refreshToken: credentials.refresh_token ?? undefined,
    expiresInSeconds: secondsUntil(credentials.expiry_date),
    scopes: splitScopes(credentials.scope),
  };
}

export function sourceScopes(sources: EGoogleSource[]): string[] {
  return sources.flatMap((source) => GOOGLE_SOURCE_SCOPES[source]);
}

export function grantedSources(scopes: string[]): EGoogleSource[] {
  return Object.values(EGoogleSource).filter((source) =>
    GOOGLE_SOURCE_SCOPES[source].every((scope) => scopes.includes(scope)),
  );
}

export function parseSources(values: readonly unknown[]): EGoogleSource[] | null {
  const sources = Object.values(EGoogleSource).filter((source) => values.includes(source));
  if (sources.length !== values.length) {
    return null;
  }
  return sources;
}

export function deniedSources({ requested, granted }: ISourceGrantResult): EGoogleSource[] {
  return requested.filter((source) => !granted.includes(source));
}
