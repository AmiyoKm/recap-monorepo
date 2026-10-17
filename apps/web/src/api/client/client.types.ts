export type TEdenResponse<TRequest extends (...args: never[]) => Promise<object>> = Awaited<
  ReturnType<TRequest>
>;

export type TEdenError<TRequest extends (...args: never[]) => Promise<{ error: unknown }>> =
  NonNullable<TEdenResponse<TRequest>["error"]>;

export type TEdenData<TRequest extends (...args: never[]) => Promise<{ data: unknown }>> =
  NonNullable<TEdenResponse<TRequest>["data"]>;
