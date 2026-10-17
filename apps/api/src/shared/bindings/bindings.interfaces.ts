export interface IPullMessage {
  connectionId: string;
}

export interface IDigestWorkflowParams {
  userId: string;
  digestId: string;
}

export interface IBindings {
  DB: D1Database;
  CACHE: KVNamespace;
  PULL_QUEUE: Queue<IPullMessage>;
  DIGEST_WORKFLOW: Workflow<IDigestWorkflowParams>;
  DIGEST_VECTORS: VectorizeIndex;
}
