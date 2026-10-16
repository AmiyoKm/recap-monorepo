export interface ICachePutInput {
  key: string;
  value: string;
  ttlSeconds: number;
}

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown, string>>;
}
