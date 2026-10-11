import { createFileRoute } from "@tanstack/react-router";

import { AppShellContainer } from "@/features/app-shell/containers/AppShellContainer";

export const Route = createFileRoute("/_app")({
  component: AppShellContainer,
});
