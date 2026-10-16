import type { TUserMenuSide } from "@/features/app-shell/components/UserMenu/UserMenu.types";

export function userMenuSide(isMobile: boolean): TUserMenuSide {
  if (!isMobile) {
    return "right";
  }
  return "top";
}
