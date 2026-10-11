import { createFileRoute } from "@tanstack/react-router";

import { DashboardContainer } from "@/features/dashboard/containers/DashboardContainer";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardContainer,
});
