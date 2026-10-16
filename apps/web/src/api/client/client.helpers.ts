import { EClientMessages } from "@/api/client/client.enums";
import type { IEdenError, IEdenResult } from "@/api/client/client.interfaces";

export class ApiError<TError extends IEdenError = IEdenError> extends Error {
  readonly status: TError["status"] | null;
  readonly value: TError["value"] | EClientMessages;

  constructor(status: TError["status"] | null, value: TError["value"] | EClientMessages) {
    super(EClientMessages.REQUEST_FAILED);
    this.name = "ApiError";
    this.status = status;
    this.value = value;
  }
}

export async function ensureOk<TData, TError extends IEdenError>(
  request: Promise<IEdenResult<TData, TError>>,
): Promise<TData> {
  const { data, error } = await request;
  if (error) {
    throw new ApiError<TError>(error.status, error.value);
  }
  if (data === null) {
    throw new ApiError<TError>(null, EClientMessages.EMPTY_RESPONSE);
  }
  return data;
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return undefined;
  }
  if (typeof value.message !== "string") {
    return undefined;
  }
  return value.message;
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return EClientMessages.REQUEST_FAILED;
  }
  return readMessage(error.value) ?? EClientMessages.REQUEST_FAILED;
}
