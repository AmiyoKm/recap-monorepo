import { createFileRoute } from "@tanstack/react-router";

import { ConnectResultContainer } from "@/features/connect-result/containers/ConnectResultContainer";
import type { IConnectResultSearch } from "@/shared/router/router.interfaces";

export const Route = createFileRoute("/connected")({
  validateSearch: (search: Record<string, unknown>): IConnectResultSearch => ({
    connected: typeof search["connected"] === "string" ? search["connected"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  component: ConnectedRoute,
});

function ConnectedRoute() {
  const search = Route.useSearch();
  return (
    <ConnectResultContainer
      connected={search.connected}
      email={search.email}
      error={search.error}
    />
  );
}
