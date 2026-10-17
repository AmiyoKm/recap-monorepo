export interface IGoogleAuthEnv {
  clientId: string;
  clientSecret: string;
}

export interface IAuthEnv {
  secret: string;
  baseUrl: string;
  cookieDomain: string | undefined;
  google: IGoogleAuthEnv;
}

export interface IEnv {
  webOrigin: string;
  connectionEncryptionKey: string;
  auth: IAuthEnv;
}
