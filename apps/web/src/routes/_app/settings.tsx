import { createFileRoute } from "@tanstack/react-router";

import { SettingsContainer } from "@/features/settings/containers/SettingsContainer";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsContainer,
});
