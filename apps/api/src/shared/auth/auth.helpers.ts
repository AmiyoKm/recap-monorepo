import type { ISignUpIdentityInput } from "#api/shared/auth/auth.interfaces";
import type { TAuthIdentityInsert, TCrossSubDomainCookies } from "#api/shared/auth/auth.types";
import { dayjs } from "#api/shared/date/date.helpers";

export function crossSubDomainCookies(cookieDomain: string | undefined): TCrossSubDomainCookies {
  if (!cookieDomain) {
    return undefined;
  }
  return { enabled: true, domain: cookieDomain };
}

export function buildSignUpIdentityRow({
  id,
  userId,
  googleSub,
  profile,
}: ISignUpIdentityInput): TAuthIdentityInsert {
  const now = dayjs().toISOString();
  return {
    id,
    userId,
    googleSub,
    email: profile.email,
    displayName: profile.name,
    avatarUrl: profile.image ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
