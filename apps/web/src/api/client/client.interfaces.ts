export interface IEdenError {
  status: unknown;
  value: unknown;
}

export interface IEdenResult<TData, TError extends IEdenError = IEdenError> {
  data: TData | null;
  error: TError | null;
}
