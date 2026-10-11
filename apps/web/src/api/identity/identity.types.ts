import type { useIdentitiesQuery } from "@/api/identity/identity.queries";

type TIdentitiesData = NonNullable<ReturnType<typeof useIdentitiesQuery>["data"]>;

export type TIdentity = TIdentitiesData[number];

export type TIdentityConnection = TIdentity["connections"][number];
