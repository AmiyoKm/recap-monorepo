export enum EDigestMessages {
  TIME_ZONE_INVALID = "That time zone is not supported",
  DIGEST_NOT_FOUND = "No Digest exists for that date",
  DIGEST_IN_PROGRESS = "A Digest is already being made",
  DIGEST_MISSING = "Digest row is missing",
  EMBEDDING_MISSING = "Embedding is missing for a Digest section",
}

export enum EDigestStatus {
  PENDING = "pending",
  RUNNING = "running",
  READY = "ready",
  FAILED = "failed",
}

export enum EDigestStep {
  PREPARE_DIGEST = "prepare-digest",
  WRITE_DIGEST = "write-digest",
  EMBED_DIGEST = "embed-digest",
  FAIL_DIGEST = "fail-digest",
}
