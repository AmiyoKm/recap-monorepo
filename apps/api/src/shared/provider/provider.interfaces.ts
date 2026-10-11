export interface IGoogleUserinfo {
  sub: string;
  email: string;
  name: string | undefined;
  picture: string | undefined;
}

export interface ITokenSet {
  accessToken: string;
  refreshToken: string | undefined;
}

export interface IAuthorizeUrlInput {
  state: string;
  redirectUri: string;
  scopes: string[];
}

export interface ICodeExchangeInput {
  code: string;
  redirectUri: string;
}

export interface IApiKeyValidationResult {
  accountId: string;
  accountEmail: string;
}

export interface IGoogleOAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
}

export interface IProviderClient {
  buildAuthorizeUrl(input: IAuthorizeUrlInput): string;
  exchangeCode(input: ICodeExchangeInput): Promise<ITokenSet>;
  fetchGoogleUserinfo(accessToken: string): Promise<IGoogleUserinfo>;
  validateApiKey(provider: string, apiKey: string): Promise<IApiKeyValidationResult>;
}
