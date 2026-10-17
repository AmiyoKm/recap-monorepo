import type { TConnectorProvider } from "@/api/identity/identity.types";

export interface IConnectProviderDialogProps {
  identityId: string;
  provider: TConnectorProvider;
  triggerLabel: string;
}
