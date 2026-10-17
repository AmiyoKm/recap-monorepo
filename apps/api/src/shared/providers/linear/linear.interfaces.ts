import type { IProviderCodeExchangeInput } from "#api/shared/providers/providers.interfaces";

export interface ILinearCodeExchangeInput extends IProviderCodeExchangeInput {
  codeVerifier: string;
}
