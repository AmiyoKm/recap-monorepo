export interface IPullMessage {
  connectionId: string;
}

export interface IBindings {
  DB: D1Database;
  CACHE: KVNamespace;
  PULL_QUEUE: Queue<IPullMessage>;
}
