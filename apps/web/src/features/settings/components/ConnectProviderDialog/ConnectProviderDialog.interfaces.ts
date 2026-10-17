import type { TConnectorProvider, TIdentityConnection } from "@/api/identity/identity.types";

export interface IConnectProviderDialogProps {
  identityId: string;
  provider: TConnectorProvider;
  connection: TIdentityConnection | undefined;
  triggerLabel: string;
}

export interface IProviderConsentOptions {
  identityId: string;
  provider: TConnectorProvider;
  connection: TIdentityConnection | undefined;
}
