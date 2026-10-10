import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { TooltipProvider } from "@/components/ui/tooltip";

export function RootLayoutContainer() {
  return (
    <TooltipProvider>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </TooltipProvider>
  );
}
