export interface ISessionUser {
  id: string;
}

export interface ISession {
  user: ISessionUser;
}

export interface IGetSessionInput {
  headers: Headers;
}

export interface ISessionProvider {
  api: {
    getSession(input: IGetSessionInput): Promise<ISession | null>;
  };
}
