import { EClientMessages } from "@/api/client/client.enums";
import type { IEdenResult } from "@/api/client/client.interfaces";

class ApiError extends Error {
  readonly status: unknown;
  readonly value: unknown;

  constructor(status: unknown, value: unknown) {
    super(EClientMessages.REQUEST_FAILED);
    this.name = "ApiError";
    this.status = status;
    this.value = value;
  }
}

export async function ensureOk<TData>(request: Promise<IEdenResult<TData>>): Promise<TData> {
  const { data, error } = await request;
  if (error) {
    throw new ApiError(error.status, error.value);
  }
  if (data === null) {
    throw new ApiError(null, EClientMessages.EMPTY_RESPONSE);
  }
  return data;
}
