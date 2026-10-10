export interface IEdenError {
  status: unknown;
  value: unknown;
}

export interface IEdenResult<TData> {
  data: TData | null;
  error: IEdenError | null;
}
