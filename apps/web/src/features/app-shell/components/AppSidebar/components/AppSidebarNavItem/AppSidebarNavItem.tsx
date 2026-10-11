import { Link, useMatchRoute } from "@tanstack/react-router";

import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { IAppSidebarNavItemProps } from "@/features/app-shell/components/AppSidebar/components/AppSidebarNavItem/AppSidebarNavItem.interfaces";

export function AppSidebarNavItem({ to, label, icon }: IAppSidebarNavItemProps) {
  const matchRoute = useMatchRoute();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = Boolean(matchRoute({ to, fuzzy: true }));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to} onClick={() => isMobile && setOpenMobile(false)}>
          {icon}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
