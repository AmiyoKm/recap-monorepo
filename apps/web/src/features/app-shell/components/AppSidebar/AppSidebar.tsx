import { LayoutDashboardIcon, SettingsIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  APP_SIDEBAR_DASHBOARD,
  APP_SIDEBAR_NAV_LABEL,
  APP_SIDEBAR_SETTINGS,
} from "@/features/app-shell/components/AppSidebar/AppSidebar.constants";
import type { IAppSidebarProps } from "@/features/app-shell/components/AppSidebar/AppSidebar.interfaces";
import { AppSidebarNavItem } from "@/features/app-shell/components/AppSidebar/components/AppSidebarNavItem";
import { UserMenu } from "@/features/app-shell/components/UserMenu";
import { Wordmark } from "@/features/app-shell/components/Wordmark";

export function AppSidebar({ user }: IAppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Wordmark to="/dashboard" collapsible />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label={APP_SIDEBAR_NAV_LABEL}>
              <SidebarMenu>
                <AppSidebarNavItem
                  to="/dashboard"
                  label={APP_SIDEBAR_DASHBOARD}
                  icon={<LayoutDashboardIcon />}
                />
                <AppSidebarNavItem
                  to="/settings"
                  label={APP_SIDEBAR_SETTINGS}
                  icon={<SettingsIcon />}
                />
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
