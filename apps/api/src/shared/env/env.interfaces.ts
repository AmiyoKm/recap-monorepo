export interface IOAuthClientEnv {
  clientId: string;
  clientSecret: string;
}

export interface IAuthEnv {
  secret: string;
  baseUrl: string;
  cookieDomain: string | undefined;
  google: IOAuthClientEnv;
}

export interface IEnv {
  webOrigin: string;
  connectionEncryptionKey: string;
  auth: IAuthEnv;
  jira: IOAuthClientEnv | undefined;
  linear: IOAuthClientEnv | undefined;
}
