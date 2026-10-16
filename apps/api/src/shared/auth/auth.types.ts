import type { BetterAuthOptions } from "better-auth";

export type TSocialProviders = NonNullable<BetterAuthOptions["socialProviders"]>;
export type TCrossSubDomainCookies = NonNullable<
  BetterAuthOptions["advanced"]
>["crossSubDomainCookies"];
