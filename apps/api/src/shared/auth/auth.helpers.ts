import type { TCrossSubDomainCookies, TSocialProviders } from "#api/shared/auth/auth.types";
import type { IGoogleAuthEnv } from "#api/shared/env/env.interfaces";

export function socialProviders({ clientId, clientSecret }: IGoogleAuthEnv): TSocialProviders {
  if (!(clientId && clientSecret)) {
    return {};
  }
  return { google: { clientId, clientSecret } };
}

export function crossSubDomainCookies(cookieDomain: string | undefined): TCrossSubDomainCookies {
  if (!cookieDomain) {
    return undefined;
  }
  return { enabled: true, domain: cookieDomain };
}
