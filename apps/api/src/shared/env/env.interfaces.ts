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

export interface IAiEnv {
  googleApiKey: string;
}

export interface IEnv {
  webOrigin: string;
  connectionEncryptionKey: string;
  auth: IAuthEnv;
  jira: IOAuthClientEnv;
  linear: IOAuthClientEnv;
  ai: IAiEnv;
}

export interface IEnvSource {
  [name: string]: string | undefined;
}
