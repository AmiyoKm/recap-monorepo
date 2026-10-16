import { createFileRoute } from "@tanstack/react-router";

import { SignInContainer } from "@/features/auth/containers/SignInContainer";
import type { ISignInSearch } from "@/shared/router/router.interfaces";
import { readSearchString } from "@/shared/search/search.helpers";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): ISignInSearch => ({
    error: readSearchString(search, "error"),
    mode: readSearchString(search, "mode"),
  }),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  return <SignInContainer error={search.error} mode={search.mode} />;
}
