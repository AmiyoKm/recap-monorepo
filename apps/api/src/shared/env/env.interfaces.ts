export interface IGoogleAuthEnv {
  clientId: string | undefined;
  clientSecret: string | undefined;
}

export interface IAuthEnv {
  secret: string;
  baseUrl: string;
  cookieDomain: string | undefined;
  google: IGoogleAuthEnv;
}

export interface IEnv {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  redisKeyPrefix: string;
  webOrigin: string;
  connectionEncryptionKey: string;
  auth: IAuthEnv;
}
