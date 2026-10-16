export function readSearchString(search: Record<string, unknown>, key: string): string | undefined {
  const value = search[key];
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}
