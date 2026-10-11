import type { TApiKeyProvider } from "@/api/identity/identity.types";

export interface IConnectApiKeyDialogProps {
  identityId: string;
  provider: TApiKeyProvider;
}
