export interface IGoogleProfile {
  sub: string;
  email: string;
  name: string | undefined;
  picture: string | undefined;
}

export interface IGoogleTokens {
  accessToken: string;
  refreshToken: string | undefined;
  expiresInSeconds: number | undefined;
  scopes: string[];
}

export interface IGoogleAuthorizeInput {
  state: string;
  redirectUri: string;
  scopes: string[];
}

export interface IGoogleAuthorization {
  authorizeUrl: string;
  codeVerifier: string;
}

export interface IGoogleCodeExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface IGoogleGrant {
  tokens: IGoogleTokens;
  profile: IGoogleProfile;
}
