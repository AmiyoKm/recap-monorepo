import { createFileRoute } from "@tanstack/react-router";

import { SettingsContainer } from "@/features/settings/containers/SettingsContainer";

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>) => ({
    connected: typeof search["connected"] === "string" ? search["connected"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const search = Route.useSearch();
  return (
    <SettingsContainer
      connectedProvider={search.connected}
      connectedEmail={search.email}
      connectError={search.error}
    />
  );
}
