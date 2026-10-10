export enum ERedisMessages {
  INVALID_TTL = "Redis increment TTL must be a positive integer",
}

export enum ERedisCommand {
  GET_AND_DELETE = "GETDEL",
  EVAL = "EVAL",
  SET = "SET",
  PING = "PING",
}

export enum ERedisSetOption {
  EXPIRE_IN_SECONDS = "EX",
}
