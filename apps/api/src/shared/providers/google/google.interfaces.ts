import type { EGoogleSource } from "#api/shared/providers/google/google.enums";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

export interface IGoogleProfile {
  sub: string;
  email: string;
  name: string | undefined;
  picture: string | undefined;
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
  tokens: IProviderTokens;
  profile: IGoogleProfile;
}

export interface ISourceGrantResult {
  requested: EGoogleSource[];
  granted: EGoogleSource[];
}
