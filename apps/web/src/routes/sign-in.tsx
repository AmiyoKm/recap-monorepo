import { createFileRoute } from "@tanstack/react-router";

import { SignInContainer } from "@/features/auth/containers/SignInContainer";
import type { ISignInSearch } from "@/shared/router/router.interfaces";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): ISignInSearch => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    mode: typeof search["mode"] === "string" ? search["mode"] : undefined,
  }),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  return <SignInContainer error={search.error} mode={search.mode} />;
}
