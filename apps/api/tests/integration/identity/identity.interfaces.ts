import type { TConnectConnectionBody } from "#api/modules/identity/identity.types";
import type { IProviderGrant } from "#api/shared/providers/providers.interfaces";

export interface IGoogleConnectCodes {
  identityCode: string;
  identitySub: string;
  googleCode: string;
}

export interface IInvalidSourcesCase {
  name: string;
  body: TConnectConnectionBody;
}

export interface IProviderCallbackCase {
  provider: "jira" | "linear";
  grant: IProviderGrant;
  complete: (code: string, state: string) => Promise<{ status: number; response: Response }>;
  hasPkce: boolean;
}
