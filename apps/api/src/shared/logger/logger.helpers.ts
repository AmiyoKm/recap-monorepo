export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return typeof error;
  }
  if (typeof error.cause !== "string") {
    return `${error.name}: ${error.message}`;
  }
  return `${error.name}: ${error.message} (${error.cause})`;
}

export function logError(label: string, error: unknown): void {
  console.error(label, describeError(error));
}
