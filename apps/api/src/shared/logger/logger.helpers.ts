export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return typeof error;
  }
  return `${error.name}: ${error.message}`;
}

export function logError(label: string, error: unknown): void {
  console.error(label, describeError(error));
}
