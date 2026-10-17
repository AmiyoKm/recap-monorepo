export enum EDigestMessages {
  TIME_ZONE_INVALID = "That time zone is not supported",
  DIGEST_NOT_FOUND = "No Digest exists for that date",
  DIGEST_IN_PROGRESS = "A Digest is already being made",
  DIGEST_MISSING = "Digest row is missing",
  EMBEDDING_MISSING = "Embedding is missing for a Digest section",
  FINAL_PULL_FAILED = "Digest final pull failed for a Connection",
}

export enum EDigestStatus {
  PENDING = "pending",
  RUNNING = "running",
  READY = "ready",
  FAILED = "failed",
}

export enum EDigestStep {
  PREPARE_PULL = "prepare-pull",
  PULL_CONNECTION = "pull-connection",
  MISSING_SOURCE = "missing-source",
  SAVE_MISSING_SOURCES = "save-missing-sources",
  WRITE_DIGEST = "write-digest",
  EMBED_DIGEST = "embed-digest",
  FAIL_DIGEST = "fail-digest",
}
