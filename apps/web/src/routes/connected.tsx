import { createFileRoute } from "@tanstack/react-router";

import { ConnectResultContainer } from "@/features/connect-result/containers/ConnectResultContainer";
import type { IConnectResultSearch } from "@/shared/router/router.interfaces";
import { readSearchString } from "@/shared/search/search.helpers";

export const Route = createFileRoute("/connected")({
  validateSearch: (search: Record<string, unknown>): IConnectResultSearch => ({
    connected: readSearchString(search, "connected"),
    email: readSearchString(search, "email"),
    denied: readSearchString(search, "denied"),
    error: readSearchString(search, "error"),
  }),
  component: ConnectedRoute,
});

function ConnectedRoute() {
  const search = Route.useSearch();
  return (
    <ConnectResultContainer
      connected={search.connected}
      email={search.email}
      denied={search.denied}
      error={search.error}
    />
  );
}
