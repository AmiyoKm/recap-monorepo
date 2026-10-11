import type { TConnectorProvider } from "@/api/identity/identity.types";

export interface IConnectorConnectButtonProps {
  identityId: string;
  provider: TConnectorProvider;
  label: string;
}
