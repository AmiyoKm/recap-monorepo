import type { TBadgeVariant } from "@/features/app-shell/app-shell.types";

export function emailStatusBadgeVariant(isVerified: boolean): TBadgeVariant {
  if (!isVerified) {
    return "outline";
  }
  return "secondary";
}
