import type { TAppRouter } from "@/shared/router/router.types";

declare module "@tanstack/react-router" {
  interface Register {
    router: TAppRouter;
  }
}
