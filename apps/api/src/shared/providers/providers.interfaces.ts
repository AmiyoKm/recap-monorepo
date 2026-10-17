export interface IProviderAccount {
  accountId: string;
  accountEmail: string;
}

export interface IProviderTokens {
  accessToken: string;
  refreshToken: string | undefined;
  expiresInSeconds: number | undefined;
  scopes: string[];
}

export interface IProviderAuthorizeInput {
  state: string;
  redirectUri: string;
}

export interface IProviderAuthorization {
  authorizeUrl: string;
  codeVerifier: string | null;
}

export interface IProviderCodeExchangeInput {
  code: string;
  redirectUri: string;
}

export interface IProviderGrant {
  tokens: IProviderTokens;
  account: IProviderAccount;
  site: string | null;
  resourceId: string | null;
}
