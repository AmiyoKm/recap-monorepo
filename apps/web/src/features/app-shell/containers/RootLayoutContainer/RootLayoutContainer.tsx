import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function RootLayoutContainer() {
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster position="bottom-center" />
      <TanStackRouterDevtools position="bottom-right" />
    </TooltipProvider>
  );
}
