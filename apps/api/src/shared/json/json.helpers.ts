export function toStringRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    record[key] = value;
  }
  return record;
}
