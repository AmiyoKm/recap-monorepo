export function identityInitials(displayName: string | null, email: string): string {
  const source = displayName && displayName.length > 0 ? displayName : email;
  const words = source.split(" ").filter((word) => word.length > 0);
  if (words.length > 1) {
    const first: string | undefined = words[0];
    const last: string | undefined = words[words.length - 1];
    return `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
