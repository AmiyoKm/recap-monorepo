import type { api } from "@/api/client";
import type { TEdenData, TEdenError } from "@/api/client/client.types";
import type { EProvider } from "@/api/identity/identity.enums";
import type {
  IConnectionConsentTarget,
  IIdentityConsentTarget,
} from "@/api/identity/identity.interfaces";
export type TIdentity = TIdentitiesData[number];

export type TIdentityConnection = TIdentity["connections"][number];

type TConnectionsRoute = ReturnType<typeof api.identities>;

type TConnectionRoute = ReturnType<typeof api.connections>;

export type TIdentitiesData = TEdenData<typeof api.identities.get>;
export type TIdentitiesError = TEdenError<typeof api.identities.get>;
export type TConnectIdentityData = TEdenData<typeof api.identities.connect.post>;
export type TConnectIdentityError = TEdenError<typeof api.identities.connect.post>;
export type TConnectConnectionError = TEdenError<TConnectionsRoute["connections"]["post"]>;
export type TDeleteIdentityData = TEdenData<TConnectionsRoute["delete"]>;
export type TDeleteIdentityError = TEdenError<TConnectionsRoute["delete"]>;
export type TDeleteConnectionData = TEdenData<TConnectionRoute["delete"]>;
export type TDeleteConnectionError = TEdenError<TConnectionRoute["delete"]>;
export type TConnectorProvider = EProvider.GOOGLE | EProvider.JIRA | EProvider.LINEAR;

export type TConsentTarget = IIdentityConsentTarget | IConnectionConsentTarget;
