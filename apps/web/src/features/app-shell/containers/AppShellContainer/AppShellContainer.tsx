import { Navigate, Outlet } from "@tanstack/react-router";

import { useSessionQuery } from "@/api/auth/auth.queries";
import { useConnectResultSubscription } from "@/api/identity/identity.queries";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/app-shell/components/AppSidebar";
import { AppTopBar } from "@/features/app-shell/components/AppTopBar";
import { SessionCheck } from "@/features/app-shell/components/SessionCheck";
import { showConnectResultToast } from "@/features/app-shell/containers/AppShellContainer/AppShellContainer.helpers";

export function AppShellContainer() {
  const session = useSessionQuery();
  useConnectResultSubscription(showConnectResultToast);

  if (session.isPending || session.isError) {
    return <SessionCheck isError={session.isError} onRetry={() => void session.refetch()} />;
  }
  if (!session.data) {
    return <Navigate to="/sign-in" replace />;
  }
  return (
    <SidebarProvider>
      <AppSidebar user={session.data.user} />
      <SidebarInset className="min-w-0">
        <AppTopBar />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
