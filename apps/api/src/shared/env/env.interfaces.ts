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
  jira: IOAuthClientEnv;
  linear: IOAuthClientEnv;
}

export interface IEnvSource {
  [name: string]: string | undefined;
}
