import type { TConnectorProvider, TIdentityConnection } from "@/api/identity/identity.types";

export interface IConnectorRowProps {
  identityId: string;
  provider: TConnectorProvider;
  connection: TIdentityConnection | undefined;
}
