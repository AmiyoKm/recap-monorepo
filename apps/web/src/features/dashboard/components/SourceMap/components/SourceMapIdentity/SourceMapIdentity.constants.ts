import { EConnectionStatus } from "@/api/identity/identity.enums";
import type { TBadgeVariant } from "@/features/app-shell/app-shell.types";

export const SOURCE_MAP_IDENTITY_NO_CONNECTIONS = "No tools connected";
export const SOURCE_MAP_IDENTITY_CONNECT = "Connect a tool";
export const SOURCE_MAP_IDENTITY_STAGGER_MS = 120;
export const SOURCE_MAP_STATUS_DOT_CLASSES: Record<EConnectionStatus, string> = {
  [EConnectionStatus.ACTIVE]: "bg-success",
  [EConnectionStatus.NEEDS_RECONNECT]: "bg-destructive",
};
export const SOURCE_MAP_STATUS_BADGE_VARIANTS: Record<EConnectionStatus, TBadgeVariant> = {
  [EConnectionStatus.ACTIVE]: "secondary",
  [EConnectionStatus.NEEDS_RECONNECT]: "destructive",
};
