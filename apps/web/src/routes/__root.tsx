import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootLayoutContainer } from "@/features/app-shell/containers/RootLayoutContainer";
import type { IRouterContext } from "@/shared/router/router.interfaces";

export const Route = createRootRouteWithContext<IRouterContext>()({
  component: RootLayoutContainer,
});
