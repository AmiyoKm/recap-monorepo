import { Link } from "@tanstack/react-router";
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react";

import { userInitial } from "@/api/auth/auth.helpers";
import { useSignOutMutation } from "@/api/auth/auth.mutations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  USER_MENU_LABEL,
  USER_MENU_PROFILE,
  USER_MENU_SIGN_OUT,
  USER_MENU_SIGNING_OUT,
} from "@/features/app-shell/components/UserMenu/UserMenu.constants";
import type { IUserMenuProps } from "@/features/app-shell/components/UserMenu/UserMenu.interfaces";

export function UserMenu({ user }: IUserMenuProps) {
  const signOut = useSignOutMutation();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={USER_MENU_LABEL}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="rounded-lg">
                {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                <AvatarFallback className="rounded-lg">
                  {userInitial(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={4}
            className="min-w-56"
          >
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserIcon />
                  {USER_MENU_PROFILE}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={signOut.isPending} onSelect={() => signOut.mutate()}>
                <LogOutIcon />
                {signOut.isPending ? USER_MENU_SIGNING_OUT : USER_MENU_SIGN_OUT}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
