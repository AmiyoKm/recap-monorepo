import type { api } from "@/api/client";
import type { useIdentitiesQuery } from "@/api/identity/identity.queries";

type TIdentitiesData = NonNullable<ReturnType<typeof useIdentitiesQuery>["data"]>;

export type TIdentity = TIdentitiesData[number];

export type TIdentityConnection = TIdentity["connections"][number];

type TConnectionsRoute = ReturnType<typeof api.identities>;
type TConnectApiKeyBody = Parameters<TConnectionsRoute["connections"]["post"]>[0];

export type TApiKeyProvider = TConnectApiKeyBody["provider"];
